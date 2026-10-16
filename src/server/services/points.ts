import "server-only";

import { randomUUID } from "node:crypto";

import { desc, eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/server/db/client";
import type { DB } from "@/server/db/client";
import { HttpError, InsufficientPointsError } from "@/server/http";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
type Reason = (typeof schema.pointTransactions.$inferInsert)["reason"];

function applyDelta(tx: Tx, userId: string, delta: number, reason: Reason, memo: string, refId?: string) {
  const user = tx.select({ points: schema.users.points }).from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) throw new HttpError(404, "사용자를 찾을 수 없습니다.");
  const balanceAfter = user.points + delta;
  if (balanceAfter < 0) throw new InsufficientPointsError(-delta, user.points);
  tx.update(schema.users)
    .set({ points: sql`${schema.users.points} + ${delta}` })
    .where(eq(schema.users.id, userId))
    .run();
  tx.insert(schema.pointTransactions)
    .values({ id: randomUUID(), userId, delta, balanceAfter, reason, memo, refId, createdAt: new Date() })
    .run();
  return balanceAfter;
}

/** 연필 차감 (원자적). 잔액이 부족하면 InsufficientPointsError(402). */
export function debitPoints(userId: string, amount: number, memo: string, refId?: string): number {
  if (amount <= 0) return getBalance(userId);
  return getDb().transaction((tx) => applyDelta(tx, userId, -amount, "generation", memo, refId));
}

/** 연필 적립 (가입 보너스·충전·환불) */
export function creditPoints(userId: string, amount: number, reason: Reason, memo: string, refId?: string): number {
  if (amount <= 0) return getBalance(userId);
  return getDb().transaction((tx) => applyDelta(tx, userId, amount, reason, memo, refId));
}

export function getBalance(userId: string): number {
  return (
    getDb().select({ points: schema.users.points }).from(schema.users).where(eq(schema.users.id, userId)).get()?.points ?? 0
  );
}

export function listTransactions(userId: string, limit = 30) {
  return getDb()
    .select()
    .from(schema.pointTransactions)
    .where(eq(schema.pointTransactions.userId, userId))
    .orderBy(desc(schema.pointTransactions.createdAt))
    .limit(limit)
    .all();
}
