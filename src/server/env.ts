import "server-only";

/** 대시보드에 값을 붙여 넣을 때 섞이기 쉬운 앞뒤 공백·따옴표를 걷어 냅니다. */
const cleanSecret = (v: string | undefined) => (v ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");

/**
 * 서버 환경 변수 (모두 선택 사항 — 미설정 시 로컬 데모로 동작)
 */
export const env = {
  databasePath: process.env.DATABASE_PATH ?? "./data/classpick.db",
  /** 호스팅 libSQL(Turso 등) 주소. 설정하면 로컬 파일 대신 이 DB를 씁니다 (재배포해도 데이터 유지). */
  databaseUrl: cleanSecret(process.env.DATABASE_URL),
  databaseAuthToken: cleanSecret(process.env.DATABASE_AUTH_TOKEN),
  /** auto: ANTHROPIC_API_KEY가 있으면 Claude, 없으면 데모 엔진 */
  aiMode: (process.env.CLASSPICK_AI_MODE ?? "auto") as "auto" | "claude" | "demo",
  aiModel: process.env.CLASSPICK_AI_MODEL ?? "claude-opus-5-5",
  aiEffort: (process.env.CLASSPICK_AI_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max",
  hasAnthropicCredentials: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? "mock") as "mock" | "toss",
  tossSecretKey: process.env.TOSS_SECRET_KEY ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** 운영자 화면(/app/usage)에 들어갈 수 있는 이메일 (쉼표로 구분) */
  adminEmails: (process.env.CLASSPICK_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  /**
   * 실제 AI(Claude)를 쓸 수 있는 계정 범위. 체험(게스트) 계정은 어느 경우에도 데모 엔진입니다.
   * - members: 가입한 모든 계정 (기본)
   * - admins:  운영자·마스터 계정만 (비공개 테스트 기간에 비용을 막을 때)
   */
  aiUsers: (process.env.CLASSPICK_AI_USERS === "admins" ? "admins" : "members") as "members" | "admins",
  /** 마스터 계정: 가입 절차 없이 환경 변수로만 존재하는 운영·테스트용 선생님 계정 */
  masterEmail: cleanSecret(process.env.CLASSPICK_MASTER_EMAIL).toLowerCase(),
  masterPassword: cleanSecret(process.env.CLASSPICK_MASTER_PASSWORD),
  /** 원가를 원화로 보여 줄 때 쓰는 환율 (원/달러) */
  usdKrw: Number(process.env.CLASSPICK_USD_KRW ?? 1400) || 1400,
};

/** 마스터 계정이 켜져 있는지 (비밀번호가 짧으면 안전을 위해 꺼 둡니다) */
export const masterEnabled = () => Boolean(env.masterEmail && env.masterPassword.length >= 12);

/** 운영자 이메일: CLASSPICK_ADMIN_EMAILS + 마스터 계정 */
export const isOperatorEmail = (email: string) => {
  const e = email.toLowerCase();
  return env.adminEmails.includes(e) || (masterEnabled() && e === env.masterEmail);
};

/** 서버 전체 설정 기준 엔진 (계정별 제한은 server/ai/access.ts) */
export function aiEngine(): "claude" | "demo" {
  if (env.aiMode === "demo") return "demo";
  if (env.aiMode === "claude") return "claude";
  return env.hasAnthropicCredentials ? "claude" : "demo";
}
