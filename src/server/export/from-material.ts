/**
 * 자료(Material) → DocModel 변환
 * audience: teacher(정답·해설 포함) / student(문제만)
 */
import { MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import type { MaterialDTO } from "@/lib/material-dto";
import { computeReportStats } from "@/lib/report-stats";
import { richLines } from "@/lib/rich-text";
import { DIFFICULTIES, SCHOOL_LEVELS, type ExamSet, type MaterialType, type PassageContent } from "@/lib/schemas";
import { p, runs, type Block, type DocModel, type Run } from "./doc-model";

export type Audience = "teacher" | "student";
export type Columns = 1 | 2;
export const CIRCLED = ["①", "②", "③", "④", "⑤"];
const SECTION_NUMBERS = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

function passageLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

/** 서식 있는 지문 → 줄마다 구간 목록 (굵게·밑줄·네모 박스) */
function richPassageLines(markup: string): Run[][] {
  return richLines(markup).map((line) => line.map((r) => ({ text: r.text, bold: r.b, underline: r.u, boxed: r.box })));
}

function attribution(m: { title: string; author: string; sourceNote: string }): string {
  if (m.sourceNote) return `출처: ${m.sourceNote}`;
  if (m.author) return `출처: ${m.author}, 「${m.title}」`;
  return `출처: 「${m.title}」`;
}

const FOOTER_NOTICE: Block[] = [
  { type: "spacer" },
  p("※ 본 자료는 클래스픽(ClassPick) AI가 생성한 초안입니다. 수업·평가에 활용하기 전 담당 선생님의 최종 검수를 거쳐 주세요.", {
    align: "left",
  }),
  p("※ 지문의 저작권은 원저작자에게 있습니다. 학교 수업 및 학원 내부 수업 목적 범위에서 출처를 밝혀 사용해 주세요."),
];

function structureBlocks(c: NonNullable<PassageContent["structure"]>, columns: Columns): Block[] {
  const blocks: Block[] = [
    {
      type: "table",
      widths: [1, 4],
      rows: [
        ["갈래", c.genre],
        ["성격", c.characteristics.join(", ")],
        ["시점·화자", c.basic_info.point_of_view],
        ["배경", c.basic_info.background],
        ["주제", c.basic_info.theme],
        ["어조·문체", c.basic_info.tone],
      ],
    },
    runs({ text: "한 줄 요약  ", bold: true, color: "accent" }, c.one_line_summary),
    { type: "heading", level: 2, text: "전개 구조" },
    ...(columns === 2
      ? c.structure_flow.map((s) => runs({ text: "▸ " }, { text: s.stage, bold: true }, ` ${s.summary}`, ...(s.key_symbol ? [{ text: ` — ${s.key_symbol}`, color: "muted" as const }] : [])))
      : [
          {
            type: "table" as const,
            header: ["단계", "핵심 내용", "주요 상징 · 의미"],
            widths: [1.2, 3, 3],
            rows: c.structure_flow.map((s) => [s.stage, s.summary, s.key_symbol]),
          },
        ]),
  ];
  if (c.character_relation.length && columns === 2) {
    blocks.push(
      { type: "heading", level: 2, text: "인물 · 대상 관계" },
      ...c.character_relation.map((r) => runs({ text: "▸ " }, { text: `${r.from} → ${r.to}`, bold: true }, ` (${r.kind} · ${r.relation}) ${r.description}`)),
    );
  } else if (c.character_relation.length) {
    blocks.push(
      { type: "heading", level: 2, text: "인물 · 대상 관계" },
      {
        type: "table",
        header: ["관계", "유형", "설명"],
        widths: [2.2, 0.8, 4],
        rows: c.character_relation.map((r) => [`${r.from} → ${r.to}\n(${r.relation})`, r.kind, r.description]),
      },
    );
  }
  if (c.core_conflict) blocks.push(runs({ text: "핵심 갈등  ", bold: true, color: "accent" }, c.core_conflict));
  blocks.push(
    { type: "heading", level: 2, text: "핵심 시어 · 소재" },
    ...(columns === 2
      ? c.keywords.map((k) => runs({ text: "· " }, { text: k.term, bold: true }, `: ${k.meaning}`))
      : [{ type: "table" as const, header: ["시어·소재", "의미"], widths: [1.4, 4], rows: c.keywords.map((k) => [k.term, k.meaning]) }]),
    { type: "heading", level: 2, text: "출제 포인트" },
    ...c.exam_points.map((point) => runs({ text: "★ ", color: "danger" }, point)),
  );
  return blocks;
}

function annotationBlocks(c: NonNullable<PassageContent["annotation"]>, columns: Columns): Block[] {
  if (columns === 2) {
    // 좁은 단에서는 표 대신 구절 → 해설 → 표현·출제 포인트 순서의 목록
    return [
      p(c.overview),
      ...c.segments.flatMap((s): Block[] => [
        runs({ text: `[${s.ref}] `, bold: true, color: "accent" }, { text: s.text, bold: true }),
        p(s.explanation, { indent: true }),
        ...(s.devices.length || s.exam_point
          ? [
              {
                type: "paragraph" as const,
                indent: true,
                runs: [
                  { text: s.devices.map((d) => `#${d}`).join(" "), color: "muted" as const },
                  ...(s.exam_point ? [{ text: ` ★ ${s.exam_point}`, bold: true }] : []),
                ],
              },
            ]
          : []),
      ]),
      { type: "heading", level: 2, text: "핵심 정리" },
      ...c.key_takeaways.map((t) => runs({ text: "✔ ", color: "emerald" }, t)),
    ];
  }
  return [
    p(c.overview),
    {
      type: "table",
      header: ["구절", "해설", "표현 · 출제 포인트"],
      widths: [2.4, 4, 2.2],
      rows: c.segments.map((s) => [
        `[${s.ref}]\n${s.text}`,
        s.explanation,
        [s.devices.join(", "), s.exam_point ? `★ ${s.exam_point}` : ""].filter(Boolean).join("\n"),
      ]),
    },
    { type: "heading", level: 2, text: "핵심 정리" },
    ...c.key_takeaways.map((t) => runs({ text: "✔ ", color: "emerald" }, t)),
  ];
}

function mcqBlocks(c: NonNullable<PassageContent["mcq"]>, audience: Audience, startNumber = 1): Block[] {
  const blocks: Block[] = [];
  c.questions.forEach((q, i) => {
    blocks.push(runs({ text: `${startNumber + i}. `, bold: true }, { text: q.stem, bold: true }));
    if (q.bogi) blocks.push({ type: "box", title: "<보 기>", lines: passageLines(q.bogi), tone: "plain" });
    q.options.forEach((o, j) => blocks.push(p(`${CIRCLED[j]} ${o}`, { indent: true })));
    if (audience === "teacher") {
      blocks.push(
        runs({ text: `정답 ${CIRCLED[q.answer - 1]}`, color: "danger" }, { text: `  [${q.type} · 난이도 ${q.difficulty}]`, color: "muted" }),
        runs({ text: "해설 ", bold: true }, q.explanation),
        ...q.option_notes
          .map((n, j): Block | null =>
            n ? { type: "paragraph", indent: true, runs: [{ text: `${CIRCLED[j]} ${n}`, color: "muted" }] } : null,
          )
          .filter((b): b is Block => b !== null),
      );
    }
    blocks.push({ type: "spacer" });
  });
  return blocks;
}

function shortAnswerBlocks(c: NonNullable<PassageContent["short_answer"]>, audience: Audience, startNumber = 1): Block[] {
  const blocks: Block[] = [];
  c.questions.forEach((q, i) => {
    blocks.push(runs({ text: `[서술형 ${startNumber + i}] `, bold: true, color: "accent" }, { text: q.stem, bold: true }));
    if (q.conditions.length) blocks.push({ type: "box", title: "<조 건>", lines: q.conditions.map((x) => `• ${x}`), tone: "plain" });
    if (audience === "teacher") {
      blocks.push(
        runs({ text: "모범 답안 ", color: "danger" }, q.model_answer),
        {
          type: "table",
          header: ["채점 기준", "배점"],
          widths: [5, 1],
          rows: q.scoring.map((s) => [s.criterion, `${s.points}점`]),
        },
      );
    } else {
      blocks.push({ type: "box", lines: ["", "", ""], tone: "plain" });
    }
    blocks.push({ type: "spacer" });
  });
  return blocks;
}

function oxBlocks(c: NonNullable<PassageContent["ox"]>, audience: Audience, columns: Columns = 1): Block[] {
  if (columns === 2) {
    return [
      p("다음 진술이 윗글의 내용과 맞으면 O, 틀리면 X 표시하시오."),
      ...c.items.flatMap((x, i): Block[] => [
        runs(
          { text: `${i + 1}. `, bold: true },
          x.statement,
          audience === "teacher" ? { text: `  ( ${x.answer ? "O" : "X"} )`, color: "danger" } : { text: "  ( O / X )", color: "muted" },
        ),
        ...(audience === "teacher" ? [{ type: "paragraph" as const, indent: true, runs: [{ text: `[${x.concept}] ${x.explanation}`, color: "muted" as const }] }] : []),
      ]),
    ];
  }
  return [
    p("다음 진술이 윗글의 내용과 맞으면 O, 틀리면 X 표시하시오."),
    audience === "teacher"
      ? {
          type: "table",
          header: ["번호", "진술", "정답", "해설"],
          widths: [0.6, 4, 0.6, 3.4],
          rows: c.items.map((x, i) => [`${i + 1}`, x.statement, x.answer ? "O" : "X", `[${x.concept}] ${x.explanation}`]),
        }
      : {
          type: "table",
          header: ["번호", "진술", "O / X"],
          widths: [0.6, 6, 1],
          rows: c.items.map((x, i) => [`${i + 1}`, x.statement, ""]),
        },
  ];
}

function vocabBlocks(c: NonNullable<PassageContent["vocab"]>, audience: Audience, columns: Columns): Block[] {
  if (columns === 2) {
    return [
      p("초성과 뜻풀이를 보고 알맞은 어휘를 쓰시오."),
      ...c.items.flatMap((v, i): Block[] => [
        runs(
          { text: `${i + 1}. `, bold: true },
          { text: `${v.initials}  `, bold: true, color: "accent" },
          v.definition,
          audience === "teacher" ? { text: `  ( ${v.answer} )`, color: "danger" } : "  (            )",
        ),
        { type: "paragraph", indent: true, runs: [{ text: `“${v.context}”`, color: "muted" }] },
      ]),
    ];
  }
  return [
    p("초성과 뜻풀이를 보고 알맞은 어휘를 쓰시오."),
    {
      type: "table",
      header: ["번호", "초성", "뜻풀이", "지문 속 쓰임", audience === "teacher" ? "정답" : "답"],
      widths: [0.6, 1.2, 3.2, 3, 1.4],
      rows: c.items.map((v, i) => [`${i + 1}`, v.initials, v.definition, v.context, audience === "teacher" ? v.answer : ""]),
    },
  ];
}

function passageDoc(m: Extract<MaterialDTO, { kind: "passage" }>, audience: Audience, only: MaterialType[] | undefined, columns: Columns): DocModel {
  const s = m.settings;
  const meta = [
    m.author || null,
    s.schoolLevel ? `${SCHOOL_LEVELS[s.schoolLevel]}${s.grade ? ` ${s.grade}` : ""}` : null,
    s.difficulty ? `난이도 ${DIFFICULTIES[s.difficulty]}` : null,
    audience === "teacher" ? "교사용 (정답·해설 포함)" : "학생용",
  ]
    .filter(Boolean)
    .join("  ·  ");
  const blocks: Block[] = [
    { type: "title", text: m.title },
    { type: "meta", text: meta },
    { type: "columns", count: columns },
    { type: "heading", level: 1, text: "지문" },
    { type: "box", lines: richPassageLines(m.sourceText) },
    p(attribution(m), { align: "left" }),
  ];
  const types = MATERIAL_TYPE_ORDER.filter((t) => m.content[t] && (!only || only.includes(t)));
  types.forEach((type, idx) => {
    blocks.push({ type: "heading", level: 1, text: `${SECTION_NUMBERS[idx]}. ${MATERIAL_TYPE_META[type].label}` });
    const c = m.content;
    if (type === "structure" && c.structure) blocks.push(...structureBlocks(c.structure, columns));
    if (type === "annotation" && c.annotation) blocks.push(...annotationBlocks(c.annotation, columns));
    if (type === "mcq" && c.mcq) blocks.push(...mcqBlocks(c.mcq, audience));
    if (type === "short_answer" && c.short_answer) blocks.push(...shortAnswerBlocks(c.short_answer, audience));
    if (type === "ox" && c.ox) blocks.push(...oxBlocks(c.ox, audience, columns));
    if (type === "vocab" && c.vocab) blocks.push(...vocabBlocks(c.vocab, audience, columns));
  });
  blocks.push(...FOOTER_NOTICE);
  return { title: m.title, blocks };
}

function examSetDoc(exam: ExamSet, audience: Audience, columns: Columns): DocModel {
  const blocks: Block[] = [
    { type: "title", text: exam.title },
    {
      type: "table",
      widths: [1, 2, 1, 2],
      rows: [
        ["학교", exam.school || " ", "학년", exam.grade || " "],
        ["시험 시간", exam.timeLimit ? `${exam.timeLimit}분` : " ", "성명", " "],
      ],
    },
    { type: "box", title: "수험생 유의 사항", lines: exam.instructions.map((x, i) => `${i + 1}. ${x}`), tone: "plain" },
    { type: "columns", count: columns },
  ];
  let mcqNo = 1;
  let saNo = 1;
  const answerRows: string[][] = [];
  exam.sections.forEach((sec) => {
    const count = sec.mcq.length;
    const range = count > 1 ? `[${mcqNo}~${mcqNo + count - 1}]` : count === 1 ? `[${mcqNo}]` : "";
    blocks.push(
      { type: "spacer" },
      runs({ text: `${range} `, bold: true }, { text: "다음 글을 읽고 물음에 답하시오.", bold: true }),
      { type: "box", lines: richPassageLines(sec.passage.text) },
      p(attribution({ title: sec.passage.title, author: sec.passage.author, sourceNote: "" })),
    );
    if (sec.mcq.length) {
      blocks.push(...mcqBlocks({ questions: sec.mcq }, "student", mcqNo));
      sec.mcq.forEach((q, i) => answerRows.push([`${mcqNo + i}`, CIRCLED[q.answer - 1], q.explanation]));
      mcqNo += sec.mcq.length;
    }
    if (sec.short_answer.length) {
      blocks.push(...shortAnswerBlocks({ questions: sec.short_answer }, "student", saNo));
      sec.short_answer.forEach((q, i) => answerRows.push([`서술형 ${saNo + i}`, "-", q.model_answer]));
      saNo += sec.short_answer.length;
    }
    if (sec.ox.length) {
      blocks.push(...oxBlocks({ items: sec.ox }, "student", columns));
      sec.ox.forEach((x, i) => answerRows.push([`OX ${i + 1}`, x.answer ? "O" : "X", x.explanation]));
    }
  });
  if (audience === "teacher") {
    blocks.push(
      { type: "pageBreak" },
      { type: "columns", count: 1 },
      { type: "title", text: `${exam.title} — 정답 및 해설` },
      { type: "table", header: ["문항", "정답", "해설"], widths: [1, 0.8, 6], rows: answerRows },
    );
  }
  blocks.push(...FOOTER_NOTICE);
  return { title: exam.title, blocks };
}

/**
 * columns: 지문 자료·모음 시험지·OCR 문서의 단 수 (기본 2단, 수능 문제지 형식). 분석 보고서는 표가 많아 항상 1단.
 */
export function materialToDocModel(m: MaterialDTO, audience: Audience = "teacher", only?: MaterialType[], columns: Columns = 2): DocModel {
  switch (m.kind) {
    case "passage":
      return passageDoc(m, audience, only, columns);
    case "exam_set":
      return examSetDoc(m.content.exam, audience, columns);
    case "exam_report": {
      const r = m.content.report;
      const stats = computeReportStats(r);
      return {
        title: r.exam_title,
        blocks: [
          { type: "title", text: r.exam_title },
          { type: "meta", text: [m.sourceNote, `총 ${stats.total}문항`, "시험지 구조 및 난이도 분석 보고서"].filter(Boolean).join("  ·  ") },
          { type: "heading", level: 1, text: "Ⅰ. 총평" },
          p(r.overview),
          { type: "heading", level: 1, text: "Ⅱ. 난이도 · 영역 분포" },
          {
            type: "table",
            header: ["난이도", "문항 수", "비율"],
            widths: [1, 1, 1],
            rows: stats.difficulty.map((d) => [d.level, `${d.count}`, `${d.ratio}%`]),
          },
          p(r.difficulty_comment),
          {
            type: "table",
            header: ["영역", "문항 수", "비율"],
            widths: [1, 1, 1],
            rows: stats.areas.map((a) => [a.name, `${a.count}`, `${a.ratio}%`]),
          },
          { type: "heading", level: 1, text: "Ⅲ. 문항별 분석" },
          {
            type: "table",
            header: ["번호", "영역", "갈래", "출제 지문", "유형", "난이도", "출제 포인트"],
            widths: [0.6, 0.9, 1, 1.6, 1.3, 0.7, 2.6],
            rows: r.questions.map((q) => [`${q.number}`, q.area, q.genre, q.source, q.type, q.difficulty, q.point]),
          },
          { type: "heading", level: 1, text: "Ⅳ. 출제 경향 핵심" },
          ...r.key_findings.map((f) => runs({ text: "● ", color: "accent" }, f)),
          { type: "heading", level: 1, text: "Ⅴ. 영역별 학습 전략" },
          { type: "table", header: ["영역", "학습 전략"], widths: [1, 5], rows: r.study_strategies.map((s) => [s.area, s.strategy]) },
          { type: "heading", level: 1, text: "Ⅵ. 학부모 상담 가이드" },
          ...r.consultation_guide.map((g) => runs({ text: "▸ ", color: "emerald" }, g)),
          ...FOOTER_NOTICE.slice(0, 2),
        ],
      };
    }
    case "ocr":
      return {
        title: m.title,
        blocks: [
          { type: "title", text: m.title },
          { type: "meta", text: `스마트 OCR 변환 · 원본 파일: ${m.content.ocr.fileName}` },
          { type: "columns", count: columns },
          ...passageLines(m.content.ocr.text).map((line) => p(line)),
        ],
      };
  }
}
