import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, ChevronRight, FileQuestion, Lock, School, Target, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { StatTile } from "@/components/classroom/charts";
import { JoinClassForm } from "@/components/student/join-class-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatClock, formatDate, formatDuration } from "@/lib/utils";
import { requireStudent } from "@/server/auth/dal";
import { listStudentAssignments, listStudentClasses } from "@/server/services/classroom";

export const metadata: Metadata = { title: "내 시험" };

async function Greeting() {
  const user = await requireStudent();
  return <>안녕하세요, {user.name}님</>;
}

type StudentAssignment = Awaited<ReturnType<typeof listStudentAssignments>>[number];

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-primary";
  return "text-amber-700";
}

function TodoCard({ a }: { a: StudentAssignment }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="soft">{a.className}</Badge>
          {a.inProgress && (
            <Badge variant="amber">
              응시 중{a.inProgress.remainingSec != null ? ` · 남은 시간 ${formatClock(a.inProgress.remainingSec)}` : ""}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)} 배포</span>
        </div>
        <p className="mt-1.5 truncate text-lg font-extrabold" title={a.title}>
          {a.title}
        </p>
        <p className="text-sm text-muted-foreground">
          {a.questionCount}문항 · {a.timeLimitMin ? `제한 시간 ${a.timeLimitMin}분` : "시간 제한 없음"} · 자동 채점
        </p>
      </div>
      <Button asChild className="shrink-0">
        <Link href={`/student/exams/${a.id}`}>
          {a.inProgress ? "이어서 풀기" : "시험 보기"} <ChevronRight />
        </Link>
      </Button>
    </li>
  );
}

async function AssignmentBoard() {
  const user = await requireStudent();
  const list = await listStudentAssignments(user.id);
  const todo = list.filter((a) => !a.submission && a.status === "open");
  const done = list.filter((a) => a.submission);
  const missed = list.filter((a) => !a.submission && a.status !== "open");
  const avg = done.length ? Math.round((done.reduce((s, a) => s + a.submission!.score, 0) / done.length) * 10) / 10 : null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="풀어야 할 시험" value={todo.length} unit="개" />
        <StatTile label="완료한 시험" value={done.length} unit="개" />
        <StatTile label="평균 점수" value={avg ?? "-"} unit={avg === null ? undefined : "점"} />
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
          <FileQuestion className="size-5 text-primary" /> 풀어야 할 시험
        </h2>
        {todo.length ? (
          <ul className="grid grid-cols-1 gap-3">
            {todo.map((a) => (
              <TodoCard key={a.id} a={a} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed bg-white px-6 py-10 text-center text-sm text-muted-foreground">
            {list.length ? "새로 받은 시험이 없어요. 모두 풀었어요!" : "아직 받은 시험이 없어요. 반에 참여하면 선생님이 배포한 시험이 이곳에 나타나요."}
          </p>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <CheckCircle2 className="size-5 text-emerald-600" /> 완료한 시험
            </h2>
            <Link href="/student/report" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <Target className="size-4" /> 약점 분석 보기
            </Link>
          </div>
          <ul className="divide-y rounded-2xl border bg-white">
            {done.map((a) => (
              <li key={a.id}>
                <Link href={`/student/exams/${a.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold" title={a.title}>
                      {a.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.className} · {formatDate(a.submission!.submittedAt)} 제출 · {a.submission!.correctCount}/{a.submission!.total} 정답
                      {a.submission!.durationSec != null && ` · ${formatDuration(a.submission!.durationSec)}`}
                    </p>
                  </div>
                  <span className={`text-2xl font-black tabular-nums ${scoreTone(a.submission!.score)}`}>
                    {a.submission!.score}
                    <span className="ml-0.5 text-sm font-semibold text-muted-foreground">점</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {missed.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-slate-500">
            <Lock className="size-5" /> 마감된 시험
          </h2>
          <ul className="divide-y rounded-2xl border bg-white">
            {missed.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-500">{a.title}</span>
                <Badge variant="muted">미응시 · 마감</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

async function MyClasses() {
  const user = await requireStudent();
  const classes = await listStudentClasses(user.id);
  if (!classes.length) return <p className="text-sm text-muted-foreground">아직 참여한 반이 없어요.</p>;
  return (
    <ul className="space-y-2">
      {classes.map((c) => (
        <li key={c.id} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5">
          <School className="size-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{c.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{c.teacherName} 선생님</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function StudentHomePage() {
  return (
    <>
      <PageHeader
        eyebrow="My Exams"
        title={
          <Suspense fallback="내 시험">
            <Greeting />
          </Suspense>
        }
        description="선생님이 배포한 시험을 풀고, 내가 약한 부분을 확인해 보세요."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Suspense
          fallback={
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          }
        >
          <AssignmentBoard />
        </Suspense>
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-5">
            <p className="font-extrabold">반 참여하기</p>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">선생님께 받은 6자리 참여 코드를 입력하세요.</p>
            <JoinClassForm />
          </div>
          <div className="rounded-2xl border bg-white p-5">
            <p className="mb-3 flex items-center gap-1.5 font-extrabold">
              <Users className="size-4 text-primary" /> 내 반
            </p>
            <Suspense fallback={<Skeleton className="h-14 rounded-xl" />}>
              <MyClasses />
            </Suspense>
          </div>
        </aside>
      </div>
    </>
  );
}
