/**
 * 데이터베이스 스키마 (Drizzle ORM · SQLite)
 *
 * users ─┬─< sessions
 *        ├─< materials          (지문 자료 · 분석 보고서 · 모음 시험지 · OCR 문서)
 *        ├─< point_transactions (토큰 원장: 적립/차감/환불 이력)
 *        ├─< payments           (토큰 충전 결제)
 *        ├─< classes ─< class_members >─ users(student)   (반 · 학생 명단)
 *        └─< assignments ─┬─< submissions                (시험 배포 · 학생 응시 결과)
 *                         ├─< exam_starts                (응시 시작 시각 · 제한 시간 계산)
 *                         └─< inquiries ─< inquiry_messages (문항 질문 · 선생님 답변)
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
    /** 제한 시간(분). null 이면 제한 없음 */
    timeLimitMin: integer("time_limit_min"),
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
    /** 서버 기록 기준 응시 시간(시작 → 제출) */
    durationSec: integer("duration_sec"),
    /** 문항 ID → 풀이 시간(초). 직전 응답 이후 이 문항에 답하기까지 걸린 시간의 합 */
    timings: text("timings", { mode: "json" }).$type<Record<string, number>>().notNull().default(sql`'{}'`),
    submittedAt: createdAt(),
  },
  (t) => [
    uniqueIndex("submissions_assignment_student_unique").on(t.assignmentId, t.studentId),
    index("submissions_student_idx").on(t.studentId),
  ],
);

/** 응시 시작 기록 — 시작 시각을 서버에 남겨 새로고침·기기 변경과 무관하게 시간을 잽니다. */
export const examStarts = sqliteTable(
  "exam_starts",
  {
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.studentId] })],
);

/**
 * 문항 질문: 학생이 제출한 시험의 한 문항에 대해 선생님께 묻는 대화.
 * 학생·문항마다 하나의 대화이며, 추가 질문과 답변은 inquiry_messages에 쌓입니다.
 */
export const inquiries = sqliteTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 시험 스냅샷의 문항 ID (예: s0-m1) */
    questionId: text("question_id").notNull(),
    /** open: 선생님 답변 대기 / answered: 마지막 메시지가 선생님 답변 */
    status: text("status", { enum: ["open", "answered"] }).notNull().default("open"),
    /** 선생님이 반 전체에 공개한 질문 (다른 학생에게는 이름 없이 표시) */
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    /** 학생이 아직 확인하지 않은 선생님 답변이 있음 */
    studentUnread: integer("student_unread", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("inquiries_thread_unique").on(t.assignmentId, t.studentId, t.questionId),
    index("inquiries_student_idx").on(t.studentId),
  ],
);

export const inquiryMessages = sqliteTable(
  "inquiry_messages",
  {
    id: text("id").primaryKey(),
    inquiryId: text("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorRole: text("author_role", { enum: ["student", "teacher"] }).notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("inquiry_messages_inquiry_idx").on(t.inquiryId)],
);

export type User = typeof users.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type PointTransaction = typeof pointTransactions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
