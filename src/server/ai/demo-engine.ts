import "server-only";

/**
 * 데모 엔진 — ANTHROPIC_API_KEY 없이도 전체 흐름(생성 → 저장 → 내보내기)을 확인할 수 있도록
 * 지문의 형태적 특징(연/문단 수, 반복, 의문·영탄 표현, 빈도 핵심어)만으로 자료의 '틀'을 만듭니다.
 * 샘플 지문을 입력하면 사전 제작된 고품질 결과를 그대로 돌려줍니다.
 * 모든 결과는 UI에서 '데모 생성'으로 표시됩니다.
 */
import {
  extractKeywords,
  hasBatchim,
  josa,
  looksLikePoem,
  normalizeText,
  splitBlocks,
  splitSentences,
  stripParticle,
} from "@/lib/hangul";
import type { Annotation, ExamReport, MaterialType, Mcq, Ox, ShortAnswer, Structure, Vocab } from "@/lib/schemas";
import { stripRich } from "@/lib/rich-text";
import { matchSample } from "@/lib/samples";
import { HttpError } from "@/server/http";
import type { AiEngine, PassageContext, SectionOutput } from "./types";

const DEMO = "[데모]";

type Device = { name: string; test: (s: string) => boolean; note: string };

const DEVICES: Device[] = [
  { name: "설의·의문형", test: (s) => /[?？]/.test(s), note: "의문의 형식으로 화자의 생각이나 정서를 강조합니다." },
  {
    name: "영탄법",
    test: (s) => /[!！]|(구나|도다|어라|아라|노라|로다)[.!]?(\s|$)/.test(s),
    note: "감탄의 어조로 정서를 직접적으로 드러냅니다.",
  },
  { name: "직유법", test: (s) => /(처럼|같이|듯이|듯한|양 )/.test(s), note: "'~처럼', '~같이' 등을 써서 대상을 직접 빗댑니다." },
  { name: "명령·청유형", test: (s) => /(소서|십시오|하라|어라|아라|자)[.!]?(\s|$)/.test(s), note: "명령·청유의 어조로 화자의 바람을 드러냅니다." },
  { name: "의지적 어조", test: (s) => /(리라|리다|겠다|우리다)[.!]?(\s|$)/.test(s), note: "화자의 다짐이나 의지를 드러냅니다." },
  { name: "대조", test: (s) => /(그러나|하지만|반면|오히려)/.test(s), note: "상반된 내용을 맞세워 의미를 부각합니다." },
  { name: "예시", test: (s) => /(예를 들어|예컨대|가령)/.test(s), note: "구체적 사례를 들어 개념을 설명합니다." },
];

function devicesIn(text: string) {
  return DEVICES.filter((d) => d.test(text));
}

function repeatedWords(text: string) {
  const words = normalizeText(text)
    .split(/\s+/)
    .map(stripParticle)
    .filter((w) => w.length >= 2);
  const seen = new Map<string, number>();
  words.forEach((w) => seen.set(w, (seen.get(w) ?? 0) + 1));
  return [...seen.entries()].filter(([, n]) => n >= 2).map(([w]) => w);
}

