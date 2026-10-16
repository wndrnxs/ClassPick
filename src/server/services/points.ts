import "server-only";

import { randomUUID } from "node:crypto";

import { desc, eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/server/db/client";
import type { DB } from "@/server/db/client";
import { HttpError, InsufficientPointsError } from "@/server/http";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Reason = (typeof schema.pointTransactions.$inferInsert)["reason"];

async function applyDelta(tx: Tx, userId: string, delta: number, reason: Reason, memo: string, refId?: string) {
  const user = await tx.select({ points: schema.users.points }).from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) throw new HttpError(404, "사용자를 찾을 수 없습니다.");
  const balanceAfter = user.points + delta;
  if (balanceAfter < 0) throw new InsufficientPointsError(-delta, user.points);
  await tx
    .update(schema.users)
    .set({ points: sql`${schema.users.points} + ${delta}` })
    .where(eq(schema.users.id, userId))
    .run();
  await tx
    .insert(schema.pointTransactions)
    .values({ id: randomUUID(), userId, delta, balanceAfter, reason, memo, refId, createdAt: new Date() })
    .run();
  return balanceAfter;
}

/** 연필 차감 (원자적). 잔액이 부족하면 InsufficientPointsError(402). */
export async function debitPoints(userId: string, amount: number, memo: string, refId?: string): Promise<number> {
  if (amount <= 0) return getBalance(userId);
  const db = await getDb();
  return db.transaction((tx) => applyDelta(tx, userId, -amount, "generation", memo, refId), { behavior: "immediate" });
}

/** 연필 적립 (가입 보너스·충전·환불) */
export async function creditPoints(userId: string, amount: number, reason: Reason, memo: string, refId?: string): Promise<number> {
  if (amount <= 0) return getBalance(userId);
  const db = await getDb();
  return db.transaction((tx) => applyDelta(tx, userId, amount, reason, memo, refId), { behavior: "immediate" });
}

export async function getBalance(userId: string): Promise<number> {
  const db = await getDb();
  const row = await db.select({ points: schema.users.points }).from(schema.users).where(eq(schema.users.id, userId)).get();
  return row?.points ?? 0;
}

export async function listTransactions(userId: string, limit = 30) {
  const db = await getDb();
  return db
    .select()
    .from(schema.pointTransactions)
    .where(eq(schema.pointTransactions.userId, userId))
    .orderBy(desc(schema.pointTransactions.createdAt))
    .limit(limit)
    .all();
}
