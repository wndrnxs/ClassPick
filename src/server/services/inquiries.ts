import "server-only";

/**
 * 문항 질문 (학생 ↔ 선생님)
 * - 학생은 제출한 시험의 문항마다 하나의 대화를 열고, 추가 질문을 이어서 남길 수 있습니다.
 * - 선생님은 자기가 배포한 시험의 질문에만 답할 수 있고, 좋은 질문은 반 전체에 공개할 수 있습니다.
 *   (공개된 대화는 다른 학생에게 질문한 학생의 이름 없이 보입니다.)
 */
import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import type { AnswerSheet, AssessmentQuestion, AssessmentSnapshot, Timings } from "@/lib/assessment";
import { getDb, schema } from "@/server/db/client";
import type { Assignment } from "@/server/db/schema";
import { HttpError } from "@/server/http";

type Role = "student" | "teacher";
export type InquiryStatus = "open" | "answered";

export type InquiryMessage = { id: string; role: Role; authorName: string; body: string; createdAt: string; mine: boolean };
export type InquiryThread = {
  id: string;
  questionId: string;
  status: InquiryStatus;
  isPublic: boolean;
  unread: boolean;
  messages: InquiryMessage[];
};

const snapshotOf = (a: Pick<Assignment, "snapshot">) => a.snapshot as unknown as AssessmentSnapshot;
const questionOf = (a: Pick<Assignment, "snapshot">, questionId: string) => snapshotOf(a).questions.find((q) => q.id === questionId);
const preview = (body: string) => (body.length > 80 ? `${body.slice(0, 80)}…` : body);

/* ------------------------------------------------------------------ */
/* 쓰기                                                                 */
/* ------------------------------------------------------------------ */

/** 학생: 문항 질문 — 같은 문항에 이미 대화가 있으면 이어서 남깁니다. */
export async function askQuestion(studentId: string, input: { assignmentId: string; questionId: string; body: string }) {
  const db = await getDb();
  const row = await db
    .select({ a: schema.assignments })
    .from(schema.assignments)
    .innerJoin(
      schema.classMembers,
      and(eq(schema.classMembers.classId, schema.assignments.classId), eq(schema.classMembers.studentId, studentId)),
    )
    .where(eq(schema.assignments.id, input.assignmentId))
    .get();
  if (!row) throw new HttpError(404, "받은 시험을 찾을 수 없습니다.");
  if (!questionOf(row.a, input.questionId)) throw new HttpError(404, "문항을 찾을 수 없습니다.");
  const submitted = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(and(eq(schema.submissions.assignmentId, input.assignmentId), eq(schema.submissions.studentId, studentId)))
    .get();
  if (!submitted) throw new HttpError(409, "시험을 제출한 뒤에 질문할 수 있어요.");

  const now = new Date();
  return db.transaction(
    async (tx) => {
      const existing = await tx
        .select({ id: schema.inquiries.id })
        .from(schema.inquiries)
        .where(
          and(
            eq(schema.inquiries.assignmentId, input.assignmentId),
            eq(schema.inquiries.studentId, studentId),
            eq(schema.inquiries.questionId, input.questionId),
          ),
        )
        .get();
      const id = existing?.id ?? randomUUID();
      if (existing) {
        await tx.update(schema.inquiries).set({ status: "open", updatedAt: now }).where(eq(schema.inquiries.id, id)).run();
      } else {
        await tx
          .insert(schema.inquiries)
          .values({ id, assignmentId: input.assignmentId, studentId, questionId: input.questionId, createdAt: now, updatedAt: now })
          .run();
      }
      await tx
        .insert(schema.inquiryMessages)
        .values({ id: randomUUID(), inquiryId: id, authorId: studentId, authorRole: "student", body: input.body, createdAt: now })
        .run();
      return { id };
    },
    { behavior: "immediate" },
  );
}

async function findThread(id: string) {
  const row = await (await getDb())
    .select({ i: schema.inquiries, teacherId: schema.assignments.teacherId })
    .from(schema.inquiries)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.inquiries.assignmentId))
    .where(eq(schema.inquiries.id, id))
    .get();
  if (!row) throw new HttpError(404, "질문을 찾을 수 없습니다.");
  return row;
}

