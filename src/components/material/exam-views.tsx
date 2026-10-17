/** 시험지 분석 보고서 · 모음 시험지 렌더러 (훅 없음) */
import { ClipboardList, Compass, MessageSquareHeart, Target, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { computeReportStats } from "@/lib/report-stats";
import type { ExamReport, ExamSet } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { CIRCLED, McqView, OxView, PassageView, ShortAnswerView } from "./sections";

/* ------------------------------------------------------------------ */
/* 분포 막대 (단일 계열 → 범례 없음, 값은 막대 끝에 텍스트 색으로 표기)       */
/* ------------------------------------------------------------------ */

function DistributionBars({ title, rows }: { title: string; rows: { label: string; count: number; ratio: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <figure className="rounded-xl border bg-card p-4 print-avoid">
      <figcaption className="mb-3 text-sm font-bold text-slate-800">{title}</figcaption>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="group relative grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">{r.label}</span>
            <div className="h-5 border-l border-slate-300">
              <div
                className="h-full rounded-r-[4px] bg-primary transition-[filter] group-hover:brightness-110"
                style={{ width: `${(r.count / max) * 100}%`, minWidth: r.count ? 4 : 0 }}
              />
            </div>
            <span className="text-right text-sm whitespace-nowrap tabular-nums text-slate-700">
              {r.count}문항 <span className="text-xs text-muted-foreground">({r.ratio}%)</span>
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-8 left-16 z-10 rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            >
              {r.label} · {r.count}문항 · 전체의 {r.ratio}%
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

const DIFF_TEXT = { 상: "text-red-600", 중: "text-amber-600", 하: "text-emerald-600" } as const;

export function ExamReportView({ report, compact = false }: { report: ExamReport; compact?: boolean }) {
  const stats = computeReportStats(report);
  const hard = stats.difficulty.find((d) => d.level === "상")!;
  const tiles = [
    { label: "총 문항", value: `${stats.total}`, unit: "문항" },
    { label: "고난도(상) 비율", value: `${hard.ratio}`, unit: "%" },
    { label: "출제 영역", value: `${stats.areas.length}`, unit: "개 영역" },
    { label: "<보기> 활용", value: `${report.questions.filter((q) => /보기/.test(q.type)).length}`, unit: "문항" },
  ];
  return (
    <div className="space-y-6">
      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border bg-card p-4 print-avoid">
            <div className="text-xs font-semibold text-muted-foreground">{t.label}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">{t.value}</span>
              <span className="text-sm text-muted-foreground">{t.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-slate-700 print-avoid">
        <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900">
          <ClipboardList className="size-4 text-primary" /> 총평
        </div>
        {report.overview}
      </div>

      <div className={cn("grid grid-cols-1 gap-4", !compact && "lg:grid-cols-2")}>
        <DistributionBars
          title="난이도 분포"
          rows={stats.difficulty.map((d) => ({ label: `난이도 ${d.level}`, count: d.count, ratio: d.ratio }))}
        />
        <DistributionBars title="영역별 출제 비중" rows={stats.areas.map((a) => ({ label: a.name, count: a.count, ratio: a.ratio }))} />
      </div>
      {!compact && <p className="text-sm leading-relaxed text-slate-600">{report.difficulty_comment}</p>}

      {!compact && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary text-left text-xs text-secondary-foreground">
              <tr>
                {["번호", "영역", "갈래", "출제 지문", "유형", "난이도", "출제 포인트"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.questions.map((q) => (
                <tr key={q.number} className="border-t align-top">
                  <td className="px-3 py-2 font-bold tabular-nums">{q.number}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.area}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{q.genre}</td>
                  <td className="px-3 py-2">{q.source}</td>
                  <td className="px-3 py-2">{q.type}</td>
                  <td className={cn("px-3 py-2 text-center font-bold", DIFF_TEXT[q.difficulty])}>{q.difficulty}</td>
                  <td className="px-3 py-2 text-slate-600">{q.point}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-4", !compact && "lg:grid-cols-3")}>
        <div className="rounded-xl border bg-card p-4 print-avoid">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <TrendingUp className="size-4 text-primary" /> 출제 경향 핵심
          </div>
          <ul className="space-y-1.5 text-sm leading-relaxed text-slate-700">
            {report.key_findings.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        {!compact && (
          <>
            <div className="rounded-xl border bg-card p-4 print-avoid">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                <Compass className="size-4 text-emerald" /> 영역별 학습 전략
              </div>
              <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700">
                {report.study_strategies.map((s, i) => (
                  <li key={i}>
                    <Badge variant="emerald" className="mb-1">
                      {s.area}
                    </Badge>
                    <p>{s.strategy}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 print-avoid">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                <MessageSquareHeart className="size-4 text-violet-600" /> 학부모 상담 가이드
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                {report.consultation_guide.map((g, i) => (
                  <li key={i} className="rounded-lg bg-white/80 p-2.5">
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 모음 시험지                                                           */
/* ------------------------------------------------------------------ */

/** 지문별 시작 문항 번호를 미리 계산합니다(선택형·서술형 각각 연속 번호). */
function sectionNumbering(exam: ExamSet) {
  return exam.sections.reduce<{ mcq: number; sa: number }[]>((acc, sec, i) => {
    const prev = acc[i - 1];
    const prevSec = exam.sections[i - 1];
    acc.push(prev ? { mcq: prev.mcq + prevSec.mcq.length, sa: prev.sa + prevSec.short_answer.length } : { mcq: 1, sa: 1 });
    return acc;
  }, []);
}

export function ExamSetView({ exam, showAnswers }: { exam: ExamSet; showAnswers: boolean }) {
  const numbering = sectionNumbering(exam);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-xl border-2 border-slate-900 bg-card p-5 text-center print-avoid">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground">
          {[exam.school, exam.grade].filter(Boolean).join(" · ") || "학교 · 학년"}
        </p>
        <h3 className="mt-1 text-2xl font-extrabold tracking-tight">{exam.title}</h3>
        <div className="mt-3 grid grid-cols-3 divide-x border-t pt-3 text-sm">
          <span>시험 시간 {exam.timeLimit ? `${exam.timeLimit}분` : "-"}</span>
          <span>지문 {exam.sections.length}개</span>
          <span>성명 ______</span>
        </div>
      </header>
      <ul className="space-y-1 rounded-xl bg-surface p-4 text-sm text-slate-700">
        {exam.instructions.map((x, i) => (
          <li key={i}>
            {i + 1}. {x}
          </li>
        ))}
      </ul>
      {exam.sections.map((sec, idx) => {
        const { mcq: start, sa: saStart } = numbering[idx];
        const range = sec.mcq.length > 1 ? `[${start}~${start + sec.mcq.length - 1}]` : sec.mcq.length ? `[${start}]` : "";
        return (
          <section key={`${sec.materialId}-${idx}`} className="space-y-4">
            <p className="font-bold">
              {range} 다음 글을 읽고 물음에 답하시오.
            </p>
            <PassageView text={sec.passage.text} sourceNote={sec.passage.author ? `${sec.passage.author}, 「${sec.passage.title}」` : `「${sec.passage.title}」`} />
            {sec.mcq.length > 0 && <McqView data={{ questions: sec.mcq }} showAnswers={showAnswers} startNumber={start} />}
            {sec.short_answer.length > 0 && (
              <ShortAnswerView data={{ questions: sec.short_answer }} showAnswers={showAnswers} startNumber={saStart} />
            )}
            {sec.ox.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">다음 진술이 윗글의 내용과 맞으면 O, 틀리면 X 표시하시오.</p>
                <OxView data={{ items: sec.ox }} showAnswers={showAnswers} />
              </div>
            )}
          </section>
        );
      })}
      {showAnswers && (
        <div className="rounded-xl border bg-card p-4 print-break">
          <div className="mb-2 flex items-center gap-1.5 font-bold">
            <Target className="size-4 text-red-500" /> 빠른 정답표
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {exam.sections
              .flatMap((s) => s.mcq)
              .map((q, i) => (
                <span key={i} className="rounded-md bg-muted px-2 py-1 tabular-nums">
                  {i + 1}. {CIRCLED[q.answer - 1]}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

