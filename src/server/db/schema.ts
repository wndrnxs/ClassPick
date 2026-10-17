/**
 * 데이터베이스 스키마 (Drizzle ORM · SQLite)
 *
 * users ─┬─< sessions
 *        ├─< materials          (지문 자료 · 분석 보고서 · 모음 시험지 · OCR 문서)
 *        ├─< point_transactions (토큰 원장: 적립/차감/환불 이력)
 *        └─< payments           (토큰 충전 결제)
 */
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["teacher", "instructor", "other"] }).notNull().default("teacher"),
  organization: text("organization").notNull().default(""),
  plan: text("plan", { enum: ["free", "standard", "academy"] }).notNull().default("free"),
  points: integer("points").notNull().default(0),
  isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** 쿠키 토큰의 SHA-256 해시 (원본 토큰은 저장하지 않음) */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const materials = sqliteTable(
  "materials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["passage", "exam_report", "exam_set", "ocr"] }).notNull(),
    title: text("title").notNull(),
    author: text("author").notNull().default(""),
    sourceNote: text("source_note").notNull().default(""),
    /** 원문 지문(또는 시험지/OCR 원문) */
    sourceText: text("source_text").notNull().default(""),
    /** 생성 설정 (JSON) */
    settings: text("settings", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    /** 생성된 자료 유형 목록 (JSON 배열) */
    types: text("types", { mode: "json" }).$type<string[]>().notNull().default([]),
    /** 생성 결과 (JSON) — kind에 따라 PassageContent / ExamReport / ExamSet / OcrResult */
    content: text("content", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    engine: text("engine", { enum: ["claude", "demo", "none"] }).notNull().default("none"),
    pointsSpent: integer("points_spent").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch('subsec') * 1000)`),
  },
  (t) => [index("materials_user_created_idx").on(t.userId, t.createdAt)],
);

export const pointTransactions = sqliteTable(
  "point_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason", { enum: ["signup_bonus", "generation", "refund", "purchase", "adjustment"] }).notNull(),
    memo: text("memo").notNull().default(""),
    refId: text("ref_id"),
    createdAt: createdAt(),
  },
  (t) => [index("point_tx_user_idx").on(t.userId, t.createdAt)],
);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().unique(),
  packId: text("pack_id").notNull(),
  amount: integer("amount").notNull(),
  tokens: integer("tokens").notNull(),
  provider: text("provider", { enum: ["mock", "toss"] }).notNull(),
  status: text("status", { enum: ["pending", "paid", "failed"] }).notNull().default("pending"),
  paymentKey: text("payment_key"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
