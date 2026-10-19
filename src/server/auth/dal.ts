import "server-only";

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { getDb, schema } from "@/server/db/client";
import { isOperatorEmail } from "@/server/env";
import { HttpError } from "@/server/http";
import { readSessionUserId } from "./session";

/** 클라이언트로 내보내도 안전한 사용자 정보 */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "teacher" | "instructor" | "other" | "student";
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

export const isStudent = (user: Pick<SessionUser, "role">) => user.role === "student";

/** 로그인 후 역할별 첫 화면 */
export const homePathFor = (user: Pick<SessionUser, "role">) => (isStudent(user) ? "/student" : "/app");

/**
 * 페이지용(교사 워크스페이스): 로그인하지 않았으면 로그인으로, 학생이면 학생 화면으로 보냅니다.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isStudent(user)) redirect("/student");
  return user;
}

/** 운영자: CLASSPICK_ADMIN_EMAILS에 등록된 선생님 계정 또는 마스터 계정 */
export const isAdmin = (user: Pick<SessionUser, "email" | "role">) => !isStudent(user) && isOperatorEmail(user.email);

/** 페이지용(운영자 화면): 운영자가 아니면 페이지가 없는 것처럼 보입니다. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();
  return user;
}

/** 페이지용(학생 포털): 학생 계정만 접근할 수 있습니다. */
export async function requireStudent(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/student");
  if (!isStudent(user)) redirect("/app");
  return user;
}

/** API용(교사 기능): 로그인하지 않았으면 401, 학생 계정이면 403. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  if (isStudent(user)) throw new HttpError(403, "선생님 계정에서만 사용할 수 있는 기능입니다.");
  return user;
}

/** API용(학생 기능) */
export async function requireApiStudent(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  if (!isStudent(user)) throw new HttpError(403, "학생 계정에서만 사용할 수 있는 기능입니다.");
  return user;
}
