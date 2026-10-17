import "server-only";

import { randomInt, randomUUID } from "node:crypto";

import { and, desc, eq, inArray } from "drizzle-orm";

import {
  analyzeAssignment,
  analyzeStudent,
  buildSnapshot,
  countGradable,
  grade,
  sanitizeAnswers,
  toPublicSnapshot,
  type AnswerSheet,
  type AssessmentQuestion,
  type AssessmentSnapshot,
  type StudentAttempt,
  type SubmissionLike,
} from "@/lib/assessment";
import { getDb, schema } from "@/server/db/client";
import type { Assignment } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { getMaterial } from "./materials";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0·O·1·I 제외

function newJoinCode() {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

const snapshotOf = (a: Assignment) => a.snapshot as unknown as AssessmentSnapshot;

/* ------------------------------------------------------------------ */
/* 반 (교사)                                                            */
/* ------------------------------------------------------------------ */

export async function createClass(teacherId: string, name: string) {
  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const joinCode = newJoinCode();
    const exists = await db.select({ id: schema.classes.id }).from(schema.classes).where(eq(schema.classes.joinCode, joinCode)).get();
    if (exists) continue;
    const id = randomUUID();
    await db.insert(schema.classes).values({ id, teacherId, name, joinCode, createdAt: new Date() }).run();
    return { id, name, joinCode };
  }
  throw new HttpError(500, "참여 코드를 만들지 못했습니다. 다시 시도해 주세요.");
}

export async function listClasses(teacherId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.classes)
    .where(eq(schema.classes.teacherId, teacherId))
    .orderBy(desc(schema.classes.createdAt))
    .all();
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const members = await db.select().from(schema.classMembers).where(inArray(schema.classMembers.classId, ids)).all();
  const assigned = await db
    .select({ classId: schema.assignments.classId })
    .from(schema.assignments)
    .where(inArray(schema.assignments.classId, ids))
    .all();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    joinCode: r.joinCode,
    createdAt: r.createdAt.toISOString(),
    studentCount: members.filter((m) => m.classId === r.id).length,
    assignmentCount: assigned.filter((a) => a.classId === r.id).length,
  }));
}

async function findOwnedClass(teacherId: string, classId: string) {
  const row = await (await getDb())
    .select()
    .from(schema.classes)
    .where(and(eq(schema.classes.id, classId), eq(schema.classes.teacherId, teacherId)))
    .get();
  if (!row) throw new HttpError(404, "반을 찾을 수 없습니다.");
  return row;
}

async function rosterOf(classId: string) {
  return (await getDb())
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, joinedAt: schema.classMembers.joinedAt })
    .from(schema.classMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.classMembers.studentId))
    .where(eq(schema.classMembers.classId, classId))
    .orderBy(schema.users.name)
    .all();
}

export async function getClassDetail(teacherId: string, classId: string) {
  const cls = await findOwnedClass(teacherId, classId);
  const db = await getDb();
  const roster = await rosterOf(classId);
  const assignmentRows = await db
    .select()
    .from(schema.assignments)
    .where(eq(schema.assignments.classId, classId))
    .orderBy(desc(schema.assignments.createdAt))
    .all();
  const subs = assignmentRows.length
    ? await db
        .select()
        .from(schema.submissions)
        .where(
          inArray(
            schema.submissions.assignmentId,
            assignmentRows.map((a) => a.id),
          ),
        )
        .all()
    : [];
  return {
    id: cls.id,
    name: cls.name,
    joinCode: cls.joinCode,
    students: roster.map((s) => {
      const mine = subs.filter((x) => x.studentId === s.id);
      return {
        id: s.id,
        name: s.name,
        joinedAt: s.joinedAt.toISOString(),
        submitted: mine.length,
        averageScore: mine.length ? Math.round(mine.reduce((a, x) => a + x.score, 0) / mine.length) : null,
      };
    }),
    assignments: assignmentRows.map((a) => {
      const mine = subs.filter((x) => x.assignmentId === a.id);
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        questionCount: snapshotOf(a).questions.length,
        submitted: mine.length,
        averageScore: mine.length ? Math.round(mine.reduce((s, x) => s + x.score, 0) / mine.length) : null,
      };
    }),
  };
}