function analyzeShape(ctx: PassageContext) {
  const text = normalizeText(ctx.passage);
  const blocks = splitBlocks(text);
  const poem = ctx.settings.genre.includes("시") || (ctx.settings.genre === "auto" && looksLikePoem(text));
  const unit = poem ? "연" : "문단";
  const keywords = extractKeywords(text, 8);
  const firstLine = text.split("\n")[0].trim();
  const lastLine = text.split("\n").filter(Boolean).at(-1)!.trim();
  const sentences = splitSentences(text);
  const allDevices = devicesIn(text);
  const firstBlock = blocks[0] ?? "";
  const lastBlock = blocks.at(-1) ?? "";
  const bookend =
    blocks.length >= 3 &&
    firstBlock.split("\n")[0].trim().length > 0 &&
    lastBlock.split("\n")[0].trim() === firstBlock.split("\n")[0].trim();
  return { text, blocks, poem, unit, keywords, firstLine, lastLine, sentences, allDevices, bookend };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

type Fact = { text: string; truth: boolean; why: string };

function buildFacts(shape: ReturnType<typeof analyzeShape>, title: string): Fact[] {
  const { blocks, unit, keywords, poem, allDevices, bookend } = shape;
  const facts: Fact[] = [
    { text: `윗글은 ${blocks.length}개의 ${josa(unit, "으로/로")} 구성되어 있다.`, truth: true, why: `빈 줄로 구분된 ${josa(unit, "이/가")} ${blocks.length}개입니다.` },
    {
      text: `윗글은 ${blocks.length + 2}개의 ${josa(unit, "으로/로")} 구성되어 있다.`,
      truth: false,
      why: `실제로는 ${blocks.length}개의 ${unit}입니다.`,
    },
    {
      text: `윗글은 ${poem ? "운문(시)" : "산문"}의 형식을 취하고 있다.`,
      truth: true,
      why: poem ? "짧은 행과 연 구분이 나타납니다." : "문장이 이어지는 문단 형식입니다.",
    },
    {
      text: `윗글은 ${poem ? "산문" : "운문(시)"}의 형식을 취하고 있다.`,
      truth: false,
      why: poem ? "행과 연으로 이루어진 운문입니다." : "문단으로 이루어진 산문입니다.",
    },
  ];
  for (const kw of keywords.slice(0, 3)) {
    const kwTopic = josa(kw, "은/는").slice(kw.length);
    facts.push({ text: `‘${kw}’${kwTopic} 윗글에서 반복적으로 쓰인 핵심어이다.`, truth: true, why: `‘${kw}’${kwTopic} 본문에 여러 번 등장합니다.` });
  }
  const absent = ["바다", "기차", "우주", "시계", "편지", "도서관", "등대"].find((w) => !shape.text.includes(w));
  if (absent)
    facts.push({
      text: `윗글에는 ‘${absent}’${hasBatchim(absent) ? "이라는" : "라는"} 소재가 등장한다.`,
      truth: false,
      why: `본문에 ‘${absent}’${josa(absent, "은/는").slice(absent.length)} 나오지 않습니다.`,
    });
  for (const d of DEVICES) {
    const has = allDevices.includes(d);
    if (has) facts.push({ text: `윗글에는 ${josa(d.name, "이/가")} 쓰인 표현이 있다.`, truth: true, why: d.note });
    else if (facts.filter((f) => !f.truth).length < 6)
      facts.push({ text: `윗글에는 ${josa(d.name, "이/가")} 두드러지게 쓰였다.`, truth: false, why: `${d.name} 표현은 확인되지 않습니다.` });
  }
  if (bookend) facts.push({ text: "처음과 끝 부분에서 유사한 구절을 반복하고 있다.", truth: true, why: "첫 연과 마지막 연이 같은 행으로 시작합니다(수미상관)." });
  if (title) facts.push({ text: `윗글의 제목은 ‘${title}’${hasBatchim(title) ? "이다" : "다"}.`, truth: true, why: "입력된 작품명입니다." });
  return facts;
}

function demoStructure(ctx: PassageContext): Structure {
  const shape = analyzeShape(ctx);
  const { blocks, unit, keywords, poem, allDevices, bookend } = shape;
  return {
    title: ctx.title || clip(shape.firstLine, 20),
    author: ctx.author || "미상",
    genre: ctx.settings.genre !== "auto" ? ctx.settings.genre : poem ? "운문(시) — 자동 추정" : "산문 — 자동 추정",
    characteristics: poem ? ["서정적", "함축적"] : ["서술적", "논리적"],
    basic_info: {
      point_of_view: poem ? `${DEMO} 시적 화자 (본문 어조로 확인)` : `${DEMO} 서술자/필자 (본문 서술 방식으로 확인)`,
      background: `${DEMO} 본문에서 시간·공간 배경을 확인해 주세요.`,
      theme: `${DEMO} ‘${keywords.slice(0, 2).join("’, ‘")}’ 중심의 주제 의식`,
      tone: allDevices.length ? allDevices.map((d) => d.name).join(", ") : `${DEMO} 담담한 어조`,
    },
    one_line_summary: `${DEMO} ${blocks.length}개의 ${unit}에 걸쳐 ‘${keywords[0] ?? "핵심 소재"}’${josa(keywords[0] ?? "소재", "을/를").slice((keywords[0] ?? "소재").length)} 중심으로 내용을 전개한 글`,
    keywords: keywords.slice(0, 5).map((term) => ({
      term,
      meaning: `${DEMO} 본문에서 반복되는 핵심어 — 의미 해석은 AI 연결 시 제공됩니다.`,
    })),
    structure_flow: blocks.slice(0, 6).map((b, i) => {
      const kw = keywords.find((k) => b.includes(k)) ?? "";
      return {
        stage: `${i + 1}${unit}`,
        summary: clip(b.replace(/\n/g, " / "), 70),
        key_symbol: kw ? `‘${kw}’` : "",
      };
    }),
    character_relation: [],
    core_conflict: null,
    exam_points: [
      ...(bookend ? ["처음과 끝의 반복(수미상관)이 주는 구조적 효과"] : []),
      ...allDevices.slice(0, 3).map((d) => `${d.name}의 표현 효과`),
      `핵심어 ‘${keywords[0] ?? "-"}’의 문맥적 의미`,
      `${unit}별 내용 전개 순서`,
    ],
  };
}

function demoAnnotation(ctx: PassageContext): Annotation {
  const shape = analyzeShape(ctx);
  const segments = shape.blocks.slice(0, 12).map((b, i) => {
    const devices = devicesIn(b);
    const reps = repeatedWords(b).slice(0, 2);
    const tags = [...devices.map((d) => d.name), ...(reps.length ? ["반복"] : [])];
    const kw = shape.keywords.find((k) => b.includes(k));
    return {
      ref: `${i + 1}${shape.unit}`,
      text: shape.poem ? b.replace(/\n/g, " / ") : clip(b, 160),
      explanation: [
        `${DEMO} 이 ${shape.unit}의 중심 어휘는 ${kw ? `‘${kw}’` : "본문 핵심어"}입니다.`,
        ...devices.map((d) => d.note),
        reps.length ? `‘${reps.join("’, ‘")}’의 반복이 리듬과 강조 효과를 만듭니다.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      devices: tags.length ? tags : ["내용 전개"],
      exam_point: devices[0] ? `${devices[0].name}의 효과를 묻는 문항` : null,
    };
  });
  return {
    overview: `${DEMO} 데모 엔진은 지문의 형태적 특징(구성, 반복, 어조 표지)을 바탕으로 해설의 틀을 만듭니다. 실제 의미 해석과 출제 포인트는 AI 엔진 연결 시 정밀하게 생성됩니다.`,
    segments,
    key_takeaways: [
      `구성: ${shape.blocks.length}개의 ${shape.unit}`,
      ...shape.allDevices.slice(0, 3).map((d) => `${d.name}: ${d.note}`),
      `핵심어: ${shape.keywords.slice(0, 4).join(", ")}`,
    ],
  };
}

function rotate<T>(arr: T[], n: number): T[] {
  const k = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

function demoMcq(ctx: PassageContext): Mcq {
  const shape = analyzeShape(ctx);
  const facts = buildFacts(shape, ctx.title);
  const truths = facts.filter((f) => f.truth);
  const falses = facts.filter((f) => !f.truth);
  const questions: Mcq["questions"] = [];
  for (let i = 0; i < ctx.settings.counts.mcq; i++) {
    const askWrong = i % 2 === 0; // 짝수 문항: '적절하지 않은 것', 홀수: '적절한 것'
    const odd = askWrong ? falses[i % falses.length] : truths[i % truths.length];
    const pool = rotate(askWrong ? truths : falses, i).filter((f) => f.text !== odd.text).slice(0, 4);
    while (pool.length < 4) pool.push({ text: `${DEMO} 보충 선지 ${pool.length + 1}`, truth: !askWrong, why: "데모 선지" });
    const answer = ((i * 2 + 2) % 5) + 1;
    const options = [...pool];
    options.splice(answer - 1, 0, odd);
    questions.push({
      type: "내용 이해",
      stem: askWrong ? "윗글에 대한 설명으로 적절하지 않은 것은?" : "윗글에 대한 설명으로 가장 적절한 것은?",
      bogi: null,
      options: options.map((o) => o.text),
      answer,
      explanation: `${odd.why}`,
      option_notes: options.map((o, idx) => (idx === answer - 1 ? `정답. ${o.why}` : o.why)),
      difficulty: i === 0 ? "하" : "중",
    });
  }
  return { questions };
}

function demoShortAnswer(ctx: PassageContext): ShortAnswer {
  const shape = analyzeShape(ctx);
  const kws = shape.keywords.length ? shape.keywords : ["핵심어"];
  return {
    questions: Array.from({ length: ctx.settings.counts.short_answer }, (_, i) => {
      const kw = kws[i % kws.length];
      return {
        stem: `윗글에서 ‘${kw}’${josa(kw, "이/가").slice(kw.length)} 지니는 의미를 문맥을 바탕으로 서술하시오.`,
        conditions: ["본문의 구절을 근거로 들 것", "두 문장 이내로 쓸 것"],
        model_answer: `${DEMO} ‘${kw}’${josa(kw, "이/가").slice(kw.length)} 쓰인 문장(“${clip(shape.sentences.find((s) => s.includes(kw)) ?? shape.firstLine, 50)}”)을 근거로 의미를 서술합니다. 모범 답안은 AI 엔진 연결 시 생성됩니다.`,
        scoring: [
          { criterion: "본문 근거를 정확히 제시함", points: 2 },
          { criterion: "문맥적 의미를 타당하게 서술함", points: 3 },
        ],
        difficulty: "중" as const,
      };
    }),
  };
}

function demoOx(ctx: PassageContext): Ox {
  const shape = analyzeShape(ctx);
  const facts = buildFacts(shape, ctx.title);
  const ordered: Fact[] = [];
  const t = facts.filter((f) => f.truth);
  const f = facts.filter((x) => !x.truth);
  for (let i = 0; ordered.length < Math.min(ctx.settings.counts.ox, facts.length); i++) {
    if (t[i]) ordered.push(t[i]);
    if (f[i] && ordered.length < ctx.settings.counts.ox) ordered.push(f[i]);
    if (!t[i] && !f[i]) break;
  }
  return {
    items: ordered.map((x) => ({
      statement: x.text,
      answer: x.truth,
      explanation: x.why,
      concept: /연|문단/.test(x.text) ? "구성" : /쓰인|표현/.test(x.text) ? "표현 방식" : "내용 확인",
    })),
  };
}

function demoVocab(ctx: PassageContext): Vocab {
  const shape = analyzeShape(ctx);
  return {
    items: shape.keywords.slice(0, ctx.settings.counts.vocab).map((answer) => ({
      answer,
      definition: `${DEMO} 지문 속 핵심 어휘입니다. 사전적 뜻풀이는 AI 엔진 연결 시 제공됩니다.`,
      context: clip(shape.sentences.find((s) => s.includes(answer)) ?? shape.firstLine, 60),
    })),
  };
}

const builders: { [K in MaterialType]: (ctx: PassageContext) => SectionOutput[K] } = {
  structure: demoStructure,
  annotation: demoAnnotation,
  mcq: demoMcq,
  short_answer: demoShortAnswer,
  ox: demoOx,
  vocab: demoVocab,
};

/* ------------------------------------------------------------------ */
/* 시험지 분석 (데모)                                                   */
/* ------------------------------------------------------------------ */

const AREA_RULES: { area: string; genre: string; pattern: RegExp }[] = [
  { area: "문법", genre: "음운", pattern: /(음운|비음화|유음화|구개음화|된소리|음절|자음|모음|탈락|첨가|축약)/ },
  { area: "문법", genre: "단어·문장", pattern: /(품사|형태소|단어|어근|접사|문장 성분|높임|시제|피동|사동|관형어|부사어)/ },
  { area: "문학", genre: "고전시가", pattern: /(시조|가사|고려가요|향가|후렴)/ },
  { area: "문학", genre: "현대시", pattern: /(화자|시어|시적|운율|연[과은을]|시구)/ },
  { area: "문학", genre: "소설", pattern: /(서술자|인물|시점|장면|사건|갈등)/ },
  { area: "화법과 작문", genre: "화법·작문", pattern: /(발표|토론|토의|면담|초고|고쳐쓰기|글쓰기)/ },
];

function demoExamReport(examText: string, title: string): ExamReport {
  const text = normalizeText(examText);
  const matches = [...text.matchAll(/(?:^|\n)\s*(\d{1,2})\s*[.)]\s+([\s\S]*?)(?=\n\s*\d{1,2}\s*[.)]\s+|$)/g)];
  const seen = new Set<number>();
  const blocks = matches
    .map((m) => ({ n: Number(m[1]), body: m[2] }))
    .filter((q) => q.n >= 1 && q.n <= 60 && !seen.has(q.n) && seen.add(q.n));
  if (blocks.length < 2) {
    throw new HttpError(422, "문항 번호(예: '1.', '2)')를 찾지 못했습니다. 시험지 본문을 문항 번호와 함께 붙여넣어 주세요.");
  }
  const questions = blocks.map(({ n, body }) => {
    const rule = AREA_RULES.find((r) => r.pattern.test(body));
    const hard = /<보기>|〈보기〉|\[보기\]/.test(body) || body.length > 600;
    const mid = /적절하지 않은|옳지 않은|추론/.test(body) || body.length > 300;
    const difficulty = (hard ? "상" : mid ? "중" : "하") as "상" | "중" | "하";
    const stem = body.split("\n").find((l) => /[?？]/.test(l)) ?? body.split("\n")[0];
    return {
      number: n,
      area: rule?.area ?? "독서",
      genre: rule?.genre ?? "비문학",
      source: "미상",
      type: /<보기>|〈보기〉/.test(body) ? "<보기> 적용" : /적절하지 않은|옳지 않은/.test(body) ? "부정 발문" : "내용 이해",
      difficulty,
      point: `${DEMO} ${clip(stem.trim(), 40)}`,
    };
  });
  const hardCount = questions.filter((q) => q.difficulty === "상").length;
  const areas = [...new Set(questions.map((q) => q.area))];
  return {
    exam_title: title || "시험지 분석 (데모)",
    overview: `${DEMO} 총 ${questions.length}문항이 확인되었으며, ${areas.join("·")} 영역이 출제되었습니다. <보기> 활용 문항과 긴 지문 문항을 고난도로 분류했습니다. 정밀 분석(지문 출처, 출제 의도)은 AI 엔진 연결 시 제공됩니다.`,
    questions,
    difficulty_comment: `${DEMO} 상 난도 ${hardCount}문항이 변별 문항으로 추정됩니다.`,
    key_findings: [
      `영역 구성: ${areas.map((a) => `${a} ${questions.filter((q) => q.area === a).length}문항`).join(", ")}`,
      `<보기> 활용 문항 ${questions.filter((q) => q.type === "<보기> 적용").length}개`,
      `부정 발문(적절하지 않은 것) ${questions.filter((q) => q.type === "부정 발문").length}개`,
    ],
    study_strategies: areas.map((area) => ({
      area,
      strategy: `${DEMO} ${area} 영역의 오답 문항을 유형별로 정리하고 같은 유형을 반복 연습합니다.`,
    })),
    consultation_guide: [
      `${DEMO} 이번 시험은 ${areas.join("·")} 영역에서 고르게 출제되었습니다.`,
      `${DEMO} 고난도 문항은 <보기> 적용과 긴 지문 독해에 집중되어 있어 해당 유형을 보완할 예정입니다.`,
    ],
  };
}

export const demoEngine: AiEngine = {
  name: "demo",

  async generateSection<T extends MaterialType>(type: T, input: PassageContext) {
    const ctx = { ...input, passage: stripRich(input.passage) }; // 서식 표기는 데모 분석에 쓰지 않음
    const sample = matchSample(ctx.passage);
    const prebuilt = sample?.content[type];
    if (prebuilt) return structuredClone(prebuilt) as unknown as SectionOutput[T];
    return builders[type](ctx);
  },

  async analyzeExam(input) {
    return demoExamReport(input.examText, input.examTitle);
  },

  async ocr() {
    throw new HttpError(
      503,
      "이미지·스캔 문서 OCR은 AI 엔진 연결(ANTHROPIC_API_KEY) 후 사용할 수 있습니다. 텍스트가 있는 PDF·HWPX·DOCX는 지금도 변환됩니다.",
    );
  },
};
