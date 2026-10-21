import "server-only";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/server/db/client";
import { aiEngine, env, isOperatorEmail, type AiEngineName } from "@/server/env";

type AiUser = { email: string; isGuest: boolean };

/** 데모 엔진으로 동작하는 이유 (실제 AI면 null) */
export type DemoReason = "no_key" | "guest" | "restricted";

/**
 * 계정별 AI 엔진 결정 (실제 AI는 서버 설정에 따라 Claude 또는 Gemini).
 * - API 키가 없으면 모두 데모
 * - 체험(게스트) 계정은 키가 있어도 항상 데모 → 외부 테스트로 API 요금이 나가지 않음
 * - CLASSPICK_AI_USERS=admins 이면 운영자·마스터 계정만 실제 AI
 */
export function demoReasonFor(user: AiUser): DemoReason | null {
  if (aiEngine() === "demo") return "no_key";
  if (user.isGuest) return "guest";
  if (env.aiUsers === "admins" && !isOperatorEmail(user.email)) return "restricted";
  return null;
}

export const engineFor = (user: AiUser): AiEngineName => (demoReasonFor(user) ? "demo" : aiEngine());

export async function engineForUserId(userId: string) {
  const user = await (await getDb())
    .select({ email: schema.users.email, isGuest: schema.users.isGuest })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();
  // 사용자를 찾지 못하면 비용이 나가지 않는 쪽으로
  return user ? engineFor(user) : "demo";
}

/** 화면 안내 문구 */
export const DEMO_NOTICE: Record<DemoReason, string> = {
  no_key: "데모 엔진 모드 · 서버에 AI API 키(Claude 또는 Gemini)가 설정되면 실제 AI로 생성됩니다",
  guest: "체험 계정은 실제 AI 대신 데모 엔진으로 동작해요 · 예시 지문은 완성된 결과, 그 밖의 지문은 형태 분석 기반의 틀이 생성됩니다",
  restricted: "지금은 비공개 테스트 기간이라 데모 엔진으로 동작해요 · 예시 지문은 완성된 결과, 그 밖의 지문은 형태 분석 기반의 틀이 생성됩니다",
};
