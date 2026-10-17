import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, ArrowLeft, FileText, Users } from "lucide-react";

import { AssignmentControls } from "@/components/classroom/assignment-controls";
import { BarList, ColumnChart, StatTile } from "@/components/classroom/charts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuestionStat } from "@/lib/assessment";
import { cn, formatDateTime } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getAssignmentReport } from "@/server/services/classroom";

export const metadata: Metadata = { title: "시험 성적 분석" };

const CIRCLED = ["①", "②", "③", "④", "⑤"];
const answerLabel = (q: QuestionStat["question"]) => (q.kind === "mcq" ? CIRCLED[q.answer - 1] : q.answer ? "O" : "X");
const formatDuration = (sec: number | null) => (sec == null ? "-" : `${Math.floor(sec / 60)}분 ${sec % 60}초`);

/** 가장 많이 고른 오답 (매력적 오답) */
function topDistractor(stat: QuestionStat) {
  const correctIndex = stat.question.kind === "mcq" ? stat.question.answer - 1 : stat.question.answer ? 0 : 1;
  let best = -1;
  stat.choiceCounts.forEach((c, i) => {
    if (i !== correctIndex && c > 0 && (best < 0 || c > stat.choiceCounts[best])) best = i;
  });
  return best < 0 ? null : { index: best, count: stat.choiceCounts[best] };
}

function ChoiceDistribution({ stat }: { stat: QuestionStat }) {
  const q = stat.question;
  const correctIndex = q.kind === "mcq" ? q.answer - 1 : q.answer ? 0 : 1;
  const distractor = topDistractor(stat);
  const labels = q.kind === "mcq" ? CIRCLED.slice(0, q.options.length) : ["O", "X"];
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label, i) => (
        <span
          key={label}
          title={i === correctIndex ? "정답" : distractor?.index === i ? "가장 많이 고른 오답" : undefined}
          className={cn(
            "inline-flex min-w-11 items-center justify-center gap-1 rounded-md border px-1.5 py-0.5 text-xs tabular-nums",
            i === correctIndex
              ? "border-emerald-300 bg-emerald-soft font-bold text-emerald-800"
              : distractor?.index === i
                ? "border-amber-300 bg-amber-soft font-bold text-amber-800"
                : "text-slate-500",
          )}
        >
          {label} {stat.choiceCounts[i]}
        </span>
      ))}
      {stat.blank > 0 && <span className="px-1 text-xs text-muted-foreground">무응답 {stat.blank}</span>}
    </div>
  );
}

