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

    // 시작 기록은 한 번만 남고, 응시 시간은 서버 시작 기록으로 계산
    const started = await classroom.startAssignment(student, id);
    expect(started).toMatchObject({ remainingSec: null, timeLimitMin: null });
    expect((await classroom.getStudentAssignment(student, id)).state === "todo").toBe(true);
    const result = await classroom.submitAnswers(student, id, {
      answers: { "s0-m0": 2, "s0-o0": false },
      durationSec: 99999,
      timings: { "s0-m0": 75, "s0-o0": 12, bogus: 3 },
    });
    expect(result).toMatchObject({ score: 22, correctCount: 2, total: 9, overtime: false });
    expect(result.durationSec).toBeLessThan(5);
    await expect(classroom.startAssignment(student, id)).rejects.toThrow(/이미 제출/);
    await expect(classroom.submitAnswers(student, id, { answers: {}, durationSec: null })).rejects.toThrow(/이미 제출/);

    // 정답 비공개 시험: 결과에 정답이 없음
    const after = await classroom.getStudentAssignment(student, id);
    expect(after.state).toBe("done");
    expect(JSON.stringify(after.exam)).not.toContain('"answer"');
    if (after.state === "done") {
      expect(after.result.timings).toEqual({ "s0-m0": 75, "s0-o0": 12 });
      expect(after.result.classAvgTimes).toEqual({}); // 혼자 제출 → 반 평균 없음
    }

    const report = await classroom.getAssignmentReport(teacher, id);
    expect(report.analysis.submitted).toBe(1);
    expect(report.notSubmitted).toHaveLength(0);
    expect(report.analysis.questionStats[0].avgTimeSec).toBe(75);
    await expect(classroom.getAssignmentReport(student, id)).rejects.toThrow();

    const studentReport = await classroom.getStudentReport(student);
    expect(studentReport.wrongNotes.every((n) => n.question.explanation === "")).toBe(true);

    await classroom.setAssignmentStatus(teacher, id, "closed");
    const late = await signup("late@test.kr", "student");
    await classroom.joinClass(late, cls.joinCode);
    await expect(classroom.submitAnswers(late, id, { answers: {}, durationSec: null })).rejects.toThrow(/마감/);
  });

  it("records server-side start time and flags submissions after the time limit", async () => {
    const teacher = await signup("t2@test.kr", "teacher");
    const student = await signup("s2@test.kr", "student");
    const ids = await materials.seedSampleMaterials(teacher);
    const cls = await classroom.createClass(teacher, "2반");
    await classroom.joinClass(student, cls.joinCode);
    const { id } = await classroom.createAssignment(teacher, { materialId: ids.azalea, classId: cls.id, title: "시간제한", revealAnswers: true, timeLimitMin: 10 });

    const list = await classroom.listStudentAssignments(student);
    expect(list[0]).toMatchObject({ timeLimitMin: 10, inProgress: null });
    const started = await classroom.startAssignment(student, id);
    expect(started.remainingSec).toBeGreaterThan(595);
    expect((await classroom.listStudentAssignments(student))[0].inProgress?.remainingSec).toBeGreaterThan(595);

    // 시작 시각을 11분 전으로 당겨 제한 시간 초과 제출을 재현
    const { getDb, schema } = await import("@/server/db/client");
    await (await getDb()).update(schema.examStarts).set({ startedAt: new Date(Date.now() - 11 * 60_000) }).run();
    expect((await classroom.startAssignment(student, id)).remainingSec).toBe(0);
    const result = await classroom.submitAnswers(student, id, { answers: {}, durationSec: null });
    expect(result.overtime).toBe(true);
    const report = await classroom.getAssignmentReport(teacher, id);
    expect(report.assignment.timeLimitMin).toBe(10);
    expect(report.submissions[0].overtime).toBe(true);
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
    expect(report.timing.timedCount).toBeGreaterThan(0);
    expect(mine.every((a) => a.timeLimitMin !== null)).toBe(true);
    const teacherReport = await classroom.getAssignmentReport(teacherId, list[0].id);
    expect(teacherReport.submissions.filter((s) => s.overtime)).toHaveLength(1);
    expect(teacherReport.analysis.timing.slowest).toHaveLength(3);
  });
});
