import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { MaterialDTO, PassageMaterialDTO } from "@/lib/material-dto";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-edit-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.CLASSPICK_AI_MODE = "demo";

let users: typeof import("@/server/services/users");
let materials: typeof import("@/server/services/materials");
let classroom: typeof import("@/server/services/classroom");

beforeAll(async () => {
  users = await import("@/server/services/users");
  materials = await import("@/server/services/materials");
  classroom = await import("@/server/services/classroom");
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const signup = (email: string) =>
  users.registerUser({ name: email, email, password: "password123", role: "teacher", organization: "", agreeTerms: true });

/** 화면에서 보내는 것과 같은 형태의 수정 요청 */
const editOf = (m: MaterialDTO, patch: (draft: { title: string; author: string; sourceNote: string; sourceText: string; content: Record<string, unknown> }) => void) => {
  const draft = structuredClone({ title: m.title, author: m.author, sourceNote: m.sourceNote, sourceText: m.sourceText, content: m.content as Record<string, unknown> });
  patch(draft);
  return { kind: m.kind, ...draft };
};

describe("editing a generated material", () => {
  it("updates title, passage and generated items, recomputing derived fields", async () => {
    const teacher = await signup("edit@test.kr");
    const ids = await materials.seedSampleMaterials(teacher);
    const before = (await materials.getMaterial(teacher, ids.azalea)) as PassageMaterialDTO;

    const updated = (await materials.updateMaterial(
      teacher,
      ids.azalea,
      editOf(before, (d) => {
        d.title = "진달래꽃 (수정)";
        d.sourceText = `<b>나 보기가</b> ${d.sourceText.slice(6)}`;
        const c = d.content as PassageMaterialDTO["content"];
        c.mcq!.questions[1].options[2] = "반어적 표현을 통해 이별의 슬픔을 강조한다.";
        c.mcq!.questions[1].answer = 3;
        c.vocab!.items[0].answer = "즈 려 밟다";
      }),
    )) as PassageMaterialDTO;

    expect(updated.title).toBe("진달래꽃 (수정)");
    expect(updated.sourceText.startsWith("<b>나 보기가</b>")).toBe(true);
    expect(updated.content.mcq!.questions[1].options[2]).toBe("반어적 표현을 통해 이별의 슬픔을 강조한다.");
    expect(updated.content.mcq!.questions[1].answer).toBe(3);
    expect(updated.content.vocab!.items[0]).toMatchObject({ answer: "즈려밟다", initials: "ㅈㄹㅂㄷ" });
    expect(Object.keys(updated.content).sort()).toEqual(Object.keys(before.content).sort());
    // 다시 읽어도 같은 값
    expect((await materials.getMaterial(teacher, ids.azalea)).title).toBe("진달래꽃 (수정)");
  });

  it("rejects broken questions with a readable location", async () => {
    const teacher = await signup("edit2@test.kr");
    const ids = await materials.seedSampleMaterials(teacher);
    const m = await materials.getMaterial(teacher, ids.azalea);
    await expect(
      materials.updateMaterial(teacher, ids.azalea, editOf(m, (d) => ((d.content as PassageMaterialDTO["content"]).mcq!.questions[0].options[3] = " "))),
    ).rejects.toThrow(/5지선다 1번 · 선지 4: 선지을\(를\) 입력해 주세요/);
    await expect(
      materials.updateMaterial(teacher, ids.azalea, editOf(m, (d) => ((d.content as PassageMaterialDTO["content"]).mcq!.questions[0].answer = 6))),
    ).rejects.toThrow(/정답 번호는 1~5/);
    await expect(materials.updateMaterial(teacher, ids.azalea, editOf(m, (d) => (d.title = "  ")))).rejects.toThrow(/제목을 입력/);
    // 다른 종류로 바꿀 수 없음
    await expect(materials.updateMaterial(teacher, ids.azalea, { ...editOf(m, () => {}), kind: "ocr", content: { ocr: { text: "x" } } })).rejects.toThrow(
      /자료 종류/,
    );
    // 다른 사람의 자료는 찾을 수 없음
    const other = await signup("edit3@test.kr");
    await expect(materials.updateMaterial(other, ids.azalea, editOf(m, () => {}))).rejects.toThrow(/찾을 수 없습니다/);
  });

  it("keeps distributed exams on their snapshot and syncs the exam-set title", async () => {
    const teacher = await signup("edit4@test.kr");
    const ids = await materials.seedSampleMaterials(teacher);
    const cls = await classroom.createClass(teacher, "1반");
    const { id: assignmentId } = await classroom.createAssignment(teacher, { materialId: ids.azalea, classId: cls.id, title: "형성평가", revealAnswers: true });
    const m = (await materials.getMaterial(teacher, ids.azalea)) as PassageMaterialDTO;
    const stem = m.content.mcq!.questions[0].stem;
    await materials.updateMaterial(teacher, ids.azalea, editOf(m, (d) => ((d.content as PassageMaterialDTO["content"]).mcq!.questions[0].stem = "바뀐 발문")));
    const report = await classroom.getAssignmentReport(teacher, assignmentId);
    expect(JSON.stringify(report.snapshot)).toContain(stem);
    expect(JSON.stringify(report.snapshot)).not.toContain("바뀐 발문");

    const set = await materials.composeExamSetMaterial(teacher, {
      title: "중간고사",
      school: "",
      grade: "",
      timeLimit: null,
      sections: [{ materialId: ids.azalea, include: ["mcq"] }],
    });
    const edited = await materials.updateMaterial(teacher, set.id, editOf(set, (d) => (d.title = "기말고사")));
    expect(edited.title).toBe("기말고사");
    expect((edited as Extract<MaterialDTO, { kind: "exam_set" }>).content.exam.title).toBe("기말고사");
  });
});
