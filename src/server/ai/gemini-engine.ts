import "server-only";

/**
 * Gemini 엔진 — Google AI Studio에서 발급한 API 키(GEMINI_API_KEY)로 동작합니다. 무료 등급으로 테스트할 수 있습니다.
 *
 * - REST generateContent를 직접 호출합니다(별도 SDK 없음).
 * - 구조화 출력: responseMimeType=application/json + responseJsonSchema(Zod 스키마에서 변환).
 *   서버가 스키마 옵션을 받지 않으면 스키마를 지시문에 넣는 JSON 모드로 자동 전환합니다.
 * - 응답은 항상 Zod로 다시 검증하고, 형식이 깨지면 한 번 더 요청합니다.
 * - 무료 등급의 분당 요청 제한(429)에 대비해 동시 요청 수를 제한하고, 안내된 대기 시간만큼 기다렸다 재시도합니다.
 */
import { z } from "zod";

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
import { usageEntry, type UsageFeature, type UsageLog, type UsageStatus } from "./usage";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_OUTPUT_TOKENS = 65536;
const REQUEST_TIMEOUT_MS = 180_000;
/** 429·일시 오류 재시도 (무료 등급은 분 단위 제한이라 대기 시간이 깁니다) */
const MAX_ATTEMPTS = 4;
const MAX_WAIT_MS = 45_000;

const SECTION_SCHEMAS = {
  structure: StructureSchema,
  annotation: AnnotationSchema,
  mcq: McqSchema,
  short_answer: ShortAnswerSchema,
  ox: OxSchema,
  vocab: VocabSchema,
} satisfies Record<MaterialType, z.ZodType>;

/* ------------------------------------------------------------------ */
/* 스키마 변환                                                          */
/* ------------------------------------------------------------------ */

const SAFE_INT = Number.MAX_SAFE_INTEGER;

/** Zod → Gemini가 받는 JSON Schema 부분 집합 ($schema·정수 기본 범위 제거, anyOf+null → type 배열) */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "$schema") continue;
      if ((k === "minimum" || k === "maximum") && Math.abs(Number(v)) >= SAFE_INT) continue;
      out[k] = clean(v);
    }
    const anyOf = out.anyOf as Record<string, unknown>[] | undefined;
    if (anyOf?.length === 2 && anyOf.some((s) => s.type === "null")) {
      const other = anyOf.find((s) => s.type !== "null")!;
      delete out.anyOf;
      return { ...out, ...other, type: [other.type, "null"] };
    }
    return out;
  };
  return clean(z.toJSONSchema(schema)) as Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* 호출                                                                 */
/* ------------------------------------------------------------------ */

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; cachedContentTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
};

type GeminiError = { error?: { code?: number; message?: string; status?: string; details?: { "@type"?: string; retryDelay?: string }[] } };

