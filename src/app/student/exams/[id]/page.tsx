import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, EyeOff, Lock, MessageCircleQuestion, Target, Timer } from "lucide-react";

import { ColumnChart, StatTile } from "@/components/classroom/charts";
import { PassageView } from "@/components/material/sections";
import { ExamTaker } from "@/components/student/exam-taker";
import { MarkInquiriesRead } from "@/components/student/mark-inquiries-read";
import { QuestionInquiry } from "@/components/student/question-inquiry";
import { QuestionReview } from "@/components/student/question-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SUNEUNG_PACE_SEC } from "@/lib/assessment";
import { cn, formatClock, formatDateTime, formatDuration } from "@/lib/utils";
import { requireStudent } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getStudentAssignment, type StudentAssignmentView } from "@/server/services/classroom";
import { studentInquiriesForAssignment } from "@/server/services/inquiries";

export const metadata: Metadata = { title: "시험" };

type DoneView = Extract<StudentAssignmentView, { state: "done" }>;
type Inquiries = Awaited<ReturnType<typeof studentInquiriesForAssignment>>;

/** 반 평균보다 1.5배 이상(15초 이상 차이) 오래 걸린 문항 */
const isSlow = (mine: number | undefined, avg: number | undefined) => mine != null && avg != null && mine >= avg * 1.5 && mine - avg >= 15;

