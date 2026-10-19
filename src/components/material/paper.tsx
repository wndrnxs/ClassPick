/**
 * 시험지 형식 문서 — 수능 국어 영역 문제지처럼
 *   [1～3] 다음 글을 읽고 물음에 답하시오. → 지문 상자 → 문항(1. … ①~⑤) → (교사용 정리 자료)
 * 순서로 흐르고, 쪽마다 왼쪽 단을 먼저 채운 뒤 오른쪽 단으로 넘어갑니다 (paper-pages.tsx).
 */
import { MATERIAL_TYPE_META } from "@/lib/catalog";
import type { MaterialDTO } from "@/lib/material-dto";
import { passageKind, passageLayout } from "@/lib/passage-layout";
import type { Annotation, ExamSet, Mcq, McqQuestion, Ox, PassageContent, ShortAnswer, Structure } from "@/lib/schemas";
import { DIFFICULTIES, SCHOOL_LEVELS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { PaperPages } from "./paper-pages";
import { RichRuns } from "./rich-text";
import { CIRCLED } from "./sections";

const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

export type PaperMaterial = Extract<MaterialDTO, { kind: "passage" | "exam_set" | "ocr" }>;
export const hasPaperLayout = (m: MaterialDTO): m is PaperMaterial => m.kind !== "exam_report";

/* ------------------------------------------------------------------ */
/* 공통 부품                                                            */
/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="paper-keep mt-5 mb-2 border-b border-black pb-0.5 font-sans text-[0.95em] font-extrabold">{children}</h2>;
}

/** 발문 묶음 안내: [1～3] 다음 글을 읽고 물음에 답하시오. */
function Instruction({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("paper-keep mb-2 font-sans text-[0.95em] font-bold", className)}>{children}</p>;
}

const rangeLabel = (start: number, count: number) => (count > 1 ? `[${start}～${start + count - 1}] ` : count === 1 ? `[${start}] ` : "");

/** 지문 상자 — 산문은 문단 첫 줄 들여쓰기, 운문은 행·연 그대로 (수능 문제지 형식) */
function PassageBox({ text, source, genre }: { text: string; source?: string; genre?: string }) {
  const kind = passageKind(text, genre);
  return (
    <div className="mb-4">
      <div className="paper-box passage border border-black px-[0.9em] py-[0.55em] leading-[1.75]">
        {passageLayout(text, kind).map((line, i) =>
          "gap" in line ? (
            <div key={i} aria-hidden className="h-[0.9em]" />
          ) : (
            <p key={i} className={cn(line.indent ? "indent-[1em] [text-align:justify]" : "pl-[1em] -indent-[1em]")}>
              <RichRuns runs={line.runs} />
            </p>
          ),
        )}
      </div>
      {source && <p className="mt-1 text-right text-[0.85em]">- {source} -</p>}
    </div>
  );
}

function Bogi({ text, label = "<보 기>" }: { text: string; label?: string }) {
  return (
    <div className="relative mt-2.5 mb-2 border border-black px-[0.8em] pt-[0.9em] pb-[0.5em]">
      <span className="absolute -top-[0.75em] left-1/2 -translate-x-1/2 bg-white px-2 text-[0.9em] tracking-[0.2em]">{label}</span>
      <p className="whitespace-pre-line [text-align:justify]">{text}</p>
    </div>
  );
}

/** 선지·목록처럼 둘째 줄부터 들여 쓰는 문단 */
function Hanging({ mark, children, className }: { mark: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("pl-[1.4em] -indent-[1.4em]", className)}>
      <span className="inline-block w-[1.4em] indent-0">{mark}</span>
      {children}
    </p>
  );
}

