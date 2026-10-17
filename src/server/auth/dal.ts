import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb, schema } from "@/server/db/client";
import { HttpError } from "@/server/http";
import { readSessionUserId } from "./session";

/** 클라이언트로 내보내도 안전한 사용자 정보 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "teacher" | "instructor" | "other";
  organization: string;
  plan: "free" | "standard" | "academy";
  points: number;
  isGuest: boolean;
};

/**
 * Data Access Layer: 현재 요청의 사용자.
 * 요청 단위로 메모이즈되며, 모든 사용자 데이터 접근은 이 함수를 거칩니다.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const userId = await readSessionUserId();
  if (!userId) return null;
  const user = await (await getDb()).select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: user.organization,
    plan: user.plan,
    points: user.points,
    isGuest: user.isGuest,
  };
});

/** 페이지용: 로그인하지 않았으면 로그인 페이지로 보냅니다. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** API용: 로그인하지 않았으면 401을 던집니다. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  return user;
}