/**
 * 대화에 메시지 추가 — 질문한 학생(추가 질문) 또는 시험을 배포한 선생님(답변)만 가능.
 * 선생님이 답하면 '답변 완료' + 학생에게 새 답변 표시, 학생이 이어 물으면 다시 '답변 대기'.
 */
export async function postInquiryMessage(user: { id: string; role: string }, inquiryId: string, body: string) {
  const { i, teacherId } = await findThread(inquiryId);
  const role: Role | null = user.role === "student" ? (i.studentId === user.id ? "student" : null) : teacherId === user.id ? "teacher" : null;
  // 남의 대화는 존재 여부도 알리지 않습니다.
  if (!role) throw new HttpError(404, "질문을 찾을 수 없습니다.");
  const now = new Date();
  const db = await getDb();
  await db.transaction(
    async (tx) => {
      await tx
        .insert(schema.inquiryMessages)
        .values({ id: randomUUID(), inquiryId, authorId: user.id, authorRole: role, body, createdAt: now })
        .run();
      await tx
        .update(schema.inquiries)
        .set(
          role === "teacher"
            ? { status: "answered", studentUnread: true, updatedAt: now }
            : { status: "open", studentUnread: false, updatedAt: now },
        )
        .where(eq(schema.inquiries.id, inquiryId))
        .run();
    },
    { behavior: "immediate" },
  );
  return { role };
}

/** 선생님: 반 전체 공개 여부 */
export async function setInquiryPublic(teacherId: string, inquiryId: string, isPublic: boolean) {
  const { teacherId: owner } = await findThread(inquiryId);
  if (owner !== teacherId) throw new HttpError(404, "질문을 찾을 수 없습니다.");
  await (await getDb()).update(schema.inquiries).set({ isPublic }).where(eq(schema.inquiries.id, inquiryId)).run();
}

/** 학생: 해당 시험의 선생님 답변을 확인함 */
export async function markInquiriesRead(studentId: string, assignmentId: string) {
  await (await getDb())
    .update(schema.inquiries)
    .set({ studentUnread: false })
    .where(and(eq(schema.inquiries.studentId, studentId), eq(schema.inquiries.assignmentId, assignmentId)))
    .run();
}

/* ------------------------------------------------------------------ */
/* 읽기                                                                 */
/* ------------------------------------------------------------------ */

async function messagesOf(inquiryIds: string[]) {
  if (!inquiryIds.length) return [];
  return (await getDb())
    .select({ m: schema.inquiryMessages, authorName: schema.users.name })
    .from(schema.inquiryMessages)
    .innerJoin(schema.users, eq(schema.users.id, schema.inquiryMessages.authorId))
    .where(inArray(schema.inquiryMessages.inquiryId, inquiryIds))
    .orderBy(asc(schema.inquiryMessages.createdAt))
    .all();
}

/**
 * 학생 결과 화면용: 내 질문 대화 + 선생님이 공개한 다른 학생의 질문(이름 숨김), 문항 ID별로 묶어서.
 */
