/**
 * 채점된 문항 보기 (훅 없음 · 서버 컴포넌트에서 사용)
 * reveal=false 이면 정답·해설을 표시하지 않고 내 답과 정오만 보여 줍니다.
 */
import type { ReactNode } from "react";
import { CheckCircle2, Lightbulb, Timer, XCircle } from "lucide-react";

import { BogiBox, CIRCLED } from "@/components/material/sections";
import { Badge } from "@/components/ui/badge";
import type { AnswerValue, AssessmentQuestion, PublicQuestion } from "@/lib/assessment";
import { cn, formatClock } from "@/lib/utils";

const oxLabel = (v: AnswerValue | null | undefined) => (v === true ? "O" : v === false ? "X" : "미응답");

export function ResultMark({ correct, className }: { correct: boolean; className?: string }) {
  return correct ? (
    <Badge variant="emerald" className={className}>
      <CheckCircle2 /> 정답
    </Badge>
  ) : (
    <Badge variant="destructive" className={className}>
      <XCircle /> 오답
    </Badge>
  );
}

export function QuestionReview({
  q,
  myAnswer,
  correct,
  reveal,
  id,
  timeSec,
  timeCompare,
  timeFlag,
  answerLabel = "내 답",
  footer,
}: {
  q: AssessmentQuestion | PublicQuestion;
  myAnswer: AnswerValue | null | undefined;
  correct: boolean;
  reveal: boolean;
  id?: string;
  /** 이 문항 풀이 시간(초). undefined면 시간 표시 안 함 */
  timeSec?: number | null;
  /** 비교 문구 (예: "반 평균 0:58") */
  timeCompare?: string;
  /** 눈에 띄게 표시할 시간 진단 (예: "빨리 풀다 틀림") */
  timeFlag?: string | null;
  /** 응답 표시 이름 (선생님 화면에서는 "학생 답") */
  answerLabel?: string;
  /** 카드 하단에 붙일 내용 (예: 문항 질문) */
  footer?: ReactNode;
}) {
  const full = reveal && "answer" in q ? (q as AssessmentQuestion) : null;
  const mine = myAnswer ?? null;
  return (
    <article id={id} className={cn("scroll-mt-24 rounded-2xl border bg-white p-5", !correct && "border-red-200")}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <ResultMark correct={correct} />
        <Badge variant="outline">{q.category}</Badge>
        <span className="text-xs text-muted-foreground">난이도 {q.difficulty}</span>
        {timeSec !== undefined && (
          <span className="ml-auto flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
            {timeFlag && <Badge variant="amber">{timeFlag}</Badge>}
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 tabular-nums">
              <Timer className="size-3.5" /> {timeSec == null ? "기록 없음" : formatClock(timeSec)}
            </span>
            {timeCompare && <span className="tabular-nums">· {timeCompare}</span>}
          </span>
        )}
      </div>
      <p className="font-bold leading-relaxed text-slate-900">
        <span className="mr-1.5 text-primary tabular-nums">{q.number}.</span>
        {q.kind === "ox" && <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-xs text-slate-600">OX</span>}
        {q.stem}
      </p>

      {q.kind === "mcq" ? (
        <>
          {q.bogi && <BogiBox text={q.bogi} />}
          <ul className="mt-3 space-y-1">
            {q.options.map((opt, j) => {
              const v = j + 1;
              const isAnswer = full?.kind === "mcq" && full.answer === v;
              const isMine = mine === v;
              return (
                <li
                  key={j}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border border-transparent px-3 py-2 text-[15px] leading-relaxed",
                    isAnswer && "border-emerald-300 bg-emerald-soft",
                    isMine && !correct && "border-red-200 bg-red-50",
                    isMine && correct && !full && "border-emerald-300 bg-emerald-soft",
                  )}
                >
                  <span className="shrink-0">{CIRCLED[j]}</span>
                  <span className="min-w-0 flex-1">{opt}</span>
                  <span className="flex shrink-0 gap-1">
                    {isMine && <Badge variant={correct ? "emerald" : "destructive"}>{answerLabel}</Badge>}
                    {isAnswer && <Badge variant="emerald">정답</Badge>}
                  </span>
                </li>
              );
            })}
          </ul>
          {mine === null && <p className="mt-2 text-sm font-semibold text-red-600">답을 고르지 않았어요.</p>}
        </>
      ) : (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            {answerLabel} <b className={cn("text-base", correct ? "text-emerald-700" : "text-red-600")}>{oxLabel(mine)}</b>
          </span>
          {full && (
            <span>
              정답 <b className="text-base text-emerald-700">{oxLabel(full.answer)}</b>
            </span>
          )}
        </p>
      )}

      {full && (full.explanation || (full.kind === "mcq" && !correct && typeof mine === "number" && full.optionNotes[mine - 1])) && (
        <div className="mt-3 space-y-1.5 rounded-xl bg-surface p-3.5 text-sm leading-relaxed">
          {full.explanation && (
            <p className="flex gap-1.5">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <span>
                <b className="mr-1">해설</b>
                {full.explanation}
              </span>
            </p>
          )}
          {full.kind === "mcq" && !correct && typeof mine === "number" && full.optionNotes[mine - 1] && (
            <p className="pl-5.5 text-slate-600">
              <b className="mr-1 text-red-600">내가 고른 {CIRCLED[mine - 1]}</b>
              {full.optionNotes[mine - 1]}
            </p>
          )}
        </div>
      )}
      {footer}
    </article>
  );
}
