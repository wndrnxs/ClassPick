import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { getDb, schema } from "@/server/db/client";
import { env } from "@/server/env";

export const SESSION_COOKIE = "cp_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30일

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** 세션을 만들고 httpOnly 쿠키로 토큰을 내려 줍니다. DB에는 토큰 해시만 저장합니다. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  getDb().insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt, createdAt: new Date() }).run();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) getDb().delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token))).run();
  store.delete(SESSION_COOKIE);
}

/** 쿠키의 세션 토큰으로 사용자 ID를 찾습니다. 만료·위조 토큰은 null. */
export async function readSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // 세션 만료 비교(현재 시각)는 요청 시점에만 수행합니다.
  await connection();
  const row = getDb()
    .select({ userId: schema.sessions.userId })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .get();
  return row?.userId ?? null;
}
