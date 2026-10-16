/**
 * 자료 유형별 렌더러 (훅 없음 → 서버/클라이언트/인쇄 화면 공용)
 */
import {
  ArrowDown,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  CircleDot,
  Lightbulb,
  Quote,
  Sparkles,
  Star,
  Swords,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Annotation, Mcq, Ox, PassageContent, ShortAnswer, Structure } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const CIRCLED = ["①", "②", "③", "④", "⑤"];

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h4 className={cn("mb-3 flex items-center gap-2 text-sm font-bold tracking-tight text-slate-700", className)}>{children}</h4>
  );
}

const KIND_STYLE: Record<Structure["character_relation"][number]["kind"], string> = {
  갈등: "border-red-200 bg-red-50 text-red-700",
  협력: "border-emerald-200 bg-emerald-50 text-emerald-700",
  애정: "border-rose-200 bg-rose-50 text-rose-700",
  중립: "border-slate-200 bg-slate-50 text-slate-600",
};

/* ------------------------------------------------------------------ */
/* 작품 도식화                                                           */
/* ------------------------------------------------------------------ */

export function StructureView({ data, compact = false }: { data: Structure; compact?: boolean }) {
  const info = [
    { label: "시점 · 화자", value: data.basic_info.point_of_view },
    { label: "배경", value: data.basic_info.background },
    { label: "주제", value: data.basic_info.theme },
    { label: "어조 · 문체", value: data.basic_info.tone },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{data.genre}</Badge>
        {data.characteristics.map((c) => (
          <Badge key={c} variant="soft">
            #{c}
          </Badge>
        ))}
      </div>

      <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
        {info.map((i) => (
          <div key={i.label} className="rounded-xl border bg-surface p-3.5 print-avoid">
            <div className="text-[11px] font-bold tracking-wide text-primary">{i.label}</div>
            <div className="mt-1 text-sm leading-relaxed font-medium text-slate-800">{i.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 rounded-xl border-l-4 border-primary bg-secondary/70 p-4 print-avoid">
        <Quote className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed font-semibold text-secondary-foreground">{data.one_line_summary}</p>
      </div>

      <div>
        <SectionLabel>
          <CircleDot className="size-4 text-primary" /> 전개 구조
        </SectionLabel>
        <ol className={cn("flex flex-col gap-2", !compact && "lg:flex-row lg:items-stretch")}>
          {data.structure_flow.map((s, i) => (
            <li key={`${s.stage}-${i}`} className={cn("flex flex-col items-center gap-2", !compact && "lg:flex-1 lg:flex-row")}>
              <div className="flex h-full w-full flex-col rounded-xl border bg-card p-3.5 shadow-xs print-avoid">
                <span className="mb-1.5 inline-flex w-fit rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                  {s.stage}
                </span>
                <p className="text-sm leading-relaxed font-semibold text-slate-800">{s.summary}</p>
                {s.key_symbol && (
                  <p className="mt-2 rounded-lg bg-amber-soft px-2.5 py-1.5 text-xs leading-relaxed text-amber-800">{s.key_symbol}</p>
                )}
              </div>
              {i < data.structure_flow.length - 1 && (
                <>
                  <ArrowDown className={cn("size-4 shrink-0 text-primary/60", !compact && "lg:hidden")} />
                  {!compact && <ArrowRight className="hidden size-4 shrink-0 text-primary/60 lg:block" />}
                </>
              )}
            </li>
          ))}
        </ol>
      </div>

      {data.character_relation.length > 0 && (
        <div>
          <SectionLabel>
            <Swords className="size-4 text-primary" /> 인물 · 대상 관계도
          </SectionLabel>
          <div className="grid grid-cols-1 gap-2.5">
            {data.character_relation.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border bg-card p-3 print-avoid sm:gap-3"
              >
                <span className="truncate rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-bold text-white">{r.from}</span>
                <div className="flex min-w-24 flex-col items-center gap-1 sm:min-w-40">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", KIND_STYLE[r.kind])}>{r.kind}</span>
                  <div className="relative h-px w-full bg-slate-300">
                    <ArrowRight className="absolute -top-2 -right-1 size-4 text-slate-400" />
                  </div>
                  <span className="text-center text-xs font-medium text-slate-600">{r.relation}</span>
                </div>
                <span className="truncate rounded-lg border-2 border-slate-900 px-3 py-1.5 text-center text-sm font-bold text-slate-900">
                  {r.to}
                </span>
                <p className="col-span-3 text-xs leading-relaxed text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.core_conflict && (
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 print-avoid">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-red-700">
            <Swords className="size-3.5" /> 핵심 갈등
          </div>
          <p className="text-sm leading-relaxed text-slate-800">{data.core_conflict}</p>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-6", !compact && "lg:grid-cols-2")}>
        <div>
          <SectionLabel>
            <BookMarked className="size-4 text-primary" /> 핵심 시어 · 소재
          </SectionLabel>
          <dl className="grid grid-cols-1 gap-2">
            {data.keywords.map((k) => (
              <div key={k.term} className="flex gap-3 rounded-xl border bg-card p-3 print-avoid">
                <dt className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-sm font-bold text-secondary-foreground">{k.term}</dt>
                <dd className="text-sm leading-relaxed text-slate-700">{k.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <SectionLabel>
            <Star className="size-4 text-amber" /> 핵심 출제 포인트
          </SectionLabel>
          <ol className="grid grid-cols-1 gap-2">
            {data.exam_points.map((point, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-amber-200/70 bg-amber-soft/60 p-3 print-avoid">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-slate-800">{point}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 행간주 해설                                                          */
/* ------------------------------------------------------------------ */

export function AnnotationView({ data, limit }: { data: Annotation; limit?: number }) {
  const segments = limit ? data.segments.slice(0, limit) : data.segments;
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-slate-700">{data.overview}</p>
      <ol className="space-y-3">
        {segments.map((s, i) => (
          <li key={i} className="grid gap-3 rounded-xl border bg-card p-4 print-avoid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-5">
            <div>
              <Badge variant="outline" className="mb-2 font-bold text-primary">
                {s.ref}
              </Badge>
              <blockquote className="passage border-l-[3px] border-primary/70 bg-gradient-to-r from-blue-50 to-transparent py-1 pl-3 text-[15px] text-slate-900">
                {s.text.split(" / ").map((line, j) => (
                  <span key={j} className="block">
                    {line}
                  </span>
                ))}
              </blockquote>
            </div>
            <div className="space-y-2.5">
              <p className="text-sm leading-relaxed text-slate-700">{s.explanation}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.devices.map((d) => (
                  <span key={d} className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    {d}
                  </span>
                ))}
              </div>
              {s.exam_point && (
                <p className="flex gap-1.5 rounded-lg bg-amber-soft px-2.5 py-2 text-xs leading-relaxed font-semibold text-amber-800">
                  <Star className="mt-px size-3.5 shrink-0 fill-amber text-amber" />
                  {s.exam_point}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!limit && data.key_takeaways.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-soft/70 p-4 print-avoid">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-emerald-800">
            <Lightbulb className="size-4" /> 핵심 정리
          </div>
          <ul className="space-y-1.5">
            {data.key_takeaways.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-800">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5지선다                                                              */
/* ------------------------------------------------------------------ */

const DIFF_BADGE = { 상: "destructive", 중: "amber", 하: "emerald" } as const;

export function BogiBox({ text }: { text: string }) {
  return (
    <div className="relative mt-3 rounded-lg border border-slate-400 px-4 pt-5 pb-3">
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-card px-2 text-xs font-bold tracking-[0.3em] text-slate-700">
        &lt;보기&gt;
      </span>
      <p className="passage text-sm whitespace-pre-line text-slate-800">{text}</p>
    </div>
  );
}

export function McqView({
  data,
  showAnswers,
  startNumber = 1,
  limit,
}: {
  data: Mcq;
  showAnswers: boolean;
  startNumber?: number;
  limit?: number;
}) {
  const questions = limit ? data.questions.slice(0, limit) : data.questions;
  return (
    <ol className="space-y-5">
      {questions.map((q, i) => (
        <li key={i} className="rounded-xl border bg-card p-4 print-avoid sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 no-print">
            <Badge variant="muted">{q.type}</Badge>
            <Badge variant={DIFF_BADGE[q.difficulty]}>난이도 {q.difficulty}</Badge>
          </div>
          <p className="font-bold leading-relaxed text-slate-900">
            <span className="mr-1 text-primary">{startNumber + i}.</span>
            {q.stem}
          </p>
          {q.bogi && <BogiBox text={q.bogi} />}
          <ul className="mt-3 space-y-1.5">
            {q.options.map((o, j) => {
              const correct = showAnswers && q.answer === j + 1;
              return (
                <li
                  key={j}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[15px] leading-relaxed text-slate-800 transition-colors",
                    correct && "bg-emerald-soft font-semibold text-emerald-900 ring-1 ring-emerald-300",
                  )}
                >
                  <span className="mr-1.5">{CIRCLED[j]}</span>
                  {o}
                  {showAnswers && q.option_notes[j] && (
                    <span className={cn("mt-0.5 block text-xs font-normal", correct ? "text-emerald-700" : "text-muted-foreground")}>
                      └ {q.option_notes[j]}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {showAnswers && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50/70 p-3 text-sm leading-relaxed">
              <span className="mr-2 font-bold text-red-600">정답 {CIRCLED[q.answer - 1]}</span>
              <span className="text-slate-700">{q.explanation}</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* 서술형                                                               */
/* ------------------------------------------------------------------ */

export function ShortAnswerView({ data, showAnswers, startNumber = 1 }: { data: ShortAnswer; showAnswers: boolean; startNumber?: number }) {
  return (
    <ol className="space-y-5">
      {data.questions.map((q, i) => (
        <li key={i} className="rounded-xl border bg-card p-4 print-avoid sm:p-5">
          <p className="font-bold leading-relaxed text-slate-900">
            <span className="mr-1.5 rounded-md bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">서술형 {startNumber + i}</span>
            {q.stem}
          </p>
          {q.conditions.length > 0 && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-surface px-4 py-3">
              <div className="mb-1 text-xs font-bold text-slate-600">&lt;조건&gt;</div>
              <ul className="space-y-0.5 text-sm text-slate-700">
                {q.conditions.map((c, j) => (
                  <li key={j}>• {c}</li>
                ))}
              </ul>
            </div>
          )}
          {showAnswers ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-red-100 bg-red-50/70 p-3 text-sm leading-relaxed">
                <span className="mr-2 font-bold text-red-600">모범 답안</span>
                <span className="text-slate-800">{q.model_answer}</span>
              </div>
              <table className="w-full overflow-hidden rounded-lg border text-sm">
                <thead className="bg-secondary text-left text-xs text-secondary-foreground">
                  <tr>
                    <th className="px-3 py-2 font-bold">채점 기준</th>
                    <th className="w-16 px-3 py-2 text-right font-bold">배점</th>
                  </tr>
                </thead>
                <tbody>
                  {q.scoring.map((s, j) => (
                    <tr key={j} className="border-t">
                      <td className="px-3 py-2 text-slate-700">{s.criterion}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{s.points}점</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 h-24 rounded-lg border border-slate-300 bg-[repeating-linear-gradient(transparent,transparent_31px,#e2e8f0_31px,#e2e8f0_32px)]" />
          )}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* OX 퀴즈                                                              */
/* ------------------------------------------------------------------ */

export function OxView({ data, showAnswers, limit }: { data: Ox; showAnswers: boolean; limit?: number }) {
  const items = limit ? data.items.slice(0, limit) : data.items;
  return (
    <ol className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((x, i) => (
        <li key={i} className="flex gap-3 p-3.5 print-avoid sm:p-4">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-slate-600">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-relaxed font-medium text-slate-900">{x.statement}</p>
            {showAnswers && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <span className="mr-1 font-semibold text-slate-600">[{x.concept}]</span>
                {x.explanation}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {(["O", "X"] as const).map((mark) => {
              const isAnswer = showAnswers && (mark === "O") === x.answer;
              return (
                <span
                  key={mark}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-sm font-black",
                    isAnswer
                      ? mark === "O"
                        ? "border-primary bg-primary text-white"
                        : "border-red-500 bg-red-500 text-white"
                      : "border-slate-200 text-slate-300",
                  )}
                >
                  {mark}
                </span>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* 초성 어휘 퀴즈                                                        */
/* ------------------------------------------------------------------ */

export function VocabView({
  data,
  showAnswers,
  limit,
}: {
  data: NonNullable<PassageContent["vocab"]>;
  showAnswers: boolean;
  limit?: number;
}) {
  const items = limit ? data.items.slice(0, limit) : data.items;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((v, i) => (
        <div key={i} className="flex flex-col rounded-xl border bg-card p-4 print-avoid">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground">어휘 {i + 1}</span>
            {showAnswers && (
              <span className="rounded-md bg-emerald-soft px-2 py-0.5 text-sm font-bold text-emerald-700">{v.answer}</span>
            )}
          </div>
          <div className="my-2 text-2xl font-black tracking-[0.25em] text-primary">{v.initials}</div>
          <p className="text-sm leading-relaxed text-slate-800">{v.definition}</p>
          <p className="passage mt-2 border-t pt-2 text-[13px] text-muted-foreground">“{v.context}”</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 지문                                                                 */
/* ------------------------------------------------------------------ */

export function PassageView({
  text,
  title,
  author,
  sourceNote,
  className,
}: {
  text: string;
  title?: string;
  author?: string;
  sourceNote?: string;
  className?: string;
}) {
  return (
    <figure className={cn("rounded-xl border bg-card", className)}>
      {title && (
        <figcaption className="flex items-center gap-2 border-b bg-surface px-5 py-3 text-sm font-bold">
          <Sparkles className="size-4 text-primary" />
          {title}
          {author && <span className="font-medium text-muted-foreground">· {author}</span>}
        </figcaption>
      )}
      <div className="passage px-5 py-4 text-[15px] whitespace-pre-line text-slate-900 sm:px-6">{text}</div>
      {sourceNote && <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">출처: {sourceNote}</p>}
    </figure>
  );
}
