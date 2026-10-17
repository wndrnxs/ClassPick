import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-classroom-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.CLASSPICK_AI_MODE = "demo";

let users: typeof import("@/server/services/users");
let classroom: typeof import("@/server/services/classroom");
let materials: typeof import("@/server/services/materials");

beforeAll(async () => {
  users = await import("@/server/services/users");
  classroom = await import("@/server/services/classroom");
  materials = await import("@/server/services/materials");
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const signup = (email: string, role: "teacher" | "student") =>
  users.registerUser({ name: role === "student" ? "학생" : "선생님", email, password: "password123", role, organization: "", agreeTerms: true });

describe("classroom flow", () => {
  it("distributes an exam, lets only members take it once, and grades on the server", async () => {
    const teacher = await signup("t@test.kr", "teacher");
    const student = await signup("s@test.kr", "student");
    const outsider = await signup("o@test.kr", "student");
    const ids = await materials.seedSampleMaterials(teacher);

    const cls = await classroom.createClass(teacher, "1반");
    expect(cls.joinCode).toMatch(/^[A-Z2-9]{6}$/);
    await classroom.joinClass(student, cls.joinCode);
    await classroom.joinClass(student, cls.joinCode); // 중복 참여는 무시

    const { id } = await classroom.createAssignment(teacher, { materialId: ids.azalea, classId: cls.id, title: "형성평가", revealAnswers: false });

    // 학생 목록: 받은 시험만 보임
    expect((await classroom.listStudentAssignments(student)).map((a) => a.id)).toEqual([id]);
    expect(await classroom.listStudentAssignments(outsider)).toEqual([]);
    await expect(classroom.getStudentAssignment(outsider, id)).rejects.toThrow(/찾을 수 없습니다/);

    // 응시 전에는 정답이 전달되지 않음
    const before = await classroom.getStudentAssignment(student, id);
    expect(before.state).toBe("todo");
    expect(JSON.stringify(before.exam)).not.toContain('"answer"');

    const result = await classroom.submitAnswers(student, id, { answers: { "s0-m0": 2, "s0-o0": false }, durationSec: 120 });
    expect(result).toEqual({ score: 22, correctCount: 2, total: 9 });
    await expect(classroom.submitAnswers(student, id, { answers: {}, durationSec: null })).rejects.toThrow(/이미 제출/);

    // 정답 비공개 시험: 결과에 정답이 없음
    const after = await classroom.getStudentAssignment(student, id);
    expect(after.state).toBe("done");
    expect(JSON.stringify(after.exam)).not.toContain('"answer"');

    const report = await classroom.getAssignmentReport(teacher, id);
    expect(report.analysis.submitted).toBe(1);
    expect(report.notSubmitted).toHaveLength(0);
    await expect(classroom.getAssignmentReport(student, id)).rejects.toThrow();

    const studentReport = await classroom.getStudentReport(student);
    expect(studentReport.wrongNotes.every((n) => n.question.explanation === "")).toBe(true);

    await classroom.setAssignmentStatus(teacher, id, "closed");
    const late = await signup("late@test.kr", "student");
    await classroom.joinClass(late, cls.joinCode);
    await expect(classroom.submitAnswers(late, id, { answers: {}, durationSec: null })).rejects.toThrow(/마감/);
  });

  it("seeds guest teacher and student demo classrooms", async () => {
    const teacherId = await users.createGuestUser("teacher");
    const list = await classroom.listAssignments(teacherId);
    expect(list).toHaveLength(2);
    expect(list.every((a) => a.rosterSize === 12 && a.submitted >= 9)).toBe(true);

    const studentId = await users.createGuestUser("student");
    const mine = await classroom.listStudentAssignments(studentId);
    expect(mine).toHaveLength(3);
    expect(mine.filter((a) => a.submission)).toHaveLength(2);
    const report = await classroom.getStudentReport(studentId);
    expect(report.attempts).toBe(2);
  });
});