function TimeAnalysis({ view }: { view: DoneView }) {
  const { result, exam } = view;
  const times = exam.questions.map((q) => result.timings[q.id]).filter((t): t is number => t != null);
  if (!times.length && result.durationSec == null) return null;
  const solving = times.reduce((a, b) => a + b, 0);
  const mcqTimes = exam.questions.filter((q) => q.kind === "mcq" && result.timings[q.id] != null).map((q) => result.timings[q.id]);
  const avgMcq = mcqTimes.length ? Math.round(mcqTimes.reduce((a, b) => a + b, 0) / mcqTimes.length) : null;
  const hasClass = Object.keys(result.classAvgTimes).length > 0;
  const sections = exam.sections
    .map((sec, i) => {
      const qs = exam.questions.filter((q) => q.sectionIndex === i);
      const mine = qs.reduce((t, q) => t + (result.timings[q.id] ?? 0), 0);
      const avg = qs.reduce((t, q) => t + (result.classAvgTimes[q.id] ?? 0), 0);
      return { title: sec.title, count: qs.length, mine, avg };
    })
    .filter((s) => s.count > 0);

  return (
    <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        <Timer className="size-5 text-primary" /> 시간 분석
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        문항별 풀이 시간은 직전 문항에 답한 뒤 이 문항에 답하기까지 걸린 시간이에요. 지문을 읽는 시간은 그 지문의 첫 문항에 포함돼요.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="전체 응시 시간"
          value={result.durationSec == null ? "-" : formatClock(result.durationSec)}
          hint={view.timeLimitMin ? `제한 ${view.timeLimitMin}분${result.overtime ? " · 시간 초과" : ""}` : "제한 시간 없음"}
        />
        <StatTile label="문항 풀이" value={formatClock(solving)} hint={`${times.length}문항 합계`} />
        <StatTile
          label="검토·기타"
          value={result.durationSec == null ? "-" : formatClock(Math.max(0, result.durationSec - solving))}
          hint="마지막 답 이후 제출까지 등"
        />
        <StatTile
          label="5지선다 문항당"
          value={avgMcq == null ? "-" : formatClock(avgMcq)}
          hint={avgMcq == null ? undefined : `수능 페이스 ${formatClock(SUNEUNG_PACE_SEC)} ${avgMcq > SUNEUNG_PACE_SEC ? "보다 느림" : "이내"}`}
        />
      </div>

      {times.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-600">문항별 풀이 시간</h3>
            <ColumnChart
              data={exam.questions.map((q) => {
                const recorded = result.timings[q.id];
                const mine = recorded ?? 0;
                const avg = result.classAvgTimes[q.id];
                return {
                  label: `${q.number}번`,
                  value: mine,
                  display: recorded == null ? "-" : formatClock(mine),
                  marker: avg,
                  emphasis: isSlow(mine, avg) ? ("warn" as const) : undefined,
                  hint: `${q.number}번 · ${result.correctness[q.id] ? "정답" : "오답"} · ${recorded == null ? "기록 없음" : formatDuration(mine)}${avg != null ? ` (반 평균 ${formatDuration(avg)})` : ""}`,
                };
              })}
              markerLabel="반 평균"
            />
            {hasClass && <p className="mt-1 text-xs text-muted-foreground">주황색 막대는 반 평균보다 1.5배 이상 오래 걸린 문항이에요.</p>}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-600">지문(세트)별 소요 시간</h3>
            <ul className="space-y-2">
              {sections.map((sec, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-semibold" title={sec.title}>
                    {sec.title} <span className="font-normal text-muted-foreground">· {sec.count}문항</span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <b>{formatClock(sec.mine)}</b>
                    {hasClass && <span className="ml-1.5 text-xs text-muted-foreground">반 평균 {formatClock(sec.avg)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function BackLink() {
  return (
    <Link href="/student" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> 내 시험
    </Link>
  );
}

function ExamResult({ view, inquiries }: { view: DoneView; inquiries: Inquiries }) {
  const answered = view.exam.questions.filter((q) => inquiries.mine[q.id]?.unread);
  const { result, exam } = view;
  const tone = result.score >= 80 ? "text-emerald-600" : result.score >= 60 ? "text-primary" : "text-amber-600";
  return (
    <>
      <BackLink />
      <section className="rounded-2xl border bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Badge variant="soft">{view.className}</Badge>
            <h1 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">{view.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(result.submittedAt)} 제출 · 응시 시간 {formatDuration(result.durationSec)}
              {view.timeLimitMin ? ` / 제한 ${view.timeLimitMin}분` : ""}
            </p>
            {result.overtime && (
              <Badge variant="amber" className="mt-2">
                제한 시간을 넘겨 제출됨
              </Badge>
            )}
          </div>
          <div className="flex items-end gap-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">내 점수</p>
              <p className={cn("text-5xl font-black tracking-tight tabular-nums", tone)}>
                {result.score}
                <span className="ml-1 text-lg font-bold text-muted-foreground">점</span>
              </p>
            </div>
            <div className="pb-1.5 text-sm text-slate-600">
              <b className="text-slate-900 tabular-nums">{result.correctCount}</b> / {result.total} 정답
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5" aria-label="문항별 정오">
          {exam.questions.map((q) => {
            const ok = result.correctness[q.id];
            return (
              <a
                key={q.id}
                href={`#r-${q.id}`}
                aria-label={`${q.number}번 ${ok ? "정답" : "오답"}`}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border text-sm font-bold tabular-nums transition hover:brightness-95",
                  ok ? "border-emerald-300 bg-emerald-soft text-emerald-800" : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {q.number}
              </a>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/student/report">
              <Target /> 내 약점 분석 보기
            </Link>
          </Button>
        </div>
      </section>

      {answered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-secondary/50 px-4 py-3 text-sm">
          <MessageCircleQuestion className="size-4 shrink-0 text-primary" />
          <b>선생님이 질문에 답했어요.</b>
          {answered.map((q) => (
            <a key={q.id} href={`#r-${q.id}`} className="rounded-md bg-white px-2 py-0.5 font-semibold text-primary hover:underline">
              {q.number}번
            </a>
          ))}
        </div>
      )}
      <MarkInquiriesRead assignmentId={view.id} />

      <TimeAnalysis view={view} />

      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <MessageCircleQuestion className="size-4 shrink-0 text-primary" /> 문항마다 「이 문항 질문하기」로 선생님께 궁금한 점을 물어볼 수 있어요.
      </p>

      {!view.revealAnswers && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
          <EyeOff className="size-4 shrink-0" /> 선생님이 이 시험의 정답과 해설을 공개하지 않았어요. 문항별로 맞았는지만 확인할 수 있어요.
        </p>
      )}

      <div className="mt-4 space-y-10">
        {exam.sections.map((section, si) => {
          const qs = exam.questions.filter((q) => q.sectionIndex === si);
          if (!qs.length) return null;
          return (
            <section key={si} className="space-y-4">
              <details className="group rounded-xl border bg-white">
                <summary className="cursor-pointer list-none px-5 py-3 text-sm font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
                  지문 {si + 1} · {section.title}
                  <span className="ml-2 font-medium text-primary group-open:hidden">지문 다시 보기</span>
                  <span className="ml-2 hidden font-medium text-primary group-open:inline">접기</span>
                </summary>
                <PassageView text={section.text} className="m-3 mt-0" />
              </details>
              {qs.map((q) => (
                <QuestionReview
                  key={q.id}
                  id={`r-${q.id}`}
                  q={q}
                  myAnswer={result.answers[q.id]}
                  correct={result.correctness[q.id] ?? false}
                  reveal={view.revealAnswers}
                  timeSec={result.timings[q.id] ?? null}
                  timeCompare={result.classAvgTimes[q.id] != null ? `반 평균 ${formatClock(result.classAvgTimes[q.id])}` : undefined}
                  timeFlag={isSlow(result.timings[q.id], result.classAvgTimes[q.id]) ? "오래 걸림" : null}
                  footer={
                    <QuestionInquiry
                      assignmentId={view.id}
                      questionId={q.id}
                      questionNumber={q.number}
                      thread={inquiries.mine[q.id] ?? null}
                      shared={inquiries.shared[q.id] ?? []}
                    />
                  }
                />
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

async function StudentExam({ params }: { params: PageProps<"/student/exams/[id]">["params"] }) {
  const user = await requireStudent();
  const { id } = await params;
  let view: StudentAssignmentView;
  try {
    view = await getStudentAssignment(user.id, id);
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  }

  if (view.state === "done") return <ExamResult view={view} inquiries={await studentInquiriesForAssignment(user.id, id)} />;

  if (view.status !== "open") {
    return (
      <>
        <BackLink />
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border bg-white px-6 py-14 text-center">
          <Lock className="size-10 text-slate-300" />
          <p className="mt-3 text-lg font-extrabold">마감된 시험이에요</p>
          <p className="mt-1 text-sm text-muted-foreground">
            「{view.title}」은(는) 선생님이 응시를 마감했어요. 다시 열어 주시면 풀 수 있어요.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackLink />
      <ExamTaker
        assignmentId={view.id}
        title={view.title}
        className={view.className}
        revealAnswers={view.revealAnswers}
        timeLimitMin={view.timeLimitMin}
        started={view.started}
        exam={view.exam}
      />
    </>
  );
}

export default function StudentExamPage({ params }: PageProps<"/student/exams/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      }
    >
      <StudentExam params={params} />
    </Suspense>
  );
}