const BLOCKED = new Set(["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "LANGUAGE", "OTHER"]);

/** 무료 등급 분당 요청 제한에 맞춰 동시에 보내는 요청 수를 제한합니다. */
let running = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= env.geminiConcurrency) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 서버가 알려 준 재시도 대기 시간("12s", "1.5s") */
function retryDelayMs(body: GeminiError, attempt: number) {
  const hint = body.error?.details?.find((d) => d.retryDelay)?.retryDelay;
  const sec = hint ? Number.parseFloat(hint) : Number.NaN;
  const ms = Number.isFinite(sec) ? sec * 1000 : 2000 * 2 ** attempt;
  return Math.min(MAX_WAIT_MS, Math.max(0, ms));
}

/** 서버가 responseJsonSchema를 받지 않으면 이후로는 지시문 기반 JSON 모드로 동작합니다. */
let schemaOptionSupported = true;

async function post(body: Record<string, unknown>): Promise<GeminiResponse> {
  if (!env.geminiApiKey) throw new HttpError(503, "Gemini API 키가 설정되지 않았습니다. 서버의 GEMINI_API_KEY 설정을 확인해 주세요.");
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/models/${encodeURIComponent(env.geminiModel)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiApiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt + 1 < MAX_ATTEMPTS && !(err instanceof DOMException && err.name === "TimeoutError")) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw new HttpError(504, "AI 응답이 너무 오래 걸립니다. 잠시 후 다시 시도해 주세요.");
    }
    if (res.ok) return (await res.json()) as GeminiResponse;

    const err = (await res.json().catch(() => ({}))) as GeminiError;
    const message = err.error?.message ?? "";
    if ((res.status === 429 || res.status >= 500) && attempt + 1 < MAX_ATTEMPTS) {
      await sleep(retryDelayMs(err, attempt));
      continue;
    }
    if (res.status === 429) {
      throw new HttpError(429, "Gemini 무료 사용량 한도에 도달했습니다. 1분쯤 뒤에 다시 시도하거나, 하루 한도라면 내일 다시 시도해 주세요.");
    }
    if (res.status === 401 || res.status === 403 || /API key/i.test(message)) {
      throw new HttpError(503, "Gemini API 키 인증에 실패했습니다. 서버의 GEMINI_API_KEY 설정을 확인해 주세요.");
    }
    if (res.status === 404) {
      throw new HttpError(503, `Gemini 모델(${env.geminiModel})을 찾을 수 없습니다. CLASSPICK_GEMINI_MODEL 설정을 확인해 주세요.`);
    }
    if (res.status === 400) throw new SchemaOptionError(message);
    throw new HttpError(502, "AI 엔진에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

class SchemaOptionError extends Error {}

function usageOf(feature: UsageFeature, data: GeminiResponse, durationMs: number, status: UsageStatus) {
  const u = data.usageMetadata ?? {};
  const cached = u.cachedContentTokenCount ?? 0;
  return usageEntry(
    feature,
    env.geminiModel,
    {
      inputTokens: Math.max(0, (u.promptTokenCount ?? 0) - cached),
      cacheReadTokens: cached,
      // 사고(thinking) 토큰도 출력 단가로 청구됩니다.
      outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
    },
    durationMs,
    status,
  );
}

/** 응답 → 글자 (사고 과정 부분은 제외) + 상태 */
function readResponse(data: GeminiResponse): { text: string; status: UsageStatus } {
  if (data.promptFeedback?.blockReason) return { text: "", status: "refusal" };
  const candidate = data.candidates?.[0];
  const reason = candidate?.finishReason ?? "STOP";
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
  if (reason === "MAX_TOKENS") return { text, status: "max_tokens" };
  if (BLOCKED.has(reason)) return { text, status: "refusal" };
  return { text, status: "ok" };
}

/** ```json … ``` 같은 감싸기를 걷어 내고 JSON으로 읽습니다. */
function parseJson(text: string): unknown {
  const body = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(body);
}

async function structuredCall<T>(feature: UsageFeature, log: UsageLog | undefined, schema: z.ZodType<T>, system: string, parts: Part[]): Promise<T> {
  const jsonSchema = toGeminiSchema(schema);
  const build = (extra: Part[]) => {
    const withSchema = schemaOptionSupported;
    const instruction: Part[] = withSchema
      ? []
      : [{ text: `다음 JSON 스키마에 정확히 맞는 JSON 하나만 출력하세요. 설명이나 코드 블록 표시는 쓰지 마세요.\n${JSON.stringify(jsonSchema)}` }];
    return {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [...parts, ...instruction, ...extra] }],
      generationConfig: {
        responseMimeType: "application/json",
        ...(withSchema && { responseJsonSchema: jsonSchema }),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    };
  };

  let retryNote: Part[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    let data: GeminiResponse;
    try {
      data = await withSlot(() => post(build(retryNote)));
    } catch (err) {
      // 스키마 옵션을 지원하지 않는 모델·버전이면 JSON 모드로 한 번 더
      if (err instanceof SchemaOptionError && schemaOptionSupported && /schema|Unknown name|Invalid JSON payload/i.test(err.message)) {
        schemaOptionSupported = false;
        attempt--;
        continue;
      }
      if (err instanceof SchemaOptionError) throw new HttpError(422, `AI 요청이 거부되었습니다: ${err.message}`);
      throw err;
    }
    const { text, status } = readResponse(data);
    if (status === "refusal") {
      log?.add(usageOf(feature, data, Date.now() - started, status));
      throw new HttpError(422, "AI가 이 지문에 대한 자료 생성을 진행하지 못했습니다. 지문 내용을 확인해 주세요.");
    }
    if (status === "max_tokens") {
      log?.add(usageOf(feature, data, Date.now() - started, status));
      throw new HttpError(422, "지문이 너무 길어 자료를 완성하지 못했습니다. 지문을 나누어 생성해 주세요.");
    }
    let parsed: z.ZodSafeParseResult<T> | null = null;
    try {
      parsed = schema.safeParse(parseJson(text));
    } catch {
      parsed = null;
    }
    log?.add(usageOf(feature, data, Date.now() - started, parsed?.success ? "ok" : "invalid_output"));
    if (parsed?.success) return parsed.data;
    retryNote = [{ text: "직전 응답이 요구한 JSON 형식에 맞지 않았습니다. 스키마의 모든 필수 항목을 채운 올바른 JSON만 다시 출력하세요." }];
  }
  throw new HttpError(502, "AI 응답 형식을 해석하지 못했습니다. 다시 시도해 주세요.");
}

export const geminiEngine: AiEngine = {
  name: "gemini",

  async generateSection<T extends MaterialType>(type: T, ctx: PassageContext, log?: UsageLog) {
    const schema = SECTION_SCHEMAS[type] as unknown as z.ZodType<SectionOutput[T]>;
    return structuredCall(type, log, schema, PASSAGE_SYSTEM_PROMPT, [
      { text: `<passage>\n${ctx.passage}\n</passage>` },
      { text: buildPassageUserPrompt(type, ctx) },
    ]);
  },

  async analyzeExam(input, log) {
    return structuredCall("exam_report", log, ExamReportSchema, EXAM_SYSTEM_PROMPT, [
      { text: `<exam>\n${input.examText}\n</exam>` },
      { text: buildExamUserPrompt(input) },
    ]);
  },

  async ocr(file: UploadedFile, log?: UsageLog) {
    const mimeType = mediaTypeOf(file);
    if (!mimeType) throw new HttpError(415, "OCR을 지원하지 않는 파일 형식입니다.");
    const started = Date.now();
    const data = await withSlot(() =>
      post({
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: Buffer.from(file.bytes).toString("base64") } }, { text: OCR_PROMPT }] }],
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
      }).catch((err) => {
        if (err instanceof SchemaOptionError) throw new HttpError(422, `이 문서는 OCR 처리할 수 없습니다: ${err.message}`);
        throw err;
      }),
    );
    const { text, status } = readResponse(data);
    log?.add(usageOf("ocr", data, Date.now() - started, status));
    if (status === "refusal") throw new HttpError(422, "이 문서는 OCR 처리할 수 없습니다.");
    if (!text) throw new HttpError(422, "문서에서 텍스트를 찾지 못했습니다.");
    return text;
  },
};