export async function removeStudent(teacherId: string, classId: string, studentId: string) {
  await findOwnedClass(teacherId, classId);
  await (await getDb())
    .delete(schema.classMembers)
    .where(and(eq(schema.classMembers.classId, classId), eq(schema.classMembers.studentId, studentId)))
    .run();
}

/* ------------------------------------------------------------------ */
/* 시험 배포 (교사)                                                      */
/* ------------------------------------------------------------------ */

export async function createAssignment(
  teacherId: string,
  input: { materialId: string; classId: string; title: string; revealAnswers: boolean },
) {
  await findOwnedClass(teacherId, input.classId);
  const material = await getMaterial(teacherId, input.materialId);
  if (countGradable(material) === 0) {
    throw new HttpError(400, "자동 채점할 수 있는 5지선다·OX 문항이 있는 자료만 배포할 수 있습니다.");
  }
  // 모음 시험지는 각 지문의 원본 자료에서 갈래 정보를 가져옵니다(약점 분석용).
  const genres = new Map<string, string>();
  if (material.kind === "exam_set") {
    for (const sec of material.content.exam.sections) {
      try {
        const src = await getMaterial(teacherId, sec.materialId);
        if (src.kind === "passage" && src.content.structure) genres.set(sec.materialId, src.content.structure.genre.split(/[·,(]/)[0].trim());
      } catch {
        /* 원본이 삭제된 경우 '기타' */
      }
    }
  }
  const snapshot = buildSnapshot(material, (id) => genres.get(id));
  const id = randomUUID();
  await (await getDb())
    .insert(schema.assignments)
    .values({
      id,
      teacherId,
      classId: input.classId,
      materialId: material.id,
      title: input.title,
      snapshot: snapshot as unknown as Record<string, unknown>,
      revealAnswers: input.revealAnswers,
      createdAt: new Date(),
    })
    .run();
  return { id };
}

export async function listAssignments(teacherId: string) {
  const db = await getDb();
  const rows = await db
    .select({ a: schema.assignments, className: schema.classes.name, classId: schema.classes.id })
    .from(schema.assignments)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.assignments.classId))
    .where(eq(schema.assignments.teacherId, teacherId))
    .orderBy(desc(schema.assignments.createdAt))
    .all();
  if (!rows.length) return [];
  const subs = await db
    .select({ assignmentId: schema.submissions.assignmentId, score: schema.submissions.score })
    .from(schema.submissions)
    .where(
      inArray(
        schema.submissions.assignmentId,
        rows.map((r) => r.a.id),
      ),
    )
    .all();
  const members = await db
    .select({ classId: schema.classMembers.classId })
    .from(schema.classMembers)
    .where(inArray(schema.classMembers.classId, [...new Set(rows.map((r) => r.classId))]))
    .all();
  return rows.map(({ a, className, classId }) => {
    const mine = subs.filter((s) => s.assignmentId === a.id);
    return {
      id: a.id,
      title: a.title,
      className,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      questionCount: snapshotOf(a).questions.length,
      rosterSize: members.filter((m) => m.classId === classId).length,
      submitted: mine.length,
      averageScore: mine.length ? Math.round(mine.reduce((s, x) => s + x.score, 0) / mine.length) : null,
    };
  });
}

async function findOwnedAssignment(teacherId: string, assignmentId: string) {
  const row = await (await getDb())
    .select()
    .from(schema.assignments)
    .where(and(eq(schema.assignments.id, assignmentId), eq(schema.assignments.teacherId, teacherId)))
    .get();
  if (!row) throw new HttpError(404, "배포한 시험을 찾을 수 없습니다.");
  return row;
}

