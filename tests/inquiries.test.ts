import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-inquiries-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.CLASSPICK_AI_MODE = "demo";

let users: typeof import("@/server/services/users");
let classroom: typeof import("@/server/services/classroom");
let materials: typeof import("@/server/services/materials");
let inquiries: typeof import("@/server/services/inquiries");

beforeAll(async () => {
  users = await import("@/server/services/users");
  classroom = await import("@/server/services/classroom");
  materials = await import("@/server/services/materials");
  inquiries = await import("@/server/services/inquiries");
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const signup = (email: string, role: "teacher" | "student", name = email) =>
  users.registerUser({ name, email, password: "password123", role, organization: "", agreeTerms: true });

describe("question & answer between students and teachers", () => {
  it("threads questions per student and question, with replies only from the owner student or teacher", async () => {
    const teacher = await signup("t@test.kr", "teacher", "김국어");
    const otherTeacher = await signup("t2@test.kr", "teacher");
    const student = await signup("s@test.kr", "student", "박학생");
    const classmate = await signup("c@test.kr", "student", "이친구");
    const outsider = await signup("o@test.kr", "student");
    const ids = await materials.seedSampleMaterials(teacher);
    const cls = await classroom.createClass(teacher, "1반");
    await classroom.joinClass(student, cls.joinCode);
    await classroom.joinClass(classmate, cls.joinCode);
    const { id: assignmentId } = await classroom.createAssignment(teacher, { materialId: ids.azalea, classId: cls.id, title: "형성평가", revealAnswers: true });
    const ask = (who: string, body: string, questionId = "s0-m1") => inquiries.askQuestion(who, { assignmentId, questionId, body });

    // 제출 전·반 밖·없는 문항은 질문 불가
    await expect(ask(student, "질문")).rejects.toThrow(/제출한 뒤/);
    await classroom.submitAnswers(student, assignmentId, { answers: { "s0-m1": 2 }, durationSec: null, timings: { "s0-m1": 40 } });
    await classroom.submitAnswers(classmate, assignmentId, { answers: {}, durationSec: null });
    await expect(ask(outsider, "질문")).rejects.toThrow(/찾을 수 없습니다/);
    await expect(ask(student, "질문", "s9-m9")).rejects.toThrow(/문항을 찾을 수 없습니다/);

    // 같은 문항은 하나의 대화로 이어짐
    const first = await ask(student, "반어와 역설은 어떻게 달라요?");
    const again = await ask(student, "그리고 하나 더 궁금해요.");
    expect(again.id).toBe(first.id);
    expect(await inquiries.countTeacherOpenInquiries(teacher)).toBe(1);

    // 답변 권한: 배포한 선생님만, 다른 학생·다른 선생님은 존재도 모름
    await expect(inquiries.postInquiryMessage({ id: otherTeacher, role: "teacher" }, first.id, "x")).rejects.toThrow(/찾을 수 없습니다/);
    await expect(inquiries.postInquiryMessage({ id: classmate, role: "student" }, first.id, "x")).rejects.toThrow(/찾을 수 없습니다/);
    await inquiries.postInquiryMessage({ id: teacher, role: "teacher" }, first.id, "반어는 겉과 속이 반대인 표현이에요.");
    expect(await inquiries.countTeacherOpenInquiries(teacher)).toBe(0);
    expect(await inquiries.countStudentUnread(student)).toBe(1);

    const detail = await inquiries.getTeacherInquiry(teacher, first.id);
    expect(detail.status).toBe("answered");
    expect(detail.student.name).toBe("박학생");
    expect(detail.studentAnswer).toBe(2);
    expect(detail.correct).toBe(false);
    expect(detail.timeSec).toBe(40);
    expect(detail.messages.map((m) => m.role)).toEqual(["student", "student", "teacher"]);
    await expect(inquiries.getTeacherInquiry(otherTeacher, first.id)).rejects.toThrow(/찾을 수 없습니다/);

    // 학생 화면: 내 대화 + 확인 처리
    const mine = await inquiries.studentInquiriesForAssignment(student, assignmentId);
    expect(mine.mine["s0-m1"].unread).toBe(true);
    expect(mine.mine["s0-m1"].messages.at(-1)?.authorName).toBe("김국어 선생님");
    await inquiries.markInquiriesRead(student, assignmentId);
    expect(await inquiries.countStudentUnread(student)).toBe(0);

    // 학생이 이어서 물으면 다시 답변 대기
    await inquiries.postInquiryMessage({ id: student, role: "student" }, first.id, "감사합니다! 그럼 역설은요?");
    expect((await inquiries.listTeacherInquiries(teacher, "open")).map((i) => i.id)).toEqual([first.id]);
    await inquiries.postInquiryMessage({ id: teacher, role: "teacher" }, first.id, "역설은 표면적으로 모순된 진술이에요.");

    // 공개 전에는 반 친구에게 안 보이고, 공개하면 이름 없이 보임
    expect((await inquiries.studentInquiriesForAssignment(classmate, assignmentId)).shared).toEqual({});
    await expect(inquiries.setInquiryPublic(otherTeacher, first.id, true)).rejects.toThrow();
    await inquiries.setInquiryPublic(teacher, first.id, true);
    const shared = (await inquiries.studentInquiriesForAssignment(classmate, assignmentId)).shared["s0-m1"];
    expect(shared).toHaveLength(1);
    expect(shared[0].messages[0].authorName).toBe("다른 학생");
    expect(JSON.stringify(shared)).not.toContain("박학생");

    const counts = await inquiries.inquiryCountsForAssignment(teacher, assignmentId);
    expect(counts).toEqual({ total: 1, open: 0, byQuestion: { "s0-m1": { total: 1, open: 0 } } });
    expect((await inquiries.listStudentInquiries(student))[0]).toMatchObject({ questionNumber: 2, status: "answered" });
  });

  it("removes an exam's submissions, starts and questions without relying on foreign-key cascades", async () => {
    const { getDb, schema } = await import("@/server/db/client");
    const { sql, eq } = await import("drizzle-orm");
    const db = await getDb();
    await db.run(sql`PRAGMA foreign_keys = OFF`); // 원격 DB처럼 연쇄 삭제가 동작하지 않는 상황
    try {
      const teacher = await signup("del-t@test.kr", "teacher");
      const student = await signup("del-s@test.kr", "student");
      const ids = await materials.seedSampleMaterials(teacher);
      const cls = await classroom.createClass(teacher, "삭제반");
      await classroom.joinClass(student, cls.joinCode);
      const { id } = await classroom.createAssignment(teacher, { materialId: ids.azalea, classId: cls.id, title: "삭제", revealAnswers: true });
      await classroom.startAssignment(student, id);
      await classroom.submitAnswers(student, id, { answers: {}, durationSec: null });
      await inquiries.askQuestion(student, { assignmentId: id, questionId: "s0-m0", body: "질문" });

      // 자료를 지워도 시험은 남고 원본 연결만 끊김
      await materials.deleteMaterial(teacher, ids.azalea);
      expect((await db.select().from(schema.assignments).where(eq(schema.assignments.id, id)).get())?.materialId).toBeNull();

      await classroom.deleteAssignment(teacher, id);
      const count = async (t: typeof schema.submissions | typeof schema.examStarts | typeof schema.inquiries) =>
        (await db.select().from(t).where(eq(t.assignmentId, id)).all()).length;
      expect([await count(schema.submissions), await count(schema.examStarts), await count(schema.inquiries)]).toEqual([0, 0, 0]);
      expect(await db.select().from(schema.inquiryMessages).all()).not.toContainEqual(expect.objectContaining({ body: "질문" }));
      expect(await inquiries.countStudentUnread(student)).toBe(0);
    } finally {
      await db.run(sql`PRAGMA foreign_keys = ON`);
    }
  });

  it("seeds demo questions for guest teachers and students", async () => {
    const teacherId = await users.createGuestUser("teacher");
    expect(await inquiries.countTeacherOpenInquiries(teacherId)).toBe(2);
    expect(await inquiries.listTeacherInquiries(teacherId)).toHaveLength(3);
    const studentId = await users.createGuestUser("student");
    expect(await inquiries.countStudentUnread(studentId)).toBe(1);
  });
});