export async function studentInquiriesForAssignment(studentId: string, assignmentId: string) {
  const db = await getDb();
  const mineRows = await db
    .select()
    .from(schema.inquiries)
    .where(and(eq(schema.inquiries.assignmentId, assignmentId), eq(schema.inquiries.studentId, studentId)))
    .all();
  const sharedRows = await db
    .select()
    .from(schema.inquiries)
    .where(
      and(
        eq(schema.inquiries.assignmentId, assignmentId),
        ne(schema.inquiries.studentId, studentId),
        eq(schema.inquiries.isPublic, true),
        eq(schema.inquiries.status, "answered"),
      ),
    )
    .orderBy(desc(schema.inquiries.updatedAt))
    .all();
  const msgs = await messagesOf([...mineRows, ...sharedRows].map((r) => r.id));
  const thread = (r: (typeof mineRows)[number], anonymize: boolean): InquiryThread => ({
    id: r.id,
    questionId: r.questionId,
    status: r.status,
    isPublic: r.isPublic,
    unread: !anonymize && r.studentUnread,
    messages: msgs
      .filter((x) => x.m.inquiryId === r.id)
      .map(({ m, authorName }) => ({
        id: m.id,
        role: m.authorRole,
        authorName: m.authorRole === "teacher" ? `${authorName} 선생님` : anonymize ? "다른 학생" : "나",
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        mine: m.authorId === studentId,
      })),
  });
  const mine: Record<string, InquiryThread> = {};
  for (const r of mineRows) mine[r.questionId] = thread(r, false);
  const shared: Record<string, InquiryThread[]> = {};
  for (const r of sharedRows) (shared[r.questionId] ??= []).push(thread(r, true));
  return { mine, shared };
}

/** 학생: 내 질문 목록 (최근 활동 순) */
export async function listStudentInquiries(studentId: string) {
  const rows = await (await getDb())
    .select({ i: schema.inquiries, a: schema.assignments })
    .from(schema.inquiries)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.inquiries.assignmentId))
    .where(eq(schema.inquiries.studentId, studentId))
    .orderBy(desc(schema.inquiries.updatedAt))
    .all();
  const msgs = await messagesOf(rows.map((r) => r.i.id));
  return rows.map(({ i, a }) => {
    const q = questionOf(a, i.questionId);
    const last = msgs.filter((x) => x.m.inquiryId === i.id).at(-1);
    return {
      id: i.id,
      assignmentId: a.id,
      assignmentTitle: a.title,
      questionId: i.questionId,
      questionNumber: q?.number ?? null,
      stem: q?.stem ?? "",
      status: i.status,
      unread: i.studentUnread,
      lastMessage: last ? { role: last.m.authorRole, body: preview(last.m.body) } : null,
      updatedAt: i.updatedAt.toISOString(),
    };
  });
}

export async function countStudentUnread(studentId: string) {
  const rows = await (await getDb())
    .select({ id: schema.inquiries.id })
    .from(schema.inquiries)
    .where(and(eq(schema.inquiries.studentId, studentId), eq(schema.inquiries.studentUnread, true)))
    .all();
  return rows.length;
}

/** 선생님: 받은 질문 목록 (답변 대기 우선, 최근 활동 순). assignmentId를 주면 그 시험의 질문만 */
export async function listTeacherInquiries(teacherId: string, filter: "all" | InquiryStatus = "all", assignmentId?: string) {
  const rows = await (await getDb())
    .select({ i: schema.inquiries, a: schema.assignments, studentName: schema.users.name, className: schema.classes.name })
    .from(schema.inquiries)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.inquiries.assignmentId))
    .innerJoin(schema.users, eq(schema.users.id, schema.inquiries.studentId))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.assignments.classId))
    .where(
      and(
        eq(schema.assignments.teacherId, teacherId),
        filter === "all" ? undefined : eq(schema.inquiries.status, filter),
        assignmentId ? eq(schema.inquiries.assignmentId, assignmentId) : undefined,
      ),
    )
    .orderBy(desc(schema.inquiries.updatedAt))
    .all();
  const msgs = await messagesOf(rows.map((r) => r.i.id));
  return rows
    .map(({ i, a, studentName, className }) => {
      const q = questionOf(a, i.questionId);
      const thread = msgs.filter((x) => x.m.inquiryId === i.id);
      const last = thread.at(-1);
      return {
        id: i.id,
        status: i.status,
        isPublic: i.isPublic,
        studentName,
        className,
        assignmentId: a.id,
        assignmentTitle: a.title,
        questionNumber: q?.number ?? null,
        stem: q?.stem ?? "",
        lastMessage: last ? { role: last.m.authorRole, body: preview(last.m.body) } : null,
        messageCount: thread.length,
        updatedAt: i.updatedAt.toISOString(),
      };
    })
    .sort((x, y) => (x.status === y.status ? 0 : x.status === "open" ? -1 : 1));
}

