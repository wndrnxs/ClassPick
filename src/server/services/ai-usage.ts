import "server-only";

import { randomUUID } from "node:crypto";

import { desc, gte, inArray } from "drizzle-orm";

import { UsageLog } from "@/server/ai/usage";
import { getDb, schema } from "@/server/db/client";

type Job = (typeof schema.aiUsage.$inferInsert)["job"];

/**
 * AI 작업을 실행하면서 Claude API 사용량을 기록합니다.
 * 작업이 실패해도(토큰 환불) 이미 나간 API 요금은 기록에 남깁니다.
 */
export async function withUsageLog<T>(userId: string, refId: string, job: Job, work: (log: UsageLog) => Promise<T>): Promise<T> {
  const log = new UsageLog();
  let succeeded = false;
  try {
    const result = await work(log);
    succeeded = true;
    return result;
  } finally {
    if (log.entries.length) {
      await (await getDb())
        .insert(schema.aiUsage)
        .values(log.entries.map((e) => ({ id: randomUUID(), userId, refId, job, jobSucceeded: succeeded, ...e })))
        .run()
        .catch((err) => console.error("[ai-usage] 기록 실패", err));
    }
  }
}

/* ------------------------------------------------------------------ */
/* 운영자용 집계                                                          */
/* ------------------------------------------------------------------ */

type Row = typeof schema.aiUsage.$inferSelect;

const sum = (rows: Row[], pick: (r: Row) => number) => rows.reduce((n, r) => n + pick(r), 0);

function totals(rows: Row[]) {
  return {
    calls: rows.length,
    inputTokens: sum(rows, (r) => r.inputTokens + r.cacheWriteTokens + r.cacheReadTokens),
    outputTokens: sum(rows, (r) => r.outputTokens),
    costUsd: sum(rows, (r) => r.costUsd ?? 0),
    unknownCost: rows.filter((r) => r.costUsd == null).length,
    failedCalls: rows.filter((r) => r.status !== "ok").length,
  };
}

/** 운영자 화면: 기간 합계, 기능별 평균, 최근 작업별 원가 vs 차감 토큰 */
export async function getUsageReport(sinceDays: number | null) {
  const db = await getDb();
  const since = sinceDays == null ? null : new Date(Date.now() - sinceDays * 86_400_000);
  const rows = await db
    .select()
    .from(schema.aiUsage)
    .where(since ? gte(schema.aiUsage.createdAt, since) : undefined)
    .orderBy(desc(schema.aiUsage.createdAt))
    .all();

  const features = [...new Set(rows.map((r) => r.feature))].map((feature) => {
    const rs = rows.filter((r) => r.feature === feature);
    const t = totals(rs);
    return {
      feature,
      ...t,
      avgInput: Math.round(t.inputTokens / rs.length),
      avgOutput: Math.round(t.outputTokens / rs.length),
      avgCostUsd: t.costUsd / rs.length,
      avgDurationMs: Math.round(sum(rs, (r) => r.durationMs) / rs.length),
    };
  });

  // 작업(자료 생성 1건) 단위로 묶기 — 최근 50건
  const refIds = [...new Set(rows.map((r) => r.refId))].slice(0, 50);
  const materials = refIds.length
    ? await db
        .select({ id: schema.materials.id, title: schema.materials.title, pointsSpent: schema.materials.pointsSpent })
        .from(schema.materials)
        .where(inArray(schema.materials.id, refIds))
        .all()
    : [];
  const userIds = [...new Set(rows.filter((r) => refIds.includes(r.refId)).map((r) => r.userId))];
  const users = userIds.length
    ? await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users).where(inArray(schema.users.id, userIds)).all()
    : [];
  const jobs = refIds.map((refId) => {
    const rs = rows.filter((r) => r.refId === refId);
    const m = materials.find((x) => x.id === refId);
    return {
      refId,
      job: rs[0].job,
      createdAt: rs[rs.length - 1].createdAt.toISOString(),
      userEmail: users.find((u) => u.id === rs[0].userId)?.email ?? "",
      title: m?.title ?? null,
      pointsSpent: m?.pointsSpent ?? 0,
      succeeded: rs[0].jobSucceeded,
      features: rs.map((r) => r.feature),
      models: [...new Set(rs.map((r) => r.model))],
      ...totals(rs),
    };
  });

  const jobCount = new Set(rows.map((r) => r.refId)).size;
  return { total: { ...totals(rows), jobCount }, features: features.sort((a, b) => b.costUsd - a.costUsd), jobs };
}
