"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { AlertTriangle, Clock3, Loader2, PlayCircle, Send, Timer } from "lucide-react";
import { toast } from "sonner";

import { BogiBox, CIRCLED, PassageView } from "@/components/material/sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, api } from "@/lib/api-client";
import type { AnswerSheet, AnswerValue, PublicQuestion, PublicSnapshot } from "@/lib/assessment";
import { cn, formatClock } from "@/lib/utils";

/** 문항별 누적 풀이 시간(ms) */
type TimingMs = Record<string, number>;
type Draft = { answers: AnswerSheet; timings: TimingMs };

// 풀던 답안·풀이 시간은 이 기기(localStorage)에만 임시 저장합니다. 저장소를 쓸 수 없는 환경에서도 시험은 그대로 진행됩니다.
function readDraft(key: string): Draft | null {
  try {
    const d = JSON.parse(window.localStorage.getItem(key) ?? "null") as Partial<Draft> | null;
    if (!d || typeof d.answers !== "object" || d.answers === null) return null;
    return { answers: d.answers, timings: d.timings && typeof d.timings === "object" ? d.timings : {} };
  } catch {
    return null;
  }
}
function writeDraft(key: string, draft: Draft) {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {}
}
function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

/** 남은 시간 알림 시점(초) */
const WARN_AT = [300, 60];

type Clock = { base: number; deadline: number | null };

