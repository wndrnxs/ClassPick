import "server-only";

/**
 * 서버 환경 변수 (모두 선택 사항 — 미설정 시 로컬 데모로 동작)
 */
export const env = {
  databasePath: process.env.DATABASE_PATH ?? "./data/classpick.db",
  /** auto: ANTHROPIC_API_KEY가 있으면 Claude, 없으면 데모 엔진 */
  aiMode: (process.env.CLASSPICK_AI_MODE ?? "auto") as "auto" | "claude" | "demo",
  aiModel: process.env.CLASSPICK_AI_MODEL ?? "claude-opus-5-5",
  aiEffort: (process.env.CLASSPICK_AI_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max",
  hasAnthropicCredentials: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "mock") as "mock" | "toss",
  tossSecretKey: process.env.TOSS_SECRET_KEY ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

export function aiEngine(): "claude" | "demo" {
  if (env.aiMode === "demo") return "demo";
  if (env.aiMode === "claude") return "claude";
  return env.hasAnthropicCredentials ? "claude" : "demo";
}