async function Report({ params }: { params: PageProps<"/app/assignments/[id]">["params"] }) {
  const user = await requireUser();
  const { id } = await params;
  let report;
  try {
    report = await getAssignmentReport(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const { assignment, classInfo, snapshot, submissions, notSubmitted, analysis } = report;
  const rate = analysis.rosterSize ? Math.round((analysis.submitted / analysis.rosterSize) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border bg-white p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">
              <Users /> {classInfo.name}
            </Badge>
            <Badge variant={assignment.status === "open" ? "emerald" : "muted"}>{assignment.status === "open" ? "응시 중" : "마감"}</Badge>
            <Badge variant="muted">{assignment.revealAnswers ? "제출 후 정답 공개" : "정답 비공개"}</Badge>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(assignment.createdAt)} 배포 · {snapshot.questions.length}문항 (5지선다·OX 자동 채점)
            {assignment.materialId && (
              <>
                {" · "}
                <Link href={`/app/materials/${assignment.materialId}`} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
                  <FileText className="size-3.5" /> 원본 자료
                </Link>
              </>
            )}
          </p>
        </div>
        <AssignmentControls id={assignment.id} status={assignment.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="응시" value={`${analysis.submitted}/${analysis.rosterSize}`} unit="명" hint={`응시율 ${rate}%`} />
        <StatTile label="평균" value={analysis.mean} unit="점" hint={`표준편차 ${analysis.sd}`} />
        <StatTile label="중앙값" value={analysis.median} unit="점" />
        <StatTile label="최고" value={analysis.max} unit="점" />
        <StatTile label="최저" value={analysis.min} unit="점" />
      </div>

      {analysis.submitted === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
          아직 제출한 학생이 없어요. 학생이 제출하면 이곳에 분석 결과가 표시됩니다.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="mb-4 font-extrabold">점수 분포</h2>
              <ColumnChart data={analysis.buckets.map((b) => ({ label: `${b.label}점`, value: b.count, hint: `${b.label}점 · ${b.count}명` }))} unit="명" />
            </section>
            <section className="space-y-5 rounded-2xl border bg-white p-5">
              <div>
                <h2 className="mb-3 font-extrabold">영역별 정답률</h2>
                <BarList
                  rows={analysis.bySkill.map((r) => ({
                    label: r.label,
                    value: r.rate,
                    sub: `(${r.correct}/${r.total})`,
                    emphasis: r.rate < 60 ? "warn" : undefined,
                  }))}
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-600">난이도별 정답률</h3>
                <BarList rows={analysis.byDifficulty.map((r) => ({ label: `난이도 ${r.label}`, value: r.rate, sub: `(${r.correct}/${r.total})` }))} />
              </div>
            </section>
          </div>

          {analysis.hardest.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-soft/50 p-5">
              <h2 className="mb-3 flex items-center gap-1.5 font-extrabold text-amber-900">
                <AlertTriangle className="size-4" /> 정답률이 가장 낮은 문항
              </h2>
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {analysis.hardest.map((h) => {
                  const d = topDistractor(h);
                  const q = h.question;
                  return (
                    <li key={q.id} className="rounded-xl bg-white p-4">
                      <p className="text-xs font-bold text-amber-700">
                        {q.number}번 · {q.category} · 정답률 {h.correctRate}%
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold">{q.stem}</p>
                      {d && (
                        <p className="mt-2 text-xs text-slate-600">
                          가장 많이 고른 오답{" "}
                          <strong>
                            {q.kind === "mcq" ? CIRCLED[d.index] : d.index === 0 ? "O" : "X"} ({d.count}명)
                          </strong>{" "}
                          — 수업에서 이 선지가 왜 틀렸는지 짚어 주세요.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border bg-white">
            <h2 className="border-b p-5 font-extrabold">문항별 정답률 · 응답 분포</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-bold">번호</th>
                    <th className="px-4 py-2.5 font-bold">문항</th>
                    <th className="px-4 py-2.5 font-bold">정답</th>
                    <th className="w-44 px-4 py-2.5 font-bold">정답률</th>
                    <th className="px-4 py-2.5 font-bold">선택 분포 (초록: 정답 · 주황: 최다 오답)</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.questionStats.map((stat) => {
                    const q = stat.question;
                    return (
                      <tr key={q.id} className="border-t align-top">
                        <td className="px-4 py-3 font-bold tabular-nums">{q.number}</td>
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 max-w-md font-medium">{q.stem}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {q.kind === "mcq" ? "5지선다" : "OX"} · {q.category} · 난이도 {q.difficulty}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{answerLabel(q)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full rounded-full", stat.correctRate < 50 ? "bg-amber" : "bg-primary")}
                                style={{ width: `${stat.correctRate}%` }}
                              />
                            </div>
                            <span className="w-12 text-right font-bold tabular-nums">{stat.correctRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ChoiceDistribution stat={stat} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border bg-white">
          <h2 className="border-b p-5 font-extrabold">학생별 성적</h2>
          {submissions.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">제출한 학생이 없어요.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">순위</th>
                    <th className="px-5 py-2.5 font-semibold">이름</th>
                    <th className="px-5 py-2.5 text-right font-semibold">점수</th>
                    <th className="px-5 py-2.5 text-right font-semibold">맞힌 문항</th>
                    <th className="px-5 py-2.5 text-right font-semibold">소요 시간</th>
                    <th className="px-5 py-2.5 text-right font-semibold">제출</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={s.studentId} className="border-t">
                      <td className="px-5 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-2.5 font-semibold">{s.studentName}</td>
                      <td className={cn("px-5 py-2.5 text-right text-base font-black tabular-nums", s.score < 60 && "text-amber-700")}>{s.score}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">
                        {s.correctCount}/{s.total}
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap text-muted-foreground">{formatDuration(s.durationSec)}</td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap text-muted-foreground">{formatDateTime(s.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 font-extrabold">미응시 학생 {notSubmitted.length}명</h2>
          {notSubmitted.length === 0 ? (
            <p className="text-sm text-muted-foreground">모든 학생이 제출했어요.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {notSubmitted.map((s) => (
                <span key={s.id} className="rounded-full bg-muted px-3 py-1 text-sm">
                  {s.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-4 rounded-lg bg-surface p-3 text-xs leading-relaxed text-muted-foreground">
            반 참여 코드 <strong className="font-mono text-slate-700">{classInfo.joinCode}</strong> — 아직 반에 들어오지 않은 학생에게 알려 주세요.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function AssignmentReportPage(props: PageProps<"/app/assignments/[id]">) {
  return (
    <>
      <Link href="/app/assignments" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> 배포한 시험
      </Link>
      <Suspense
        fallback={
          <div className="space-y-5">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        }
      >
        <Report params={props.params} />
      </Suspense>
    </>
  );
}