export function ExamTaker({
  assignmentId,
  title,
  className,
  revealAnswers,
  timeLimitMin,
  started,
  exam,
}: {
  assignmentId: string;
  title: string;
  className: string;
  revealAnswers: boolean;
  timeLimitMin: number | null;
  /** 이미 시작한 시험인지 (서버 기록) */
  started: boolean;
  exam: PublicSnapshot;
}) {
  const router = useRouter();
  const key = `classpick:exam:${assignmentId}`;
  const [clock, setClock] = useState<Clock | null>(null);
  const [now, setNow] = useState(0);
  const [answers, setAnswers] = useState<AnswerSheet>({});
  const [starting, setStarting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // 렌더링과 무관한 측정값은 ref에 둡니다.
  const answersRef = useRef<AnswerSheet>({});
  const timingsRef = useRef<TimingMs>({});
  const lastMarkRef = useRef(0);
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const warnedRef = useRef(new Set<number>());

  const total = exam.questions.length;
  const unanswered = exam.questions.filter((q) => answers[q.id] === undefined);
  const answered = total - unanswered.length;
  const mcqCount = exam.questions.filter((q) => q.kind === "mcq").length;
  const elapsed = clock ? Math.max(0, Math.floor((now - clock.base) / 1000)) : 0;
  const remaining = clock?.deadline != null ? Math.max(0, Math.ceil((clock.deadline - now) / 1000)) : null;

  function submit(auto = false) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    startTransition(async () => {
      try {
        const timings = Object.fromEntries(Object.entries(timingsRef.current).map(([id, ms]) => [id, Math.round(ms / 1000)]));
        const res = await api<{ result: { correctCount: number; total: number } }>(`/api/assignments/${assignmentId}/submit`, {
          method: "POST",
          json: { answers: answersRef.current, timings, durationSec: clock ? elapsed : null },
        });
        clearDraft(key);
        setConfirmOpen(false);
        const summary = `${res.result.total}문항 중 ${res.result.correctCount}문항을 맞혔어요.`;
        if (auto) toast.info(`시간이 끝나 자동으로 제출했어요. ${summary}`);
        else toast.success(`제출 완료! ${summary}`);
        window.scrollTo({ top: 0 });
        router.refresh();
      } catch (err) {
        submittingRef.current = false;
        toast.error(auto ? `자동 제출에 실패했어요. 제출 버튼을 눌러 주세요. (${(err as Error).message})` : (err as Error).message);
        // 이미 제출했거나 마감된 시험 → 최신 상태(결과/마감 화면)로 갱신
        if (err instanceof ApiError && err.status === 409) {
          clearDraft(key);
          setConfirmOpen(false);
          router.refresh();
        }
      }
    });
  }

  const onTick = useEffectEvent(() => {
    const t = Date.now();
    setNow(t);
    if (clock?.deadline == null) return;
    const left = Math.ceil((clock.deadline - t) / 1000);
    for (const at of WARN_AT) {
      if (left <= at && left > 0 && !warnedRef.current.has(at) && (timeLimitMin ?? 0) * 60 > at) {
        warnedRef.current.add(at);
        toast.warning(`남은 시간 ${at / 60}분! 시간이 다 되면 자동으로 제출돼요.`);
      }
    }
    if (left <= 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      setConfirmOpen(false);
      submit(true);
    }
  });

  useEffect(() => {
    if (!clock) return;
    const timer = window.setInterval(() => onTick(), 1000);
    // 응시 중 실수로 창을 닫지 않도록 확인 (답안은 임시 저장되고, 제한 시간은 계속 흐름)
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittingRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [clock]);

  /** t: 시작 버튼을 누른 시각(epoch ms) */
  async function start(t: number) {
    setStarting(true);
    try {
      // 시작 시각은 서버가 기록합니다. 새로고침·다른 기기에서 다시 들어와도 시간이 이어집니다.
      const res = await api<{ elapsedSec: number; remainingSec: number | null }>(`/api/assignments/${assignmentId}/start`, { method: "POST" });
      const draft = readDraft(key);
      answersRef.current = draft?.answers ?? {};
      timingsRef.current = draft?.timings ?? {};
      lastMarkRef.current = t;
      setAnswers(answersRef.current);
      setNow(t);
      setClock({ base: t - res.elapsedSec * 1000, deadline: res.remainingSec == null ? null : t + res.remainingSec * 1000 });
      if (Object.keys(answersRef.current).length) toast.info("이 기기에 임시 저장된 답안을 불러왔어요.");
      window.scrollTo({ top: 0 });
      if (res.remainingSec === 0) {
        autoSubmittedRef.current = true;
        submit(true);
      }
    } catch (err) {
      toast.error((err as Error).message);
      if (err instanceof ApiError && err.status === 409) router.refresh();
    } finally {
      setStarting(false);
    }
  }

  /**
   * 문항별 풀이 시간: 직전 응답(또는 시작) 이후 이 문항에 답하기까지 걸린 시간을 이 문항에 더합니다.
   * t는 응답 이벤트가 발생한 시각(epoch ms)입니다.
   */
  function choose(id: string, value: AnswerValue, t: number) {
    timingsRef.current = { ...timingsRef.current, [id]: (timingsRef.current[id] ?? 0) + Math.max(0, t - lastMarkRef.current) };
    lastMarkRef.current = t;
    answersRef.current = { ...answersRef.current, [id]: value };
    setAnswers(answersRef.current);
    writeDraft(key, { answers: answersRef.current, timings: timingsRef.current });
  }

  function jumpTo(id: string) {
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (clock === null) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 sm:p-8">
        <Badge variant="soft">{className}</Badge>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h1>
        <dl className="mt-5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[
            ["지문", `${exam.sections.length}개`],
            ["5지선다", `${mcqCount}문항`],
            ["OX", `${total - mcqCount}문항`],
            ["제한 시간", timeLimitMin ? `${timeLimitMin}분` : "없음"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface px-2 py-3">
              <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-5 space-y-2 text-sm leading-relaxed text-slate-600">
          {timeLimitMin && (
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <b className="text-slate-900">제한 시간 {timeLimitMin}분</b> — 시작 버튼을 누른 순간부터 시간이 흐르고, 창을 닫아도 멈추지 않아요. 시간이
                다 되면 그때까지 고른 답으로 자동 제출돼요.
              </span>
            </li>
          )}
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              <b className="text-slate-900">문항별 풀이 시간</b>이 기록돼요. 직전 문항에 답한 뒤 다음 답을 고르기까지 걸린 시간이고, 지문을 읽는 시간은 그
              지문의 첫 문항에 포함돼요.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              답안은 <b className="text-slate-900">한 번만</b> 제출할 수 있어요.{" "}
              {revealAnswers ? "제출하면 바로 채점되고 정답과 해설도 볼 수 있어요." : "제출하면 바로 채점되지만, 이 시험은 정답이 공개되지 않아 문항별 정오만 볼 수 있어요."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>풀던 답안은 이 기기에 임시 저장돼요. 창을 닫아도 다시 들어와 이어서 풀 수 있어요.</span>
          </li>
        </ul>
        {started && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-soft px-3.5 py-2.5 text-sm font-semibold text-amber-800">
            이미 시작한 시험이에요.{timeLimitMin ? " 제한 시간은 계속 흐르고 있어요." : ""}
          </p>
        )}
        <Button size="lg" className="mt-6 w-full" onClick={(e) => start(eventTime(e))} disabled={starting}>
          {starting ? <Loader2 className="animate-spin" /> : <PlayCircle />} {started ? "이어서 풀기" : "시험 시작하기"}
        </Button>
      </div>
    );
  }

  const urgent = remaining !== null && remaining <= 60;
  const warning = remaining !== null && remaining <= 300;

  return (
    <div className="pb-32">
      <div className="mb-6">
        <Badge variant="soft">{className}</Badge>
        <h1 className="mt-1.5 text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
      </div>

      <div className="space-y-12">
        {exam.sections.map((section, si) => {
          const qs = exam.questions.filter((q) => q.sectionIndex === si);
          if (!qs.length) return null;
          return (
            <section key={si} className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <div className="lg:sticky lg:top-20">
                <p className="mb-2 text-sm font-bold text-slate-600">
                  [{qs[0].number}~{qs[qs.length - 1].number}] 다음 글을 읽고 물음에 답하시오.
                </p>
                <PassageView
                  title={section.title}
                  author={section.author}
                  text={section.text}
                  className="lg:max-h-[calc(100vh-13rem)] lg:overflow-y-auto"
                />
              </div>
              <ol className="space-y-4">
                {qs.map((q) => (
                  <li key={q.id}>
                    <QuestionCard q={q} value={answers[q.id]} onChoose={(v, t) => choose(q.id, v, t)} disabled={pending} />
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="glass fixed inset-x-0 bottom-0 z-30 border-t">
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6">
          <div className="shrink-0 leading-tight">
            <span className="block text-[11px] font-semibold text-muted-foreground">답한 문항</span>
            <span className="font-extrabold tabular-nums">
              {answered}
              <span className="text-muted-foreground">/{total}</span>
            </span>
          </div>
          <nav aria-label="문항 바로가기" className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-1">
            {exam.questions.map((q) => {
              const done = answers[q.id] !== undefined;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => jumpTo(q.id)}
                  aria-label={`${q.number}번 문항으로 이동 (${done ? "답함" : "아직 안 풂"})`}
                  className={cn(
                    "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold tabular-nums transition",
                    done ? "border-primary bg-primary text-white" : "bg-white text-slate-500 hover:border-primary/50",
                  )}
                >
                  {q.number}
                </button>
              );
            })}
          </nav>
          <div
            className={cn(
              "shrink-0 rounded-lg px-2 py-1 text-right leading-tight",
              urgent ? "bg-red-50 text-red-700" : warning ? "bg-amber-soft text-amber-800" : "text-slate-700",
            )}
            role="timer"
            aria-live={urgent ? "assertive" : "off"}
          >
            <span className="flex items-center justify-end gap-1 text-[11px] font-semibold opacity-80">
              {remaining !== null ? <Timer className="size-3" /> : <Clock3 className="size-3" />}
              {remaining !== null ? "남은 시간" : "경과 시간"}
            </span>
            <span className={cn("font-extrabold tabular-nums", urgent && "animate-pulse")}>{formatClock(remaining ?? elapsed)}</span>
          </div>
          <Button className="shrink-0" onClick={() => setConfirmOpen(true)} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} 제출
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{unanswered.length ? "아직 풀지 않은 문항이 있어요" : "답안을 제출할까요?"}</DialogTitle>
            <DialogDescription>제출하면 답안을 고칠 수 없고, 바로 채점 결과가 나와요.</DialogDescription>
          </DialogHeader>
          {unanswered.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-soft p-3.5 text-sm">
              <p className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="size-4" /> 안 푼 문항 {unanswered.length}개 · 오답으로 처리돼요
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {unanswered.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      window.setTimeout(() => jumpTo(q.id), 150);
                    }}
                    className="cursor-pointer rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-bold text-amber-800 hover:bg-amber-50"
                  >
                    {q.number}번
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            경과 시간 <span className="font-semibold text-slate-700 tabular-nums">{formatClock(elapsed)}</span>
            {remaining !== null && (
              <>
                {" "}
                · 남은 시간 <span className="font-semibold text-slate-700 tabular-nums">{formatClock(remaining)}</span>
              </>
            )}{" "}
            · 답한 문항{" "}
            <span className="font-semibold text-slate-700 tabular-nums">
              {answered}/{total}
            </span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              계속 풀기
            </Button>
            <Button onClick={() => submit()} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />} 제출하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** 입력 이벤트 발생 시각(epoch ms) */
const eventTime = (e: React.SyntheticEvent) => Math.round(performance.timeOrigin + e.timeStamp);

const choiceClass = (checked: boolean) =>
  cn(
    "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-[15px] leading-relaxed transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40 has-[:disabled]:cursor-not-allowed",
    checked ? "border-primary bg-secondary/70 font-semibold text-primary-deep" : "border-transparent hover:bg-muted",
  );

function QuestionCard({
  q,
  value,
  onChoose,
  disabled,
}: {
  q: PublicQuestion;
  value: AnswerValue | undefined;
  onChoose: (v: AnswerValue, at: number) => void;
  disabled: boolean;
}) {
  return (
    <div id={`q-${q.id}`} className="scroll-mt-24 rounded-2xl border bg-white p-5">
      <fieldset disabled={disabled}>
        <legend className="font-bold leading-relaxed text-slate-900">
          <span className="mr-1.5 text-primary tabular-nums">{q.number}.</span>
          {q.kind === "ox" && <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-xs text-slate-600">OX</span>}
          {q.stem}
        </legend>
        {q.kind === "mcq" ? (
          <>
            {q.bogi && <BogiBox text={q.bogi} />}
            <div className="mt-3 space-y-1">
              {q.options.map((opt, j) => {
                const v = j + 1;
                return (
                  <label key={j} className={choiceClass(value === v)}>
                    <input type="radio" name={q.id} value={v} checked={value === v} onChange={(e) => onChoose(v, eventTime(e))} className="sr-only" />
                    <span className="shrink-0">{CIRCLED[j]}</span>
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[true, false].map((v) => (
              <label key={String(v)} className={cn(choiceClass(value === v), "justify-center py-3", value !== v && "border-slate-200")}>
                <input type="radio" name={q.id} value={v ? "O" : "X"} checked={value === v} onChange={(e) => onChoose(v, eventTime(e))} className="sr-only" />
                <span className="text-xl font-black">{v ? "O" : "X"}</span>
                <span className="self-center text-xs text-muted-foreground">{v ? "맞다" : "틀리다"}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}
