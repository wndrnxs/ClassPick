/**
 * 시험지 형식(2단) 문서 — 수능 문제지처럼 한 쪽을 두 단으로 나눠 촘촘하게 보여 줍니다.
 * 훅 없음 → 서버/클라이언트/인쇄 화면 공용. 화면이 좁으면(모바일) 1단으로 보입니다.
 */
import { MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import type { MaterialDTO } from "@/lib/material-dto";
import type { Annotation, ExamSet, Mcq, McqQuestion, Ox, PassageContent, ShortAnswer, Structure } from "@/lib/schemas";
import { DIFFICULTIES, SCHOOL_LEVELS } from "@/lib/schemas";
import { cn } from "@/lib/utils";

import { RichText } from "./rich-text";
import { CIRCLED } from "./sections";

const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

export type PaperMaterial = Extract<MaterialDTO, { kind: "passage" | "exam_set" | "ocr" }>;
export const hasPaperLayout = (m: MaterialDTO): m is PaperMaterial => m.kind !== "exam_report";

/* ------------------------------------------------------------------ */
/* 공통 부품                                                            */
/* ------------------------------------------------------------------ */

function PaperHeader({ title, sub, right }: { title: string; sub?: string; right?: string }) {
  return (
    <header className="mb-4 border-b-2 border-black pb-2">
      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0 text-[0.8em] text-slate-600">{sub}</p>
        {right && <span className="shrink-0 rounded-md border-2 border-black px-2 py-0.5 text-[0.8em] font-bold">{right}</span>}
      </div>
      <h1 className="mt-1 text-center font-sans text-[1.9em] leading-tight font-black tracking-tight text-balance">{title}</h1>
    </header>
  );
}

/**
 * 단 나눔 — 인쇄할 때는 문서 전체가 쪽마다 왼쪽 단 → 오른쪽 단으로 흐르고,
 * 화면에서는 끝없이 긴 단이 되지 않도록 단원(Section)마다 2단으로 나눕니다.
 */
function Columns({ columns, children }: { columns: 1 | 2; children: React.ReactNode }) {
  return <div className={cn(columns === 2 && "paper-cols-print")}>{children}</div>;
}

function Section({ title, columns, children }: { title?: React.ReactNode; columns: 1 | 2; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      {title && <SectionTitle>{title}</SectionTitle>}
      <div className={cn(columns === 2 && "paper-cols-screen")}>{children}</div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="paper-keep mb-2 border-b border-black pb-0.5 font-sans text-[0.95em] font-extrabold">{children}</h2>;
}

function Instruction({ children }: { children: React.ReactNode }) {
  return <p className="paper-keep mb-2 font-sans text-[0.92em] font-bold">{children}</p>;
}

function PassageBox({ text, source }: { text: string; source?: string }) {
  return (
    <div className="mb-3">
      <div className="paper-box passage border border-black px-[0.9em] py-[0.6em] whitespace-pre-line [text-align:justify]">
        <RichText text={text} />
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
      <p className="text-[0.92em]">초성과 뜻풀이를 보고 알맞은 어휘를 쓰시오.</p>
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

function PassagePaper({ m, showAnswers, columns }: { m: Extract<MaterialDTO, { kind: "passage" }>; showAnswers: boolean; columns: 1 | 2 }) {
  const s = m.settings;
  const sub = [
    m.author,
    s.schoolLevel ? `${SCHOOL_LEVELS[s.schoolLevel]}${s.grade ? ` ${s.grade}` : ""}` : "",
    s.difficulty ? `난이도 ${DIFFICULTIES[s.difficulty]}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const types = MATERIAL_TYPE_ORDER.filter((t) => m.content[t]);
  const c = m.content;
  const source = m.sourceNote || (m.author ? `${m.author}, 「${m.title}」` : `「${m.title}」`);
  return (
    <>
      <PaperHeader title={m.title} sub={sub} right={showAnswers ? "교사용" : "학생용"} />
      <Columns columns={columns}>
        <Section title="지문" columns={columns}>
          <PassageBox text={m.sourceText} source={source} />
        </Section>
        {types.map((t, i) => (
          <Section key={t} columns={columns} title={`${ROMAN[i]}. ${MATERIAL_TYPE_META[t].label}`}>
            {t === "structure" && c.structure && <StructurePaper c={c.structure} />}
            {t === "annotation" && c.annotation && <AnnotationPaper c={c.annotation} />}
            {t === "mcq" && c.mcq && <McqList data={c.mcq} showAnswers={showAnswers} />}
            {t === "short_answer" && c.short_answer && <ShortAnswerList data={c.short_answer} showAnswers={showAnswers} />}
            {t === "ox" && c.ox && (
              <>
                <p className="mb-1 text-[0.92em]">다음 진술이 윗글의 내용과 맞으면 O, 틀리면 X 표시하시오.</p>
                <OxList data={c.ox} showAnswers={showAnswers} />
              </>
            )}
            {t === "vocab" && c.vocab && <VocabPaper c={c.vocab} showAnswers={showAnswers} />}
          </Section>
        ))}
      </Columns>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 모음 시험지                                                           */
/* ------------------------------------------------------------------ */

function ExamSetPaper({ exam, showAnswers, columns }: { exam: ExamSet; showAnswers: boolean; columns: 1 | 2 }) {
  // 문항 번호는 지문 순서대로 이어집니다 (선택형·서술형 각각).
  const sections = exam.sections.map((sec, i) => {
    const before = exam.sections.slice(0, i);
    const start = { mcq: 1 + before.reduce((n, x) => n + x.mcq.length, 0), sa: 1 + before.reduce((n, x) => n + x.short_answer.length, 0) };
    return { sec, start };
  });
  const allMcq = exam.sections.flatMap((s) => s.mcq);
  return (
    <>
      <PaperHeader
        title={exam.title}
        sub={[exam.school, exam.grade, exam.timeLimit ? `${exam.timeLimit}분` : ""].filter(Boolean).join(" · ")}
        right={showAnswers ? "교사용" : "성명 ________"}
      />
      {exam.instructions.length > 0 && (
        <ol className="mb-4 border border-black px-3 py-1.5 text-[0.88em]">
          {exam.instructions.map((x, i) => (
            <li key={i}>
              {i + 1}. {x}
            </li>
          ))}
        </ol>
      )}
      <Columns columns={columns}>
        {sections.map(({ sec, start }, idx) => {
          const n = sec.mcq.length;
          const range = n > 1 ? `[${start.mcq}～${start.mcq + n - 1}]` : n === 1 ? `[${start.mcq}]` : "";
          return (
            <Section key={`${sec.materialId}-${idx}`} columns={columns}>
              <Instruction>{range} 다음 글을 읽고 물음에 답하시오.</Instruction>
              <PassageBox text={sec.passage.text} source={sec.passage.author ? `${sec.passage.author}, 「${sec.passage.title}」` : `「${sec.passage.title}」`} />
              <McqList data={{ questions: sec.mcq }} showAnswers={showAnswers} start={start.mcq} />
              {sec.short_answer.length > 0 && <ShortAnswerList data={{ questions: sec.short_answer }} showAnswers={showAnswers} start={start.sa} />}
              {sec.ox.length > 0 && (
                <>
                  <p className="mb-1 text-[0.92em]">다음 진술이 윗글의 내용과 맞으면 O, 틀리면 X 표시하시오.</p>
                  <OxList data={{ items: sec.ox }} showAnswers={showAnswers} />
                </>
              )}
            </Section>
          );
        })}
        {showAnswers && allMcq.length > 0 && (
          <Section title="빠른 정답표" columns={1}>
            <p className="paper-q font-sans tabular-nums">
              {allMcq.map((q, i) => (
                <span key={i} className="mr-3 inline-block">
                  {i + 1}. {CIRCLED[q.answer - 1]}
                </span>
              ))}
            </p>
          </Section>
        )}
      </Columns>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 문서                                                                 */
/* ------------------------------------------------------------------ */

export function PaperDocument({
  material,
  showAnswers,
  columns = 2,
  className,
}: {
  material: PaperMaterial;
  showAnswers: boolean;
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <div className={cn("paper text-black", className)}>
      {material.kind === "passage" && <PassagePaper m={material} showAnswers={showAnswers} columns={columns} />}
      {material.kind === "exam_set" && <ExamSetPaper exam={material.content.exam} showAnswers={showAnswers} columns={columns} />}
      {material.kind === "ocr" && (
        <>
          <PaperHeader title={material.title} sub={`스마트 OCR 변환 · 원본 파일: ${material.content.ocr.fileName}`} />
          <Columns columns={columns}>
            <Section columns={columns}>
              <div className="passage whitespace-pre-line [text-align:justify]">
                <RichText text={material.content.ocr.text} />
              </div>
            </Section>
          </Columns>
        </>
      )}
      <p className="mt-5 border-t border-black pt-1.5 font-sans text-[0.72em] leading-relaxed text-slate-500">
        ※ 클래스픽(ClassPick) AI가 만든 초안입니다. 수업·평가 활용 전 담당 선생님의 최종 검수를 거쳐 주세요. 지문의 저작권은 원저작자에게 있으며, 교육 목적
        범위에서 출처를 밝혀 사용해 주세요.
      </p>
    </div>
  );
}