export async function countTeacherOpenInquiries(teacherId: string) {
  const rows = await (await getDb())
    .select({ id: schema.inquiries.id })
    .from(schema.inquiries)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.inquiries.assignmentId))
    .where(and(eq(schema.assignments.teacherId, teacherId), eq(schema.inquiries.status, "open")))
    .all();
  return rows.length;
}

/** 선생님: 질문 상세 — 문항 원문, 학생의 응답·정오·풀이 시간, 대화 전체 */
export async function getTeacherInquiry(teacherId: string, inquiryId: string) {
  const db = await getDb();
  const row = await db
    .select({ i: schema.inquiries, a: schema.assignments, studentName: schema.users.name, className: schema.classes.name })
    .from(schema.inquiries)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.inquiries.assignmentId))
    .innerJoin(schema.users, eq(schema.users.id, schema.inquiries.studentId))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.assignments.classId))
    .where(and(eq(schema.inquiries.id, inquiryId), eq(schema.assignments.teacherId, teacherId)))
    .get();
  if (!row) throw new HttpError(404, "질문을 찾을 수 없습니다.");
  const { i, a } = row;
  const snapshot = snapshotOf(a);
  const question = snapshot.questions.find((q) => q.id === i.questionId) as AssessmentQuestion | undefined;
  if (!question) throw new HttpError(404, "문항을 찾을 수 없습니다.");
  const sub = await db
    .select()
    .from(schema.submissions)
    .where(and(eq(schema.submissions.assignmentId, a.id), eq(schema.submissions.studentId, i.studentId)))
    .get();
  const answer = sub ? ((sub.answers as AnswerSheet)[question.id] ?? null) : null;
  // 같은 문항에 다른 학생 질문이 몇 개 있는지 (공개 답변을 고려할 때 참고)
  const sameQuestion = await db
    .select({ id: schema.inquiries.id })
    .from(schema.inquiries)
    .where(and(eq(schema.inquiries.assignmentId, a.id), eq(schema.inquiries.questionId, question.id), ne(schema.inquiries.id, i.id)))
    .all();
  const msgs = await messagesOf([i.id]);
  return {
    id: i.id,
    status: i.status,
    isPublic: i.isPublic,
    student: { id: i.studentId, name: row.studentName },
    className: row.className,
    assignment: { id: a.id, title: a.title, revealAnswers: a.revealAnswers },
    section: snapshot.sections[question.sectionIndex] ?? null,
    question,
    studentAnswer: answer,
    correct: answer !== null && answer === question.answer,
    timeSec: sub ? ((sub.timings as Timings)[question.id] ?? null) : null,
    otherQuestionsOnSameItem: sameQuestion.length,
    messages: msgs.map(({ m, authorName }) => ({
      id: m.id,
      role: m.authorRole,
      authorName: m.authorRole === "teacher" ? `${authorName} 선생님` : authorName,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      mine: m.authorId === teacherId,
    })),
  };
}

/** 선생님 성적 분석 화면용: 문항별 질문 수 */
export async function inquiryCountsForAssignment(teacherId: string, assignmentId: string) {
  const rows = await (await getDb())
    .select({ questionId: schema.inquiries.questionId, status: schema.inquiries.status })
    .from(schema.inquiries)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.inquiries.assignmentId))
    .where(and(eq(schema.inquiries.assignmentId, assignmentId), eq(schema.assignments.teacherId, teacherId)))
    .all();
  const byQuestion: Record<string, { total: number; open: number }> = {};
  for (const r of rows) {
    const c = (byQuestion[r.questionId] ??= { total: 0, open: 0 });
    c.total += 1;
    if (r.status === "open") c.open += 1;
  }
  return { total: rows.length, open: rows.filter((r) => r.status === "open").length, byQuestion };
}

export type TeacherInquiry = Awaited<ReturnType<typeof getTeacherInquiry>>;
export type TeacherInquiryListItem = Awaited<ReturnType<typeof listTeacherInquiries>>[number];
