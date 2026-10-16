import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { PENCIL_PACKS } from "@/lib/catalog";
import { getDb, schema } from "@/server/db/client";
import { env } from "@/server/env";
import { HttpError } from "@/server/http";
import { creditPoints } from "./points";

function findPack(packId: string) {
  const pack = PENCIL_PACKS.find((p) => p.id === packId);
  if (!pack) throw new HttpError(400, "존재하지 않는 상품입니다.");
  return pack;
}

/**
 * 결제 시작.
 * - mock(기본): 결제 승인을 시뮬레이션하고 즉시 토큰을 적립합니다. (개발·시연용)
 * - toss: 주문을 pending으로 만들고, 클라이언트가 토스페이먼츠 결제창을 띄운 뒤
 *   successUrl에서 confirmTossPayment()로 서버 승인합니다.
 */
export async function startCheckout(userId: string, packId: string) {
  const pack = findPack(packId);
  const orderId = `cp_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const provider = env.paymentProvider;
  await (await getDb())
    .insert(schema.payments)
    .values({
      id: randomUUID(),
      userId,
      orderId,
      packId: pack.id,
      amount: pack.price,
      pencils: pack.pencils,
      provider,
      status: provider === "mock" ? "paid" : "pending",
      createdAt: new Date(),
    })
    .run();

  if (provider === "mock") {
    const balance = await creditPoints(userId, pack.pencils, "purchase", `${pack.label} 충전 (테스트 결제)`, orderId);
    return { provider, status: "paid" as const, orderId, balance };
  }
  return { provider, status: "pending" as const, orderId, amount: pack.price, orderName: `클래스픽 ${pack.label}` };
}

/** 토스페이먼츠 결제 승인 (https://docs.tosspayments.com — 결제 승인 API) */
export async function confirmTossPayment(userId: string, params: { paymentKey: string; orderId: string; amount: number }) {
  if (!env.tossSecretKey) throw new HttpError(503, "토스페이먼츠 시크릿 키가 설정되지 않았습니다.");
  const db = await getDb();
  const payment = await db
    .select()
    .from(schema.payments)
    .where(and(eq(schema.payments.orderId, params.orderId), eq(schema.payments.userId, userId)))
    .get();
  if (!payment) throw new HttpError(404, "주문을 찾을 수 없습니다.");
  if (payment.status === "paid") return { balance: null, alreadyPaid: true };
  if (payment.amount !== params.amount) throw new HttpError(400, "결제 금액이 주문 금액과 일치하지 않습니다.");

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.tossSecretKey}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    await db.update(schema.payments).set({ status: "failed" }).where(eq(schema.payments.id, payment.id)).run();
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new HttpError(402, body.message ?? "결제 승인에 실패했습니다.");
  }
  await db
    .update(schema.payments)
    .set({ status: "paid", paymentKey: params.paymentKey })
    .where(eq(schema.payments.id, payment.id))
    .run();
  const pack = findPack(payment.packId);
  const balance = await creditPoints(userId, payment.pencils, "purchase", `${pack.label} 충전`, payment.orderId);
  return { balance, alreadyPaid: false };
}

export async function listPayments(userId: string) {
  return (await getDb())
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.userId, userId))
    .orderBy(desc(schema.payments.createdAt))
    .limit(20)
    .all();
}
