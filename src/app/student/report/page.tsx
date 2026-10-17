import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpenCheck, ChevronRight, Sparkles, Target, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { BarList, ColumnChart, StatTile } from "@/components/classroom/charts";
import { QuestionReview } from "@/components/student/question-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SKILL_TIPS, type Rate } from "@/lib/assessment";
import { requireStudent } from "@/server/auth/dal";
import { getStudentReport } from "@/server/services/classroom";

export const metadata: Metadata = { title: "약점 분석" };

const shortDate = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" });

const rateRows = (rows: Rate[], opts: { weak?: Set<string>; strong?: Set<string>; prefix?: string } = {}) =>
  rows.map((r) => ({
    label: `${opts.prefix ?? ""}${r.label}`,
    value: r.rate,
    sub: `(${r.correct}/${r.total})`,
    emphasis: opts.weak?.has(r.label) ? ("warn" as const) : opts.strong?.has(r.label) ? ("good" as const) : undefined,
  }));

function Panel({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-white p-5 ${className ?? ""}`}>
      <h2 className="mb-4 flex items-center gap-2 font-extrabold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

async function Report() {
  const user = await requireStudent();
  const r = await getStudentReport(user.id);

  if (r.attempts === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
        <Target className="size-10 text-slate-300" />
        <p className="mt-3 font-bold">아직 분석할 시험 결과가 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">받은 시험을 풀고 제출하면, 영역·난이도·갈래별로 내 약점을 분석해 드려요.</p>
        <Button asChild className="mt-5">
          <Link href="/student">
            받은 시험 보러 가기 <ChevronRight />
          </Link>
        </Button>
      </div>
    );
  }

  const weak = new Set(r.weaknesses.map((w) => w.label));
  const strong = new Set(r.strengths.map((s) => s.label));
  const totalQuestions = r.bySkill.reduce((n, s) => n + s.total, 0);
  const first = r.trend[0]?.score ?? 0;
  const last = r.trend[r.trend.length - 1]?.score ?? 0;
  const delta = Math.round((last - first) * 10) / 10;

  // 오답 노트: 시험별로 묶어서 최근 시험부터
  const notesByExam = new Map<string, { title: string; notes: typeof r.wrongNotes }>();
  for (const n of r.wrongNotes) {
    const g = notesByExam.get(n.assignmentId) ?? { title: n.assignmentTitle, notes: [] };
    g.notes.push(n);
    notesByExam.set(n.assignmentId, g);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="응시한 시험" value={r.attempts} unit="개" hint={`총 ${totalQuestions}문항`} />
        <StatTile label="평균 점수" value={r.averageScore} unit="점" />
        <StatTile label="전체 정답률" value={r.overallRate} unit="%" />
        <StatTile
          label="최근 변화"
          value={r.trend.length > 1 ? `${delta > 0 ? "+" : ""}${delta}` : "-"}
          unit={r.trend.length > 1 ? "점" : undefined}
          hint={r.trend.length > 1 ? "첫 시험 대비 최근 시험" : "시험을 2개 이상 풀면 보여요"}
        />
      </div>

      <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-soft to-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Target className="size-5 text-amber-600" /> 집중 보완이 필요한 영역
        </h2>
        {r.weaknesses.length ? (
          <ol className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {r.weaknesses.map((w, i) => (
              <li key={w.label} className="flex flex-col rounded-xl border border-amber-200 bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-amber-700">약점 {i + 1}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {w.correct}/{w.total} 정답
                  </span>
                </div>
                <p className="mt-1 font-extrabold">{w.label}</p>
                <p className="text-3xl font-black text-amber-700 tabular-nums">
                  {w.rate}
                  <span className="ml-0.5 text-sm font-semibold text-muted-foreground">%</span>
                </p>
                {w.missed.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {w.missed.map((m) => (
                      <Badge key={m} variant="amber">
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{SKILL_TIPS[w.skill]}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-slate-600">정답률 70% 미만인 영역이 없어요. 지금처럼 꾸준히 풀어 보세요!</p>
        )}
        {r.strengths.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
            <Sparkles className="size-4 text-emerald-600" /> 강점 영역
            {r.strengths.map((s) => (
              <Badge key={s.label} variant="emerald">
                {s.label} {s.rate}%
              </Badge>
            ))}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="성적 추이" icon={<TrendingUp className="size-5 text-primary" />}>
          <ColumnChart
            data={r.trend.map((t) => ({ label: shortDate.format(new Date(t.submittedAt)), value: t.score, hint: `${t.title} · ${t.score}점` }))}
            max={100}
            unit="점"
          />
        </Panel>
        <Panel title="영역별 정답률">
          <BarList rows={rateRows(r.bySkill, { weak, strong })} />
        </Panel>
        <Panel title="난이도별 정답률">
          <BarList rows={rateRows(r.byDifficulty, { prefix: "난이도 " })} />
        </Panel>
        <Panel title="갈래별 정답률">
          <BarList rows={rateRows(r.byGenre)} />
        </Panel>
      </div>

      <details className="group rounded-2xl border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 font-extrabold [&::-webkit-details-marker]:hidden">
          세부 유형별 정답률
          <span className="text-sm font-semibold text-primary">
            <span className="group-open:hidden">펼치기</span>
            <span className="hidden group-open:inline">접기</span>
          </span>
        </summary>
        <div className="px-5 pb-5">
          <p className="mb-3 text-xs text-muted-foreground">5지선다는 출제 유형, OX는 관련 개념 기준이에요. 정답률이 낮은 순서로 보여 줘요.</p>
          <BarList rows={rateRows(r.byCategory)} />
        </div>
      </details>

      <section>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-extrabold">
          <BookOpenCheck className="size-5 text-primary" /> 오답 노트
          <span className="text-sm font-semibold text-muted-foreground">{r.wrongNotes.length}문항</span>
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">틀린 문항을 다시 확인해 보세요. 정답 공개 시험은 정답과 해설도 함께 볼 수 있어요.</p>
        {r.wrongNotes.length ? (
          <div className="space-y-6">
            {[...notesByExam.entries()].map(([assignmentId, g]) => (
              <div key={assignmentId} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-bold text-slate-700">{g.title}</p>
                  <Link href={`/student/exams/${assignmentId}`} className="shrink-0 text-sm font-semibold text-primary hover:underline">
                    시험 결과 보기
                  </Link>
                </div>
                {g.notes.map((n) => (
                  <QuestionReview key={n.question.id} q={n.question} myAnswer={n.myAnswer} correct={false} reveal={n.revealAnswers} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed bg-white px-6 py-10 text-center text-sm text-muted-foreground">틀린 문항이 없어요. 완벽해요!</p>
        )}
      </section>
    </div>
  );
}

export default function StudentReportPage() {
  return (
    <>
      <PageHeader
        eyebrow="My Report"
        title="내 약점 분석"
        description="지금까지 푼 시험을 모두 모아 영역·난이도·갈래별로 어디가 약한지 분석했어요."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        }
      >
        <Report />
      </Suspense>
    </>
  );
}
