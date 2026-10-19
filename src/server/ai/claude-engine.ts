import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

import {
  AnnotationSchema,
  ExamReportSchema,
  McqSchema,
  OxSchema,
  ShortAnswerSchema,
  StructureSchema,
  VocabSchema,
  type MaterialType,
} from "@/lib/schemas";
import { env } from "@/server/env";
import { HttpError } from "@/server/http";
import { mediaTypeOf, type UploadedFile } from "@/server/ingest/extract";
import {
  buildExamUserPrompt,
  buildPassageUserPrompt,
  EXAM_SYSTEM_PROMPT,
  OCR_PROMPT,
  PASSAGE_SYSTEM_PROMPT,
} from "./prompts";
import type { AiEngine, PassageContext, SectionOutput } from "./types";
import { usageFromMessage, type UsageFeature, type UsageLog, type UsageStatus } from "./usage";

const SECTION_SCHEMAS = {
  structure: StructureSchema,
  annotation: AnnotationSchema,
  mcq: McqSchema,
  short_answer: ShortAnswerSchema,
  ox: OxSchema,
  vocab: VocabSchema,
} satisfies Record<MaterialType, z.ZodType>;

/** 정책상 거절 시 서버 측에서 기본 대체 모델로 재시도합니다. */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ maxRetries: 2 }));

function toHttpError(err: unknown): never {
  if (err instanceof HttpError) throw err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    throw new HttpError(503, "AI 엔진 인증에 실패했습니다. 서버의 ANTHROPIC_API_KEY 설정을 확인해 주세요.");
  }
  if (err instanceof Anthropic.RateLimitError) {
    throw new HttpError(429, "AI 요청이 많아 잠시 대기 중입니다. 1분 후 다시 시도해 주세요.");
  }
  if (err instanceof Anthropic.BadRequestError) {
    throw new HttpError(422, `AI 요청이 거부되었습니다: ${err.message}`);
  }
  if (err instanceof Anthropic.APIError) {
    throw new HttpError(502, "AI 엔진에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
  throw err;
}

async function structuredCall<T>(
  feature: UsageFeature,
  log: UsageLog | undefined,
  schema: z.ZodType<T>,
  system: string,
  content: Anthropic.Beta.BetaContentBlockParam[],
): Promise<T> {
  const started = Date.now();
  try {
    const stream = getClient().beta.messages.stream({
      model: env.aiModel,
      max_tokens: 32000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: env.aiEffort, format: betaZodOutputFormat(schema) },
      // 시스템 프롬프트는 고정 → 캐시 접두부
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
    });
    const message = await stream.finalMessage();
    // 거절·길이 초과로 실패해도 요금은 청구되므로 판정 전에 먼저 기록합니다.
    const status: UsageStatus =
      message.stop_reason === "refusal" ? "refusal" : message.stop_reason === "max_tokens" ? "max_tokens" : message.parsed_output ? "ok" : "invalid_output";
    log?.add(usageFromMessage(feature, message, Date.now() - started, status));
    if (message.stop_reason === "refusal") {
      throw new HttpError(422, "AI가 이 지문에 대한 자료 생성을 진행하지 못했습니다. 지문 내용을 확인해 주세요.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new HttpError(422, "지문이 너무 길어 자료를 완성하지 못했습니다. 지문을 나누어 생성해 주세요.");
    }
    if (!message.parsed_output) {
      throw new HttpError(502, "AI 응답 형식을 해석하지 못했습니다. 다시 시도해 주세요.");
    }
    return message.parsed_output as T;
  } catch (err) {
    toHttpError(err);
  }
}

export const claudeEngine: AiEngine = {
  name: "claude",

  async generateSection<T extends MaterialType>(type: T, ctx: PassageContext, log?: UsageLog) {
    const schema = SECTION_SCHEMAS[type] as unknown as z.ZodType<SectionOutput[T]>;
    return structuredCall(type, log, schema, PASSAGE_SYSTEM_PROMPT, [
      // 지문 블록을 앞에 두어 같은 지문에 대한 후속 요청이 캐시를 재사용하도록 합니다.
      { type: "text", text: `<passage>\n${ctx.passage}\n</passage>`, cache_control: { type: "ephemeral" } },
      { type: "text", text: buildPassageUserPrompt(type, ctx) },
    ]);
  },

  async analyzeExam(input, log) {
    return structuredCall("exam_report", log, ExamReportSchema, EXAM_SYSTEM_PROMPT, [
      { type: "text", text: `<exam>\n${input.examText}\n</exam>` },
      { type: "text", text: buildExamUserPrompt(input) },
    ]);
  },

  async ocr(file: UploadedFile, log?: UsageLog) {
    const mediaType = mediaTypeOf(file);
    if (!mediaType) throw new HttpError(415, "OCR을 지원하지 않는 파일 형식입니다.");
    const data = Buffer.from(file.bytes).toString("base64");
    const source: Anthropic.Beta.BetaContentBlockParam =
      mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
        : { type: "image", source: { type: "base64", media_type: mediaType, data } };
    const started = Date.now();
    try {
      const stream = getClient().beta.messages.stream({
        model: env.aiModel,
        max_tokens: 64000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        messages: [{ role: "user", content: [source, { type: "text", text: OCR_PROMPT }] }],
      });
      const message = await stream.finalMessage();
      log?.add(
        usageFromMessage("ocr", message, Date.now() - started, message.stop_reason === "refusal" ? "refusal" : message.stop_reason === "max_tokens" ? "max_tokens" : "ok"),
      );
      if (message.stop_reason === "refusal") throw new HttpError(422, "이 문서는 OCR 처리할 수 없습니다.");
      const text = message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) throw new HttpError(422, "문서에서 텍스트를 찾지 못했습니다.");
      return text;
    } catch (err) {
      toHttpError(err);
    }
  },
};