export async function getAssignmentReport(teacherId: string, assignmentId: string) {
  const a = await findOwnedAssignment(teacherId, assignmentId);
  const cls = await findOwnedClass(teacherId, a.classId);
  const roster = await rosterOf(a.classId);
  const rows = await (await getDb())
    .select({ s: schema.submissions, name: schema.users.name })
    .from(schema.submissions)
    .innerJoin(schema.users, eq(schema.users.id, schema.submissions.studentId))
    .where(eq(schema.submissions.assignmentId, assignmentId))
    .all();
  const subs: SubmissionLike[] = rows.map(({ s, name }) => ({
    studentId: s.studentId,
    studentName: name,
    answers: s.answers as AnswerSheet,
    score: s.score,
    correctCount: s.correctCount,
    total: s.total,
    durationSec: s.durationSec,
    submittedAt: s.submittedAt.toISOString(),
  }));
  const snapshot = snapshotOf(a);
  const submittedIds = new Set(subs.map((s) => s.studentId));
  return {
    assignment: {
      id: a.id,
      title: a.title,
      status: a.status,
      revealAnswers: a.revealAnswers,
      createdAt: a.createdAt.toISOString(),
      materialId: a.materialId,
    },
    classInfo: { id: cls.id, name: cls.name, joinCode: cls.joinCode },
    snapshot,
    submissions: subs.sort((x, y) => y.score - x.score),
    notSubmitted: roster.filter((r) => !submittedIds.has(r.id)).map((r) => ({ id: r.id, name: r.name })),
    analysis: analyzeAssignment(snapshot, subs, roster.length),
  };
}

export async function setAssignmentStatus(teacherId: string, assignmentId: string, status: "open" | "closed") {
  await findOwnedAssignment(teacherId, assignmentId);
  await (await getDb()).update(schema.assignments).set({ status }).where(eq(schema.assignments.id, assignmentId)).run();
}

export async function deleteAssignment(teacherId: string, assignmentId: string) {
  await findOwnedAssignment(teacherId, assignmentId);
  await (await getDb()).delete(schema.assignments).where(eq(schema.assignments.id, assignmentId)).run();
}

/* ------------------------------------------------------------------ */
/* 학생                                                                 */
/* ------------------------------------------------------------------ */

export async function joinClass(studentId: string, code: string) {
  const db = await getDb();
  const cls = await db.select().from(schema.classes).where(eq(schema.classes.joinCode, code)).get();
  if (!cls) throw new HttpError(404, "참여 코드에 해당하는 반이 없습니다. 선생님께 코드를 다시 확인해 주세요.");
  await db
    .insert(schema.classMembers)
    .values({ classId: cls.id, studentId, joinedAt: new Date() })
    .onConflictDoNothing()
    .run();
  return { id: cls.id, name: cls.name };
}

export async function listStudentClasses(studentId: string) {
  return (await getDb())
    .select({ id: schema.classes.id, name: schema.classes.name, teacherName: schema.users.name })
    .from(schema.classMembers)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.classMembers.classId))
    .innerJoin(schema.users, eq(schema.users.id, schema.classes.teacherId))
    .where(eq(schema.classMembers.studentId, studentId))
    .all();
}

/** 학생이 받은 시험 목록 (소속된 반에 배포된 시험만) */
export async function listStudentAssignments(studentId: string) {
  const db = await getDb();
  const rows = await db
    .select({ a: schema.assignments, className: schema.classes.name })
    .from(schema.classMembers)
    .innerJoin(schema.assignments, eq(schema.assignments.classId, schema.classMembers.classId))
    .innerJoin(schema.classes, eq(schema.classes.id, schema.assignments.classId))
    .where(eq(schema.classMembers.studentId, studentId))
    .orderBy(desc(schema.assignments.createdAt))
    .all();
  const subs = rows.length
    ? await db
        .select()
        .from(schema.submissions)
        .where(
          and(
            eq(schema.submissions.studentId, studentId),
            inArray(
              schema.submissions.assignmentId,
              rows.map((r) => r.a.id),
            ),
          ),
        )
        .all()
    : [];
  return rows.map(({ a, className }) => {
    const mine = subs.find((s) => s.assignmentId === a.id);
    return {
      id: a.id,
      title: a.title,
      className,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      questionCount: snapshotOf(a).questions.length,
      submission: mine ? { score: mine.score, correctCount: mine.correctCount, total: mine.total, submittedAt: mine.submittedAt.toISOString() } : null,
    };
  });
}

async function findStudentAssignment(studentId: string, assignmentId: string) {
  const row = await (await getDb())
    .select({ a: schema.assignments, className: schema.classes.name })
    .from(schema.assignments)
    .innerJoin(schema.classes, eq(schema.classes.id, schema.assignments.classId))
    .innerJoin(
      schema.classMembers,
      and(eq(schema.classMembers.classId, schema.assignments.classId), eq(schema.classMembers.studentId, studentId)),
    )
    .where(eq(schema.assignments.id, assignmentId))
    .get();
  // 소속 반에 배포되지 않은 시험은 존재 여부도 알리지 않습니다.
  if (!row) throw new HttpError(404, "받은 시험을 찾을 수 없습니다.");
  return row;
}

