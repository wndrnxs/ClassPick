import "server-only";

import { toChoseong } from "@/lib/hangul";
import { stripRich } from "@/lib/rich-text";
import type {
  AnalyzeExamInput,
  CreateMaterialInput,
  ExamReport,
  MaterialType,
  Mcq,
  PassageContent,
} from "@/lib/schemas";
import type { UploadedFile } from "@/server/ingest/extract";
import { claudeEngine } from "./claude-engine";
import { demoEngine } from "./demo-engine";
import { geminiEngine } from "./gemini-engine";
import type { AiEngine, PassageContext, SectionOutput } from "./types";
import type { UsageLog } from "./usage";

/** engine: 계정별로 정한 엔진 (server/ai/access.ts의 engineFor) */
export type AiRunOptions = { engine: AiEngine["name"]; log?: UsageLog };

const ENGINES: Record<AiEngine["name"], AiEngine> = { claude: claudeEngine, gemini: geminiEngine, demo: demoEngine };
const getEngine = (name: AiEngine["name"]): AiEngine => ENGINES[name];

/* ------------------------------------------------------------------ */
/* 후처리: AI 출력의 형식을 서비스 규칙에 맞게 보정합니다.                    */
/* ------------------------------------------------------------------ */

const OPTION_PREFIX = /^\s*(?:[①②③④⑤]|[1-5][.)]|\([1-5]\))\s*/;

function normalizeMcq(mcq: Mcq, limit: number): Mcq {
  return {
    questions: mcq.questions
      .filter((q) => q.options.length >= 5)
      .slice(0, limit)
      .map((q) => {
        const options = q.options.slice(0, 5).map((o) => o.replace(OPTION_PREFIX, "").trim());
        const answer = Math.min(5, Math.max(1, Math.round(q.answer)));
        const notes = Array.from({ length: 5 }, (_, i) => q.option_notes[i] ?? "");
        return { ...q, options, answer, option_notes: notes };
      }),
  };
}

function postProcess<T extends MaterialType>(type: T, out: SectionOutput[T], ctx: PassageContext): PassageContent[T] {
  const counts = ctx.settings.counts;
  switch (type) {
    case "mcq":
      return normalizeMcq(out as Mcq, counts.mcq) as PassageContent[T];
    case "short_answer": {
      const v = out as SectionOutput["short_answer"];
      return { questions: v.questions.slice(0, counts.short_answer) } as PassageContent[T];
    }
    case "ox": {
      const v = out as SectionOutput["ox"];
      return { items: v.items.slice(0, counts.ox) } as PassageContent[T];
    }
    case "vocab": {
      // 초성은 모델이 아니라 서버에서 결정적으로 계산합니다.
      const v = out as SectionOutput["vocab"];
      return {
        items: v.items.slice(0, counts.vocab).map((item) => {
          const answer = item.answer.replace(/\s+/g, "");
          return { ...item, answer, initials: toChoseong(answer) };
        }),
      } as PassageContent[T];
    }
    default:
      return out as PassageContent[T];
  }
}

/** 앞에서 n글자 (옛한글처럼 자모 여러 개가 한 글자인 경우도 글자 단위로 자름) */
function firstChars(text: string, n: number) {
  return [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(text)]
    .slice(0, n)
    .map((s) => s.segment)
    .join("");
}

/** AI가 지문의 서식 표기(<b>·<u>·<box>)를 결과에 옮겨 적었을 때 글자만 남깁니다. */
function stripMarkupDeep<T>(value: T): T {
  if (typeof value === "string") return stripRich(value) as T;
  if (Array.isArray(value)) return value.map(stripMarkupDeep) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripMarkupDeep(v)])) as T;
  return value;
}

/** 선택한 자료 유형들을 병렬로 생성합니다. 한 유형이라도 실패하면 전체를 실패로 처리합니다(토큰 환불). */
export async function generatePassageContent(input: CreateMaterialInput, { engine: name, log }: AiRunOptions) {
  const engine = getEngine(name);
  const ctx: PassageContext = {
    passage: input.passage,
    title: input.title,
    author: input.author,
    sourceNote: input.sourceNote,
    settings: input.settings,
  };
  // 하나가 실패해도 나머지 호출은 이미 요금이 나가는 중이므로, 모두 끝난 뒤 실패 처리합니다(사용량 기록 누락 방지).
  const settled = await Promise.allSettled(
    input.types.map(async (type) => [type, postProcess(type, stripMarkupDeep(await engine.generateSection(type, ctx, log)), ctx)] as const),
  );
  const entries = settled.map((r) => {
    if (r.status === "rejected") throw r.reason;
    return r.value;
  });
  const content = Object.fromEntries(entries) as PassageContent;
  const title = input.title || content.structure?.title || firstChars(stripRich(input.passage).trim().split("\n")[0], 24).trim();
  const author = input.author || (content.structure?.author && content.structure.author !== "미상" ? content.structure.author : "");
  return { engine: engine.name, content, title, author };
}

export async function analyzeExamPaper(input: AnalyzeExamInput, { engine: name, log }: AiRunOptions): Promise<{ engine: AiEngine["name"]; report: ExamReport }> {
  const engine = getEngine(name);
  const report = await engine.analyzeExam(input, log);
  report.questions.sort((a, b) => a.number - b.number);
  return { engine: engine.name, report };
}

/** 텍스트 레이어가 없는 스캔 PDF·이미지를 AI OCR로 변환합니다. */
export async function ocrWithAi(file: UploadedFile, { engine: name, log }: AiRunOptions): Promise<{ engine: AiEngine["name"]; text: string }> {
  const engine = getEngine(name);
  return { engine: engine.name, text: await engine.ocr(file, log) };
}
