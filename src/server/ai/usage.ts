import "server-only";

/**
 * AI 사용량 기록 — Claude·Gemini API 호출마다 토큰 사용량과 추정 원가를 모읍니다.
 * 실패한 호출(거절·길이 초과)도 요금이 청구되므로 함께 기록합니다.
 */

/**
 * 100만 토큰당 USD (Anthropic 1st-party API 정가, 2026-10 기준). 가격이 바뀌면 여기만 고칩니다.
 * 캐시 읽기 단가가 공개 표에 없는 모델은 입력 단가의 10%로 두었습니다.
 */
export const MODEL_PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  // Gemini API 유료 등급 정가 (2026-10 기준). 무료 등급으로 쓰는 동안 실제 청구는 0원이고, 이 값은 유료 전환 시 예상치입니다.
  "gemini-3.8-flash": { input: 0.75, output: 3.75, cacheRead: 0.075 },
  "gemini-3.6-flash": { input: 0.75, output: 3.75, cacheRead: 0.075 },
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5, cacheRead: 0.03 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5, cacheRead: 0.025 },
  "gemini-3-flash-preview": { input: 0.5, output: 3, cacheRead: 0.05 },
  "gemini-3.1-pro-preview": { input: 2, output: 12, cacheRead: 0.2 },
  "gemini-2.5-pro": { input: 1.25, output: 10, cacheRead: 0.125 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5, cacheRead: 0.03 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4, cacheRead: 0.01 },
};
/** 5분 캐시 쓰기는 입력 단가의 1.25배 */
const CACHE_WRITE_MULTIPLIER = 1.25;

export type UsageFeature = "structure" | "annotation" | "mcq" | "short_answer" | "ox" | "vocab" | "exam_report" | "ocr";
export type UsageStatus = "ok" | "refusal" | "max_tokens" | "invalid_output";

export type UsageEntry = {
  feature: UsageFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  durationMs: number;
  status: UsageStatus;
  /** 알 수 없는 모델이면 null */
  costUsd: number | null;
};

type ApiUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** 토큰 수 → 추정 원가(USD). 사고(thinking) 토큰은 출력 토큰에 포함되어 청구됩니다. */
export function estimateCostUsd(model: string, u: Pick<UsageEntry, "inputTokens" | "outputTokens" | "cacheWriteTokens" | "cacheReadTokens">) {
  const p = MODEL_PRICES[model];
  if (!p) return null;
  const usd =
    (u.inputTokens * p.input + u.cacheWriteTokens * p.input * CACHE_WRITE_MULTIPLIER + u.cacheReadTokens * p.cacheRead + u.outputTokens * p.output) /
    1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

/**
 * API 응답 → 사용량 기록 항목.
 * 거절 시 서버가 대체 모델로 다시 돌린 경우, 최종 응답 모델 기준으로 계산하므로 근사치입니다.
 */
export function usageFromMessage(feature: UsageFeature, message: { model: string; usage: ApiUsage }, durationMs: number, status: UsageStatus): UsageEntry {
  const entry = {
    feature,
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    durationMs,
    status,
  };
  return { ...entry, costUsd: estimateCostUsd(entry.model, entry) };
}

/** 토큰 수를 직접 아는 경우(Gemini 등)의 사용량 기록 항목 */
export function usageEntry(
  feature: UsageFeature,
  model: string,
  tokens: Pick<UsageEntry, "inputTokens" | "outputTokens" | "cacheReadTokens">,
  durationMs: number,
  status: UsageStatus,
): UsageEntry {
  const entry = { feature, model, ...tokens, cacheWriteTokens: 0, durationMs, status };
  return { ...entry, costUsd: estimateCostUsd(model, entry) };
}

/** 한 번의 작업(자료 생성 등)에서 일어난 AI 호출을 모으는 그릇 */
export class UsageLog {
  readonly entries: UsageEntry[] = [];
  add(entry: UsageEntry) {
    this.entries.push(entry);
  }
}
