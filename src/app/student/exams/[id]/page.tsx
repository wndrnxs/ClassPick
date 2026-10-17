import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, EyeOff, Lock, Target } from "lucide-react";

import { PassageView } from "@/components/material/sections";
import { ExamTaker } from "@/components/student/exam-taker";
import { QuestionReview } from "@/components/student/question-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";
import { requireStudent } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getStudentAssignment, type StudentAssignmentView } from "@/server/services/classroom";

export const metadata: Metadata = { title: "시험" };

const formatDuration = (sec: number | null) => (sec == null ? "-" : `${Math.floor(sec / 60)}분 ${sec % 60}초`);

function BackLink() {
  return (
    <Link href="/student" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> 내 시험
    </Link>
  );
}

function ExamResult({ view }: { view: Extract<StudentAssignmentView, { state: "done" }> }) {
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
              {formatDateTime(result.submittedAt)} 제출 · 소요 시간 {formatDuration(result.durationSec)}
            </p>
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

      {!view.revealAnswers && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm text-muted-foreground">
          <EyeOff className="size-4 shrink-0" /> 선생님이 이 시험의 정답과 해설을 공개하지 않았어요. 문항별로 맞았는지만 확인할 수 있어요.
        </p>
      )}

      <div className="mt-8 space-y-10">
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

  if (view.state === "done") return <ExamResult view={view} />;

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
      <ExamTaker assignmentId={view.id} title={view.title} className={view.className} revealAnswers={view.revealAnswers} exam={view.exam} />
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
