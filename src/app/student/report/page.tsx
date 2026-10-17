import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpenCheck, ChevronRight, Hourglass, Sparkles, Target, Timer, TrendingUp, Zap } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { BarList, ColumnChart, StatTile } from "@/components/classroom/charts";
import { QuestionReview } from "@/components/student/question-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SKILL_TIPS, SUNEUNG_PACE_SEC, type Rate } from "@/lib/assessment";
import { formatClock, formatDuration } from "@/lib/utils";
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

const PACE_FLAG = { slow: "오래 고민했지만 틀림", fast: "빨리 풀다 틀림" } as const;

function TimeManagement({ r }: { r: Awaited<ReturnType<typeof getStudentReport>> }) {
  const t = r.timing;
  if (!t.timedCount) return null;
  const paceHint =
    t.paceDiffSec == null
      ? undefined
      : Math.abs(t.paceDiffSec) < 5
        ? "수능 페이스와 비슷해요"
        : `수능 페이스(${formatClock(SUNEUNG_PACE_SEC)})보다 ${Math.abs(t.paceDiffSec)}초 ${t.paceDiffSec > 0 ? "느려요" : "빨라요"}`;
  const maxSkill = Math.max(SUNEUNG_PACE_SEC, ...t.bySkill.map((s) => s.avgSec ?? 0));
  const timedTrend = r.trend.filter((x) => x.durationSec != null);
  return (
    <section className="rounded-2xl border bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        <Timer className="size-5 text-primary" /> 시간 관리
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        수능 국어는 80분 동안 45문항, 5지선다 한 문항에 평균 약 {formatDuration(SUNEUNG_PACE_SEC)}이에요. 지문 읽는 시간은 그 지문의 첫 문항에 포함돼요.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="5지선다 문항당 평균" value={t.avgMcqSec == null ? "-" : formatClock(t.avgMcqSec)} hint={paceHint} />
        <StatTile label="OX 문항당 평균" value={t.avgOxSec == null ? "-" : formatClock(t.avgOxSec)} />
        <StatTile label="오래 고민했지만 틀림" value={t.slowWrong} unit="문항" hint="평소보다 1.5배 이상 걸린 오답" />
        <StatTile label="빨리 풀다 틀림" value={t.fastWrong} unit="문항" hint="평소의 절반도 안 걸린 오답" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-bold text-slate-600">영역별 5지선다 평균 풀이 시간</h3>
          <BarList
            max={maxSkill}
            rows={t.bySkill.map((s) => ({
              label: s.label,
              value: s.avgSec ?? 0,
              display: formatClock(s.avgSec ?? 0),
              sub: `정답률 ${s.rate}%`,
              emphasis: (s.avgSec ?? 0) > SUNEUNG_PACE_SEC ? ("warn" as const) : undefined,
              tag: "느림",
            }))}
            empty="5지선다 풀이 기록이 아직 없어요."
          />
          <p className="mt-2 text-xs text-muted-foreground">주황색은 수능 페이스보다 오래 걸린 영역이에요.</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-slate-600">시험별 응시 시간</h3>
          {timedTrend.length ? (
            <ul className="space-y-2">
              {timedTrend.map((x, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-semibold" title={x.title}>
                    {x.title}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <b>{formatDuration(x.durationSec)}</b>
                    <span className="ml-1.5 text-xs text-muted-foreground">{x.score}점</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">기록이 없어요.</p>
          )}
        </div>
      </div>

      {(t.slowWrong > 0 || t.fastWrong > 0 || (t.paceDiffSec ?? 0) > 15) && (
        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {t.slowWrong > 0 && (
            <li className="flex gap-3 rounded-xl border border-amber-200 bg-amber-soft/60 p-4 text-sm leading-relaxed text-slate-700">
              <Hourglass className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <span>
                <b className="text-slate-900">오래 고민하고도 틀린 문항 {t.slowWrong}개</b> — 시간을 많이 써도 답이 흔들렸다면 개념이나 지문 이해가 불확실하다는
                신호예요. 아래 오답 노트에서 해설을 먼저 확인하세요.
              </span>
            </li>
          )}
          {t.fastWrong > 0 && (
            <li className="flex gap-3 rounded-xl border border-amber-200 bg-amber-soft/60 p-4 text-sm leading-relaxed text-slate-700">
              <Zap className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <span>
                <b className="text-slate-900">빨리 풀다 틀린 문항 {t.fastWrong}개</b> — 선지를 끝까지 읽지 않고 고른 실수일 수 있어요. 발문의 &lsquo;적절하지
                않은&rsquo;과 선지의 범위 표현(항상·모두·오직)을 한 번 더 확인하세요.
              </span>
            </li>
          )}
          {(t.paceDiffSec ?? 0) > 15 && (
            <li className="flex gap-3 rounded-xl border bg-surface p-4 text-sm leading-relaxed text-slate-700">
              <Timer className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <b className="text-slate-900">5지선다 풀이가 수능 페이스보다 평균 {t.paceDiffSec}초 느려요.</b> 지문을 읽을 때 문단마다 핵심어에 표시해 두면, 문제를
                풀 때 다시 찾아 읽는 시간을 줄일 수 있어요.
              </span>
            </li>
          )}
        </ul>
      )}
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

      <TimeManagement r={r} />

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
                  <QuestionReview
                    key={n.question.id}
                    q={n.question}
                    myAnswer={n.myAnswer}
                    correct={false}
                    reveal={n.revealAnswers}
                    timeSec={n.timeSec}
                    timeFlag={n.pace ? PACE_FLAG[n.pace] : null}
                  />
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
