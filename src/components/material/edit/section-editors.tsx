"use client";

/** 자료 유형별 수정 폼 */
import type { Annotation, ExamReport, McqQuestion, Ox, ShortAnswer, Structure, VocabItem } from "@/lib/schemas";
import { DIFFICULTY_LEVELS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { CIRCLED } from "../sections";
import { at, each, ItemList, NullableArea, NumberInput, SelectInput, StringList, TextArea, TextInput, type Bind } from "./fields";

const RELATION_KINDS = ["갈등", "협력", "애정", "중립"] as const;

/* ------------------------------------------------------------------ */
/* 작품 도식화                                                          */
/* ------------------------------------------------------------------ */

export function StructureEditor({ b }: { b: Bind<Structure> }) {
  const info = at(b, "basic_info");
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <TextInput label="작품명" b={at(b, "title")} />
        <TextInput label="작가" b={at(b, "author")} />
        <TextInput label="갈래" b={at(b, "genre")} />
      </div>
      <StringList label="성격 키워드" b={at(b, "characteristics")} addLabel="키워드 추가" />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextArea label="시점 · 화자" b={at(info, "point_of_view")} />
        <TextArea label="배경" b={at(info, "background")} />
        <TextArea label="주제" b={at(info, "theme")} />
        <TextArea label="어조 · 문체" b={at(info, "tone")} />
      </div>
      <TextArea label="한 줄 요약" b={at(b, "one_line_summary")} />
      <Group title="전개 구조">
        <ItemList
          b={at(b, "structure_flow")}
          itemLabel={(i) => `${i + 1}단계`}
          make={() => ({ stage: "", summary: "", key_symbol: "" })}
          addLabel="단계 추가"
          render={(s) => (
            <>
              <TextInput label="단계명" b={at(s, "stage")} placeholder="예: 1연(기), 발단" />
              <TextArea label="핵심 내용" b={at(s, "summary")} />
              <TextArea label="주요 상징 · 의미" b={at(s, "key_symbol")} hint="없으면 비워 두세요" />
            </>
          )}
        />
      </Group>
      <Group title="인물 · 대상 관계">
        <ItemList
          b={at(b, "character_relation")}
          itemLabel={(i) => `관계 ${i + 1}`}
          make={() => ({ from: "", to: "", kind: "중립" as const, relation: "", description: "" })}
          addLabel="관계 추가"
          render={(r) => (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem]">
                <TextInput label="누가" b={at(r, "from")} />
                <TextInput label="누구에게" b={at(r, "to")} />
                <SelectInput label="관계 유형" b={at(r, "kind")} options={RELATION_KINDS} />
              </div>
              <TextInput label="관계 (짧게)" b={at(r, "relation")} />
              <TextArea label="설명" b={at(r, "description")} />
            </>
          )}
        />
      </Group>
      <NullableArea label="핵심 갈등" b={at(b, "core_conflict")} hint="없으면 비워 두세요" />
      <Group title="핵심 시어 · 소재">
        <ItemList
          b={at(b, "keywords")}
          itemLabel={(i) => `시어 ${i + 1}`}
          make={() => ({ term: "", meaning: "" })}
          addLabel="시어 추가"
          render={(k) => (
            <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
              <TextInput label="시어 · 소재" b={at(k, "term")} />
              <TextArea label="의미" b={at(k, "meaning")} />
            </div>
          )}
        />
      </Group>
      <StringList label="핵심 출제 포인트" b={at(b, "exam_points")} addLabel="출제 포인트 추가" multiline />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 행간주 해설                                                          */
/* ------------------------------------------------------------------ */

export function AnnotationEditor({ b }: { b: Bind<Annotation> }) {
  return (
    <div className="space-y-5">
      <TextArea label="해설 개관" b={at(b, "overview")} />
      <Group title="구절별 해설">
        <ItemList
          b={at(b, "segments")}
          itemLabel={(i) => `구절 ${i + 1}`}
          make={() => ({ ref: "", text: "", explanation: "", devices: [], exam_point: null })}
          addLabel="구절 추가"
          render={(s) => (
            <>
              <TextInput label="위치" b={at(s, "ref")} placeholder="예: 1연 1~2행" />
              <TextArea label="원문 구절" b={at(s, "text")} hint="여러 줄은 ' / '로 구분" passage />
              <TextArea label="해설" b={at(s, "explanation")} />
              <StringList label="표현 기법 · 문법 요소" b={at(s, "devices")} addLabel="태그 추가" />
              <NullableArea label="출제 포인트" b={at(s, "exam_point")} hint="없으면 비워 두세요" />
            </>
          )}
        />
      </Group>
      <StringList label="핵심 정리" b={at(b, "key_takeaways")} addLabel="정리 추가" multiline />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5지선다                                                              */
/* ------------------------------------------------------------------ */

export const emptyMcq = (): McqQuestion => ({
  type: "",
  stem: "",
  bogi: null,
  options: ["", "", "", "", ""],
  answer: 1,
  explanation: "",
  option_notes: ["", "", "", "", ""],
  difficulty: "중",
});

export function McqQuestionEditor({ b }: { b: Bind<McqQuestion> }) {
  const notes = each(at(b, "option_notes"));
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <TextInput label="출제 유형" b={at(b, "type")} placeholder="예: 표현상 특징" />
        <SelectInput label="난이도" b={at(b, "difficulty")} options={DIFFICULTY_LEVELS} />
      </div>
      <TextArea label="발문" b={at(b, "stem")} />
      <NullableArea label="<보기>" b={at(b, "bogi")} hint="없으면 비워 두세요" />
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-bold text-slate-600">선지 · 정답 (번호를 눌러 정답 지정)</legend>
        {each(at(b, "options")).map((o, j) => {
          const correct = b.value.answer === j + 1;
          return (
            <div key={j} className={cn("rounded-lg border p-2", correct && "border-emerald-300 bg-emerald-soft/50")}>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => b.set({ ...b.value, answer: j + 1 })}
                  aria-pressed={correct}
                  aria-label={`${j + 1}번을 정답으로`}
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border text-base font-bold transition",
                    correct ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-slate-500 hover:border-emerald-500",
                  )}
                >
                  {CIRCLED[j]}
                </button>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <textarea
                    aria-label={`선지 ${j + 1}`}
                    value={o.value}
                    onChange={(e) => o.set(e.target.value)}
                    rows={1}
                    className="field-sizing-content min-h-9 w-full resize-y rounded-md border border-input bg-background px-2.5 py-1.5 text-sm leading-relaxed outline-none focus-visible:border-primary"
                  />
                  <textarea
                    aria-label={`선지 ${j + 1} 해설`}
                    value={notes[j]?.value ?? ""}
                    placeholder="선지 해설 (왜 맞고 틀린지)"
                    onChange={(e) => notes[j]?.set(e.target.value)}
                    rows={1}
                    className="field-sizing-content min-h-8 w-full resize-y rounded-md border border-dashed border-input bg-transparent px-2.5 py-1 text-xs leading-relaxed text-muted-foreground outline-none focus-visible:border-primary"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </fieldset>
      <TextArea label="정답 해설" b={at(b, "explanation")} />
    </>
  );
}

export function McqListEditor({ b, startNumber = 1 }: { b: Bind<McqQuestion[]>; startNumber?: number }) {
  return (
    <ItemList b={b} itemLabel={(i) => `${startNumber + i}번`} make={emptyMcq} addLabel="5지선다 문항 추가" render={(q) => <McqQuestionEditor b={q} />} />
  );
}

/* ------------------------------------------------------------------ */
/* 서술형                                                               */
/* ------------------------------------------------------------------ */

type SaQuestion = ShortAnswer["questions"][number];
export const emptyShortAnswer = (): SaQuestion => ({ stem: "", conditions: [], model_answer: "", scoring: [{ criterion: "", points: 5 }], difficulty: "중" });

export function ShortAnswerListEditor({ b, startNumber = 1 }: { b: Bind<SaQuestion[]>; startNumber?: number }) {
  return (
    <ItemList
      b={b}
      itemLabel={(i) => `서술형 ${startNumber + i}`}
      make={emptyShortAnswer}
      addLabel="서술형 문항 추가"
      render={(q) => (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <TextArea label="발문" b={at(q, "stem")} />
            <SelectInput label="난이도" b={at(q, "difficulty")} options={DIFFICULTY_LEVELS} />
          </div>
          <StringList label="<조건>" b={at(q, "conditions")} addLabel="조건 추가" multiline />
          <TextArea label="모범 답안" b={at(q, "model_answer")} />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-600">채점 기준</p>
            <ItemList
              b={at(q, "scoring")}
              itemLabel={(i) => `기준 ${i + 1}`}
              make={() => ({ criterion: "", points: 1 })}
              addLabel="채점 기준 추가"
              render={(s) => (
                <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
                  <TextArea label="기준" b={at(s, "criterion")} />
                  <NumberInput label="배점" b={at(s, "points")} min={0} max={100} />
                </div>
              )}
            />
          </div>
        </>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* OX 퀴즈                                                              */
/* ------------------------------------------------------------------ */

type OxItem = Ox["items"][number];
export const emptyOx = (): OxItem => ({ statement: "", answer: true, explanation: "", concept: "" });

export function OxListEditor({ b }: { b: Bind<OxItem[]> }) {
  return (
    <ItemList
      b={b}
      itemLabel={(i) => `OX ${i + 1}`}
      make={emptyOx}
      addLabel="OX 문항 추가"
      render={(x) => (
        <>
          <div className="flex items-start gap-3">
            <TextArea label="진술" b={at(x, "statement")} className="flex-1" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-600">정답</p>
              <div className="flex gap-1">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    aria-pressed={x.value.answer === v}
                    aria-label={v ? "정답 O" : "정답 X"}
                    onClick={() => x.set({ ...x.value, answer: v })}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border text-sm font-black transition",
                      x.value.answer === v ? (v ? "border-primary bg-primary text-white" : "border-red-500 bg-red-500 text-white") : "text-slate-400",
                    )}
                  >
                    {v ? "O" : "X"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <TextInput label="관련 개념" b={at(x, "concept")} />
            <TextArea label="해설" b={at(x, "explanation")} />
          </div>
        </>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 초성 어휘 퀴즈                                                        */
/* ------------------------------------------------------------------ */

export function VocabListEditor({ b }: { b: Bind<VocabItem[]> }) {
  return (
    <ItemList
      b={b}
      itemLabel={(i) => `어휘 ${i + 1}`}
      make={() => ({ answer: "", definition: "", context: "", initials: "" })}
      addLabel="어휘 추가"
      render={(v) => (
        <>
          <TextInput label="정답 어휘" b={at(v, "answer")} hint="초성 힌트는 저장할 때 자동으로 만들어져요" />
          <TextArea label="뜻풀이" b={at(v, "definition")} />
          <TextArea label="지문 속 쓰임 · 예문" b={at(v, "context")} passage />
        </>
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 시험지 분석 보고서                                                    */
/* ------------------------------------------------------------------ */

export function ExamReportEditor({ b }: { b: Bind<ExamReport> }) {
  return (
    <div className="space-y-5">
      <TextArea label="시험 총평" b={at(b, "overview")} />
      <TextArea label="난이도 분포 해석" b={at(b, "difficulty_comment")} />
      <StringList label="출제 경향 핵심 발견" b={at(b, "key_findings")} addLabel="항목 추가" multiline />
      <Group title="영역별 학습 전략">
        <ItemList
          b={at(b, "study_strategies")}
          itemLabel={(i) => `전략 ${i + 1}`}
          make={() => ({ area: "", strategy: "" })}
          addLabel="전략 추가"
          render={(s) => (
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <TextInput label="영역" b={at(s, "area")} />
              <TextArea label="전략" b={at(s, "strategy")} />
            </div>
          )}
        />
      </Group>
      <StringList label="학부모 상담 가이드" b={at(b, "consultation_guide")} addLabel="문구 추가" multiline />
      <Group title="문항별 분석">
        <ItemList
          b={at(b, "questions")}
          itemLabel={(i) => `${b.value.questions[i]?.number ?? i + 1}번 문항`}
          render={(q) => (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <NumberInput label="번호" b={at(q, "number")} min={1} />
                <TextInput label="영역" b={at(q, "area")} />
                <TextInput label="세부 갈래" b={at(q, "genre")} />
                <SelectInput label="난이도" b={at(q, "difficulty")} options={DIFFICULTY_LEVELS} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="출제 지문 · 작품" b={at(q, "source")} />
                <TextInput label="문항 유형" b={at(q, "type")} />
              </div>
              <TextArea label="출제 의도 · 핵심 포인트" b={at(q, "point")} />
            </>
          )}
        />
      </Group>
    </div>
  );
}

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
      {children}
    </div>
  );
}
