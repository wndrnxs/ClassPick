"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Clock3, Loader2, PlayCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { BogiBox, CIRCLED, PassageView } from "@/components/material/sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, api } from "@/lib/api-client";
import type { AnswerSheet, AnswerValue, PublicQuestion, PublicSnapshot } from "@/lib/assessment";
import { cn } from "@/lib/utils";

type Draft = { answers: AnswerSheet; startedAt: number };

// 풀던 답안은 이 기기(localStorage)에만 임시 저장합니다. 저장소를 쓸 수 없는 환경에서도 시험은 그대로 진행됩니다.
function readDraft(key: string): Draft | null {
  try {
    const d = JSON.parse(window.localStorage.getItem(key) ?? "null") as Draft | null;
    return d && typeof d.startedAt === "number" && d.answers && typeof d.answers === "object" ? d : null;
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

const MAX_DURATION_SEC = 60 * 60 * 6;
const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

export function ExamTaker({
  assignmentId,
  title,
  className,
  revealAnswers,
  exam,
}: {
  assignmentId: string;
  title: string;
  className: string;
  revealAnswers: boolean;
  exam: PublicSnapshot;
}) {
  const router = useRouter();
  const key = `classpick:exam:${assignmentId}`;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [answers, setAnswers] = useState<AnswerSheet>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (startedAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const total = exam.questions.length;
  const unanswered = exam.questions.filter((q) => answers[q.id] === undefined);
  const answered = total - unanswered.length;
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const mcqCount = exam.questions.filter((q) => q.kind === "mcq").length;

  function start() {
    const draft = readDraft(key);
    const at = draft?.startedAt ?? Date.now();
    const restored = draft?.answers ?? {};
    if (Object.keys(restored).length) toast.info("이 기기에 임시 저장된 답안을 불러왔어요.");
    setAnswers(restored);
    setStartedAt(at);
    setNow(Date.now());
    writeDraft(key, { answers: restored, startedAt: at });
    window.scrollTo({ top: 0 });
  }

  function choose(id: string, value: AnswerValue) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    if (startedAt !== null) writeDraft(key, { answers: next, startedAt });
  }

  function jumpTo(id: string) {
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function submit() {
    startTransition(async () => {
      try {
        const durationSec = startedAt === null ? null : Math.min(MAX_DURATION_SEC, Math.round((Date.now() - startedAt) / 1000));
        const res = await api<{ result: { score: number; correctCount: number; total: number } }>(`/api/assignments/${assignmentId}/submit`, {
          method: "POST",
          json: { answers, durationSec },
        });
        clearDraft(key);
        setConfirmOpen(false);
        toast.success(`제출 완료! ${res.result.total}문항 중 ${res.result.correctCount}문항을 맞혔어요.`);
        window.scrollTo({ top: 0 });
        router.refresh();
      } catch (err) {
        toast.error((err as Error).message);
        // 이미 제출했거나 마감된 시험 → 최신 상태(결과/마감 화면)로 갱신
        if (err instanceof ApiError && err.status === 409) {
          clearDraft(key);
          setConfirmOpen(false);
          router.refresh();
        }
      }
    });
  }

  if (startedAt === null) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 sm:p-8">
        <Badge variant="soft">{className}</Badge>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h1>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["지문", `${exam.sections.length}개`],
            ["5지선다", `${mcqCount}문항`],
            ["OX", `${total - mcqCount}문항`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface px-2 py-3">
              <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-5 space-y-2 text-sm leading-relaxed text-slate-600">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              답안은 <b className="text-slate-900">한 번만</b> 제출할 수 있어요. 제출한 뒤에는 고칠 수 없어요.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              제출하면 바로 자동 채점돼요.{" "}
              {revealAnswers ? "정답과 해설도 함께 확인할 수 있어요." : "이 시험은 선생님이 정답을 공개하지 않아 문항별 정오만 확인할 수 있어요."}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>풀던 답안은 이 기기에 임시 저장돼요. 창을 닫아도 다시 들어와 이어서 풀 수 있어요.</span>
          </li>
        </ul>
        <Button size="lg" className="mt-6 w-full" onClick={start}>
          <PlayCircle /> 시험 시작하기
        </Button>
      </div>
    );
  }

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
                    <QuestionCard q={q} value={answers[q.id]} onChoose={(v) => choose(q.id, v)} />
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
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
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
          <span className="hidden shrink-0 items-center gap-1 text-sm text-muted-foreground tabular-nums sm:flex" aria-label="경과 시간">
            <Clock3 className="size-4" /> {mmss(elapsed)}
          </span>
          <Button className="shrink-0" onClick={() => setConfirmOpen(true)} disabled={pending}>
            <Send /> 제출
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
            경과 시간 <span className="font-semibold text-slate-700 tabular-nums">{mmss(elapsed)}</span> · 답한 문항{" "}
            <span className="font-semibold text-slate-700 tabular-nums">
              {answered}/{total}
            </span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              계속 풀기
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />} 제출하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const choiceClass = (checked: boolean) =>
  cn(
    "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-[15px] leading-relaxed transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
    checked ? "border-primary bg-secondary/70 font-semibold text-primary-deep" : "border-transparent hover:bg-muted",
  );

function QuestionCard({ q, value, onChoose }: { q: PublicQuestion; value: AnswerValue | undefined; onChoose: (v: AnswerValue) => void }) {
  return (
    <div id={`q-${q.id}`} className="scroll-mt-24 rounded-2xl border bg-white p-5">
      <fieldset>
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
                    <input type="radio" name={q.id} value={v} checked={value === v} onChange={() => onChoose(v)} className="sr-only" />
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
                <input type="radio" name={q.id} value={v ? "O" : "X"} checked={value === v} onChange={() => onChoose(v)} className="sr-only" />
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