function TeacherNote({ children }: { children: React.ReactNode }) {
  return <div className="mt-1.5 space-y-0.5 border-l-2 border-red-500 pl-2 text-[0.84em] leading-relaxed text-slate-700">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* 문항                                                                 */
/* ------------------------------------------------------------------ */

function McqItem({ q, number, showAnswers }: { q: McqQuestion; number: number; showAnswers: boolean }) {
  return (
    <div className="paper-q mb-4">
      <p className="pl-[1.6em] -indent-[1.6em] [text-align:justify]">
        <b className="inline-block w-[1.6em] indent-0 font-sans">{number}.</b>
        {q.stem}
      </p>
      {q.bogi && <Bogi text={q.bogi} />}
      <div className="mt-1 space-y-0.5 pl-[0.4em]">
        {q.options.map((o, j) => (
          <Hanging key={j} mark={CIRCLED[j]} className={cn(showAnswers && q.answer === j + 1 && "font-bold text-red-700")}>
            {o}
          </Hanging>
        ))}
      </div>
      {showAnswers && (
        <TeacherNote>
          <p>
            <b className="text-red-600">정답 {CIRCLED[q.answer - 1]}</b>{" "}
            <span className="text-slate-500">
              [{q.type} · 난이도 {q.difficulty}]
            </span>{" "}
            {q.explanation}
          </p>
          {q.option_notes.map((n, j) =>
            n ? (
              <Hanging key={j} mark={CIRCLED[j]} className="text-slate-500">
                {n}
              </Hanging>
            ) : null,
          )}
        </TeacherNote>
      )}
    </div>
  );
}

function McqList({ data, showAnswers, start = 1 }: { data: Mcq; showAnswers: boolean; start?: number }) {
  return data.questions.map((q, i) => <McqItem key={i} q={q} number={start + i} showAnswers={showAnswers} />);
}

function ShortAnswerList({ data, showAnswers, start = 1 }: { data: ShortAnswer; showAnswers: boolean; start?: number }) {
  return data.questions.map((q, i) => (
    <div key={i} className="paper-q mb-4">
      <p className="[text-align:justify]">
        <b className="mr-1 font-sans">[서술형 {start + i}]</b>
        {q.stem}
      </p>
      {q.conditions.length > 0 && (
        <Bogi
          label="<조 건>"
          text={q.conditions.map((c) => `• ${c}`).join("\n")}
        />
      )}
      {showAnswers ? (
        <TeacherNote>
          <p>
            <b className="text-red-600">모범 답안</b> {q.model_answer}
          </p>
          {q.scoring.map((s, j) => (
            <Hanging key={j} mark="·">
              {s.criterion} <b>({s.points}점)</b>
            </Hanging>
          ))}
        </TeacherNote>
      ) : (
        <div className="mt-2 h-[6.5em] border border-black bg-[repeating-linear-gradient(transparent,transparent_1.6em,#cbd5e1_1.6em,#cbd5e1_calc(1.6em+1px))]" />
      )}
    </div>
  ));
}

function OxList({ data, showAnswers }: { data: Ox; showAnswers: boolean }) {
  return (
    <div className="space-y-1">
      {data.items.map((x, i) => (
        <div key={i} className="paper-q">
          <p className="pl-[1.6em] -indent-[1.6em] [text-align:justify]">
            <b className="inline-block w-[1.6em] indent-0 font-sans">{i + 1}.</b>
            {x.statement}{" "}
            <span className={cn("font-sans whitespace-nowrap", showAnswers ? "font-bold text-red-600" : "text-slate-500")}>
              ( {showAnswers ? (x.answer ? "O" : "X") : "O / X"} )
            </span>
          </p>
          {showAnswers && (
            <p className="pl-[1.6em] text-[0.84em] text-slate-600">
              [{x.concept}] {x.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 지문 분석 자료                                                        */
/* ------------------------------------------------------------------ */

function StructurePaper({ c }: { c: Structure }) {
  const rows = [
    ["갈래", c.genre],
    ["성격", c.characteristics.join(", ")],
    ["시점·화자", c.basic_info.point_of_view],
    ["배경", c.basic_info.background],
    ["주제", c.basic_info.theme],
    ["어조·문체", c.basic_info.tone],
  ];
  return (
    <div className="space-y-2.5">
      <table className="paper-q w-full border-collapse text-[0.92em]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th className="w-[5.2em] border border-black bg-slate-100 px-1.5 py-0.5 text-left font-sans font-bold whitespace-nowrap">{k}</th>
              <td className="border border-black px-1.5 py-0.5">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="paper-q">
        <b className="font-sans">한 줄 요약</b> {c.one_line_summary}
      </p>
      <div>
        <p className="paper-keep font-sans font-bold">전개 구조</p>
        {c.structure_flow.map((s, i) => (
          <Hanging key={i} mark="▸" className="paper-q">
            <b>{s.stage}</b> {s.summary}
            {s.key_symbol && <span className="text-slate-600"> — {s.key_symbol}</span>}
          </Hanging>
        ))}
      </div>
      {c.character_relation.length > 0 && (
        <div>
          <p className="paper-keep font-sans font-bold">인물 · 대상 관계</p>
          {c.character_relation.map((r, i) => (
            <Hanging key={i} mark="▸" className="paper-q">
              <b>
                {r.from} → {r.to}
              </b>{" "}
              ({r.kind} · {r.relation}) {r.description}
            </Hanging>
          ))}
        </div>
      )}
      {c.core_conflict && (
        <p className="paper-q">
          <b className="font-sans">핵심 갈등</b> {c.core_conflict}
        </p>
      )}
      <div>
        <p className="paper-keep font-sans font-bold">핵심 시어 · 소재</p>
        {c.keywords.map((k) => (
          <Hanging key={k.term} mark="·" className="paper-q">
            <b>{k.term}</b>: {k.meaning}
          </Hanging>
        ))}
      </div>
      <div>
        <p className="paper-keep font-sans font-bold">출제 포인트</p>
        {c.exam_points.map((p, i) => (
          <Hanging key={i} mark="★" className="paper-q">
            {p}
          </Hanging>
        ))}
      </div>
    </div>
  );
}

function AnnotationPaper({ c }: { c: Annotation }) {
  return (
    <div className="space-y-2.5">
      <p className="[text-align:justify]">{c.overview}</p>
      {c.segments.map((s, i) => (
        <div key={i} className="paper-q">
          <p className="font-sans text-[0.85em] font-bold">[{s.ref}]</p>
          <p className="passage border-l-2 border-black pl-2">
            {s.text.split(" / ").map((line, j) => (
              <span key={j} className="block">
                {line}
              </span>
            ))}
          </p>
          <p className="mt-0.5 [text-align:justify]">{s.explanation}</p>
          {(s.devices.length > 0 || s.exam_point) && (
            <p className="text-[0.84em] text-slate-600">
              {s.devices.map((d) => `#${d}`).join(" ")}
              {s.exam_point && <span className="font-semibold text-slate-800"> ★ {s.exam_point}</span>}
            </p>
          )}
        </div>
      ))}
      {c.key_takeaways.length > 0 && (
        <div className="paper-q border border-black px-2 py-1">
          <p className="font-sans font-bold">핵심 정리</p>
          {c.key_takeaways.map((t, i) => (
            <Hanging key={i} mark="✔">
              {t}
            </Hanging>
          ))}
        </div>
      )}
    </div>
  );
}

function VocabPaper({ c, showAnswers }: { c: NonNullable<PassageContent["vocab"]>; showAnswers: boolean }) {
  return (
    <div className="space-y-1.5">
      {c.items.map((v, i) => (
        <div key={i} className="paper-q">
          <p className="pl-[1.6em] -indent-[1.6em]">
            <b className="inline-block w-[1.6em] indent-0 font-sans">{i + 1}.</b>
            <b className="mr-1.5 font-sans tracking-[0.15em]">{v.initials}</b>
            {v.definition}{" "}
            <span className={cn("font-sans whitespace-nowrap", showAnswers ? "font-bold text-red-600" : "")}>
              ( {showAnswers ? v.answer : " ".repeat(8)} )
            </span>
          </p>
          <p className="pl-[1.6em] text-[0.84em] text-slate-600">“{v.context}”</p>
        </div>
      ))}
    </div>
  );
}

function PassageFlow({ m, showAnswers }: { m: Extract<MaterialDTO, { kind: "passage" }>; showAnswers: boolean }) {
  const c = m.content;
  const source = m.sourceNote || (m.author ? `${m.author}, 「${m.title}」` : `「${m.title}」`);
  const genre = [m.settings.genre !== "auto" ? m.settings.genre : "", c.structure?.genre].filter(Boolean).join(" ");
  const mcqCount = c.mcq?.questions.length ?? 0;
  // 수업 정리 자료(도식화·행간주)는 문항 뒤에
  const notes = (["structure", "annotation"] as const).filter((t) => c[t]);
  return (
    <>
      <Instruction>{rangeLabel(1, mcqCount)}다음 글을 읽고 물음에 답하시오.</Instruction>
      <PassageBox text={m.sourceText} source={source} genre={genre} />
      {c.mcq && <McqList data={c.mcq} showAnswers={showAnswers} />}
      {c.short_answer && <ShortAnswerList data={c.short_answer} showAnswers={showAnswers} />}
      {c.ox && (
        <div className="mb-4">
          <Instruction>[OX] 다음 진술이 윗글의 내용과 맞으면 O, 틀리면 X 표시하시오.</Instruction>
          <OxList data={c.ox} showAnswers={showAnswers} />
        </div>
      )}
      {c.vocab && (
        <div className="mb-4">
          <Instruction>[어휘] 초성과 뜻풀이를 보고 알맞은 어휘를 쓰시오.</Instruction>
          <VocabPaper c={c.vocab} showAnswers={showAnswers} />
        </div>
      )}
      {notes.map((t, i) => (
        <section key={t}>
          <SectionTitle>
            {ROMAN[i]}. {MATERIAL_TYPE_META[t].label}
          </SectionTitle>
          {t === "structure" && c.structure && <StructurePaper c={c.structure} />}
          {t === "annotation" && c.annotation && <AnnotationPaper c={c.annotation} />}
        </section>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 모음 시험지                                                           */
/* ------------------------------------------------------------------ */

function ExamSetFlow({ exam, showAnswers }: { exam: ExamSet; showAnswers: boolean }) {
  // 문항 번호는 지문 순서대로 이어집니다 (선택형·서술형 각각).
  const sections = exam.sections.map((sec, i) => {
    const before = exam.sections.slice(0, i);
    const start = { mcq: 1 + before.reduce((n, x) => n + x.mcq.length, 0), sa: 1 + before.reduce((n, x) => n + x.short_answer.length, 0) };
    return { sec, start };
  });
  const allMcq = exam.sections.flatMap((s) => s.mcq);
  return (
    <>
      {exam.instructions.length > 0 && (
        <ol className="paper-q mb-4 border border-black px-3 py-1.5 text-[0.88em]">
          {exam.instructions.map((x, i) => (
            <li key={i}>
              {i + 1}. {x}
            </li>
          ))}
        </ol>
      )}
      {sections.map(({ sec, start }, idx) => (
        <section key={`${sec.materialId}-${idx}`}>
          <Instruction className={idx > 0 ? "mt-5" : undefined}>{rangeLabel(start.mcq, sec.mcq.length)}다음 글을 읽고 물음에 답하시오.</Instruction>
          <PassageBox text={sec.passage.text} source={sec.passage.author ? `${sec.passage.author}, 「${sec.passage.title}」` : `「${sec.passage.title}」`} />
          <McqList data={{ questions: sec.mcq }} showAnswers={showAnswers} start={start.mcq} />
          {sec.short_answer.length > 0 && <ShortAnswerList data={{ questions: sec.short_answer }} showAnswers={showAnswers} start={start.sa} />}
          {sec.ox.length > 0 && (
            <>
              <Instruction>[OX] 다음 진술이 윗글의 내용과 맞으면 O, 틀리면 X 표시하시오.</Instruction>
              <OxList data={{ items: sec.ox }} showAnswers={showAnswers} />
            </>
          )}
        </section>
      ))}
      {showAnswers && allMcq.length > 0 && (
        <section className="paper-q">
          <SectionTitle>빠른 정답표</SectionTitle>
          <p className="font-sans tabular-nums">
            {allMcq.map((q, i) => (
              <span key={i} className="mr-3 inline-block">
                {i + 1}. {CIRCLED[q.answer - 1]}
              </span>
            ))}
          </p>
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 문서                                                                 */
/* ------------------------------------------------------------------ */

function headOf(material: PaperMaterial, showAnswers: boolean) {
  switch (material.kind) {
    case "passage": {
      const st = material.settings;
      const sub = [
        material.author,
        st.schoolLevel ? `${SCHOOL_LEVELS[st.schoolLevel]}${st.grade ? ` ${st.grade}` : ""}` : "",
        st.difficulty ? `난이도 ${DIFFICULTIES[st.difficulty]}` : "",
      ];
      return { title: material.title, sub: sub.filter(Boolean).join(" · "), badge: showAnswers ? "교사용" : "학생용" };
    }
    case "exam_set": {
      const e = material.content.exam;
      return {
        title: e.title,
        sub: [e.school, e.grade, e.timeLimit ? `${e.timeLimit}분` : "", showAnswers ? "" : "성명 :"].filter(Boolean).join(" · "),
        badge: showAnswers ? "교사용" : "학생용",
      };
    }
    case "ocr":
      return { title: material.title, sub: `스마트 OCR 변환 · 원본 파일: ${material.content.ocr.fileName}` };
  }
}

export function PaperDocument({ material, showAnswers, columns = 2 }: { material: PaperMaterial; showAnswers: boolean; columns?: 1 | 2 }) {
  return (
    <div className="paper text-black">
      <PaperPages head={headOf(material, showAnswers)} columns={columns}>
        {material.kind === "passage" && <PassageFlow m={material} showAnswers={showAnswers} />}
        {material.kind === "exam_set" && <ExamSetFlow exam={material.content.exam} showAnswers={showAnswers} />}
        {material.kind === "ocr" && <PassageBox text={material.content.ocr.text} />}
        <p className="paper-q mt-5 border-t border-black pt-1.5 font-sans text-[0.72em] leading-relaxed text-slate-500">
          ※ 클래스픽(ClassPick) AI가 만든 초안입니다. 수업·평가 활용 전 담당 선생님의 최종 검수를 거쳐 주세요. 지문의 저작권은 원저작자에게 있으며, 교육
          목적 범위에서 출처를 밝혀 사용해 주세요.
        </p>
      </PaperPages>
    </div>
  );
}
