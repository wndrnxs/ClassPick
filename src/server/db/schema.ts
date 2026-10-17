/**
 * 데이터베이스 스키마 (Drizzle ORM · SQLite)
 *
 * users ─┬─< sessions
 *        ├─< materials          (지문 자료 · 분석 보고서 · 모음 시험지 · OCR 문서)
 *        ├─< point_transactions (토큰 원장: 적립/차감/환불 이력)
 *        ├─< payments           (토큰 충전 결제)
 *        ├─< classes ─< class_members >─ users(student)   (반 · 학생 명단)
 *        └─< assignments ─< submissions                  (시험 배포 · 학생 응시 결과)
 */
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["teacher", "instructor", "other", "student"] }).notNull().default("teacher"),
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

/* ------------------------------------------------------------------ */
/* 학생 포털: 반 · 시험 배포 · 응시                                        */
/* ------------------------------------------------------------------ */

export const classes = sqliteTable(
  "classes",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** 학생이 반에 참여할 때 입력하는 코드 (대문자·숫자 6자리) */
    joinCode: text("join_code").notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index("classes_teacher_idx").on(t.teacherId)],
);

export const classMembers = sqliteTable(
  "class_members",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentId] }), index("class_members_student_idx").on(t.studentId)],
);

export const assignments = sqliteTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    /** 원본 자료 (삭제되어도 배포된 시험은 스냅샷으로 유지) */
    materialId: text("material_id").references(() => materials.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    /** 배포 시점의 지문·문항 스냅샷 (JSON) */
    snapshot: text("snapshot", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    /** 제출 후 학생에게 정답·해설 공개 여부 */
    revealAnswers: integer("reveal_answers", { mode: "boolean" }).notNull().default(true),
    status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("assignments_class_idx").on(t.classId), index("assignments_teacher_idx").on(t.teacherId)],
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 문항 ID → 학생 응답 (선지 번호 또는 O/X) */
    answers: text("answers", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    correctCount: integer("correct_count").notNull(),
    total: integer("total").notNull(),
    /** 100점 만점 환산 점수 */
    score: integer("score").notNull(),
    durationSec: integer("duration_sec"),
    submittedAt: createdAt(),
  },
  (t) => [
    uniqueIndex("submissions_assignment_student_unique").on(t.assignmentId, t.studentId),
    index("submissions_student_idx").on(t.studentId),
  ],
);

export type User = typeof users.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