/**
 * 학생용 시험 데이터.
 * - 응시 전: 정답·해설이 제거된 문제지
 * - 제출 후: 정답 공개 설정이면 정답·해설 포함, 아니면 정오(맞음/틀림)만
 */
export async function getStudentAssignment(studentId: string, assignmentId: string) {
  const { a, className } = await findStudentAssignment(studentId, assignmentId);
  const sub = await (await getDb())
    .select()
    .from(schema.submissions)
    .where(and(eq(schema.submissions.assignmentId, assignmentId), eq(schema.submissions.studentId, studentId)))
    .get();
  const snapshot = snapshotOf(a);
  const meta = { id: a.id, title: a.title, className, status: a.status, revealAnswers: a.revealAnswers };
  if (!sub) return { ...meta, state: "todo" as const, exam: toPublicSnapshot(snapshot) };
  const answers = sub.answers as AnswerSheet;
  const graded = grade(snapshot, answers);
  return {
    ...meta,
    state: "done" as const,
    exam: a.revealAnswers ? snapshot : toPublicSnapshot(snapshot),
    result: {
      answers,
      score: sub.score,
      correctCount: sub.correctCount,
      total: sub.total,
      durationSec: sub.durationSec,
      submittedAt: sub.submittedAt.toISOString(),
      correctness: Object.fromEntries(graded.items.map((i) => [i.id, i.correct])),
    },
  };
}

export async function submitAnswers(
  studentId: string,
  assignmentId: string,
  input: { answers: Record<string, unknown>; durationSec: number | null },
) {
  const { a } = await findStudentAssignment(studentId, assignmentId);
  if (a.status !== "open") throw new HttpError(409, "마감된 시험입니다.");
  const snapshot = snapshotOf(a);
  const answers = sanitizeAnswers(snapshot, input.answers);
  const result = grade(snapshot, answers);
  const db = await getDb();
  const exists = await db
    .select({ id: schema.submissions.id })
    .from(schema.submissions)
    .where(and(eq(schema.submissions.assignmentId, assignmentId), eq(schema.submissions.studentId, studentId)))
    .get();
  if (exists) throw new HttpError(409, "이미 제출한 시험입니다.");
  await db
    .insert(schema.submissions)
    .values({
      id: randomUUID(),
      assignmentId,
      studentId,
      answers,
      correctCount: result.correctCount,
      total: result.total,
      score: result.score,
      durationSec: input.durationSec,
      submittedAt: new Date(),
    })
    .run();
  return { score: result.score, correctCount: result.correctCount, total: result.total };
}

/** 학생 약점 분석 — 정답 비공개 시험의 오답 노트에는 정답·해설을 넣지 않습니다. */
export async function getStudentReport(studentId: string) {
  const rows = await (await getDb())
    .select({ s: schema.submissions, a: schema.assignments })
    .from(schema.submissions)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.submissions.assignmentId))
    .where(eq(schema.submissions.studentId, studentId))
    .all();
  const attempts: StudentAttempt[] = rows.map(({ s, a }) => ({
    assignmentId: a.id,
    title: a.title,
    submittedAt: s.submittedAt.toISOString(),
    score: s.score,
    answers: s.answers as AnswerSheet,
    snapshot: snapshotOf(a),
    revealAnswers: a.revealAnswers,
  }));
  const report = analyzeStudent(attempts);
  return {
    ...report,
    wrongNotes: report.wrongNotes.map((n) => ({
      ...n,
      question: n.revealAnswers ? n.question : hideAnswer(n.question),
    })),
  };
}

function hideAnswer(q: AssessmentQuestion): AssessmentQuestion {
  return q.kind === "mcq"
    ? { ...q, answer: 0, explanation: "", optionNotes: q.optionNotes.map(() => "") }
    : { ...q, explanation: "" };
}

export type StudentAssignmentView = Awaited<ReturnType<typeof getStudentAssignment>>;
export type AssignmentReport = Awaited<ReturnType<typeof getAssignmentReport>>;
