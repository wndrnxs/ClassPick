import "server-only";

import { toChoseong } from "@/lib/hangul";
import type {
  AnalyzeExamInput,
  CreateMaterialInput,
  ExamReport,
  MaterialType,
  Mcq,
  PassageContent,
} from "@/lib/schemas";
import { aiEngine } from "@/server/env";
import type { UploadedFile } from "@/server/ingest/extract";
import { claudeEngine } from "./claude-engine";
import { demoEngine } from "./demo-engine";
import type { AiEngine, PassageContext, SectionOutput } from "./types";

export function getEngine(): AiEngine {
  return aiEngine() === "claude" ? claudeEngine : demoEngine;
}

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

/** 선택한 자료 유형들을 병렬로 생성합니다. 한 유형이라도 실패하면 전체를 실패로 처리합니다(연필 환불). */
export async function generatePassageContent(input: CreateMaterialInput) {
  const engine = getEngine();
  const ctx: PassageContext = {
    passage: input.passage,
    title: input.title,
    author: input.author,
    sourceNote: input.sourceNote,
    settings: input.settings,
  };
  const entries = await Promise.all(
    input.types.map(async (type) => [type, postProcess(type, await engine.generateSection(type, ctx), ctx)] as const),
  );
  const content = Object.fromEntries(entries) as PassageContent;
  const title = input.title || content.structure?.title || input.passage.split("\n")[0].slice(0, 24).trim();
  const author = input.author || (content.structure?.author && content.structure.author !== "미상" ? content.structure.author : "");
  return { engine: engine.name, content, title, author };
}

export async function analyzeExamPaper(input: AnalyzeExamInput): Promise<{ engine: AiEngine["name"]; report: ExamReport }> {
  const engine = getEngine();
  const report = await engine.analyzeExam(input);
  report.questions.sort((a, b) => a.number - b.number);
  return { engine: engine.name, report };
}

/** 텍스트 레이어가 없는 스캔 PDF·이미지를 AI OCR로 변환합니다. */
export async function ocrWithAi(file: UploadedFile): Promise<{ engine: AiEngine["name"]; text: string }> {
  const engine = getEngine();
  return { engine: engine.name, text: await engine.ocr(file) };
}
