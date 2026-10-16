import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-test-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.CLASSPICK_AI_MODE = "demo";

type Services = {
  users: typeof import("@/server/services/users");
  points: typeof import("@/server/services/points");
  materials: typeof import("@/server/services/materials");
  pipeline: typeof import("@/server/ai/pipeline");
  http: typeof import("@/server/http");
};
let s: Services;

beforeAll(async () => {
  s = {
    users: await import("@/server/services/users"),
    points: await import("@/server/services/points"),
    materials: await import("@/server/services/materials"),
    pipeline: await import("@/server/ai/pipeline"),
    http: await import("@/server/http"),
  };
});

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const signup = (email: string) =>
  s.users.registerUser({ name: "김국어", email, password: "password123", role: "teacher", organization: "", agreeTerms: true });

describe("users & points", () => {
  it("grants the signup bonus and authenticates", async () => {
    const id = await signup("a@test.kr");
    expect(await s.points.getBalance(id)).toBe(30);
    await expect(s.users.authenticate("a@test.kr", "password123")).resolves.toBe(id);
    await expect(s.users.authenticate("a@test.kr", "wrong-password")).rejects.toThrow();
    await expect(signup("a@test.kr")).rejects.toThrow(/이미 가입/);
  });

  it("keeps an append-only ledger and blocks overdrafts", async () => {
    const id = await signup("b@test.kr");
    expect(await s.points.debitPoints(id, 10, "test")).toBe(20);
    await expect(s.points.debitPoints(id, 999, "too much")).rejects.toThrow(s.http.InsufficientPointsError);
    expect(await s.points.getBalance(id)).toBe(20);
    expect(await s.points.creditPoints(id, 5, "refund", "back")).toBe(25);
    const ledger = await s.points.listTransactions(id);
    expect(ledger.map((t) => t.delta)).toEqual([5, -10, 30]);
    expect(ledger[0].balanceAfter).toBe(25);
  });
});

describe("materials", () => {
  it("generates, lists, and owns passage materials", async () => {
    const id = await signup("c@test.kr");
    const other = await signup("d@test.kr");
    const m = await s.materials.createPassageMaterial(id, {
      title: "",
      author: "",
      sourceNote: "",
      passage: "산에는 꽃 피네\n꽃이 피네\n\n산에\n산에\n피는 꽃은\n\n산에는 꽃 지네\n꽃이 지네",
      types: ["vocab", "mcq"],
      settings: { schoolLevel: "high", grade: "고1", difficulty: "standard", genre: "auto", counts: { mcq: 2, short_answer: 1, ox: 3, vocab: 3 } },
    });
    expect(m.kind).toBe("passage");
    expect(m.pointsSpent).toBe(3);
    expect(await s.points.getBalance(id)).toBe(27);
    if (m.kind !== "passage") throw new Error("unexpected kind");
    expect(m.content.mcq?.questions).toHaveLength(2);
    for (const v of m.content.vocab!.items) expect(v.initials).toMatch(/^[ㄱ-ㅎ]+$/);
    expect(await s.materials.listMaterials(id)).toHaveLength(1);
    await expect(s.materials.getMaterial(other, m.id)).rejects.toThrow(/찾을 수 없습니다/);
  });

  it("refunds pencils when generation fails", async () => {
    const id = await signup("e@test.kr");
    const spy = vi.spyOn(s.pipeline, "generatePassageContent").mockRejectedValueOnce(new Error("AI down"));
    await expect(
      s.materials.createPassageMaterial(id, {
        title: "t",
        author: "",
        sourceNote: "",
        passage: "충분히 긴 지문입니다. 실패 시 환불을 확인합니다.",
        types: ["structure"],
        settings: { schoolLevel: "high", grade: "", difficulty: "standard", genre: "auto", counts: { mcq: 3, short_answer: 2, ox: 6, vocab: 6 } },
      }),
    ).rejects.toThrow("AI down");
    spy.mockRestore();
    expect(await s.points.getBalance(id)).toBe(30);
    expect((await s.points.listTransactions(id)).map((t) => t.reason)).toEqual(["refund", "generation", "signup_bonus"]);
  });

  it("composes an exam set from owned passage materials", async () => {
    const id = await s.users.createGuestUser();
    const passages = await s.materials.listMaterials(id, { kind: "passage" });
    expect(passages.length).toBe(3);
    const exam = await s.materials.composeExamSetMaterial(id, {
      title: "모의평가",
      school: "",
      grade: "",
      timeLimit: 50,
      sections: passages.slice(0, 2).map((p) => ({ materialId: p.id, include: ["mcq", "ox"] as ("mcq" | "ox")[] })),
    });
    if (exam.kind !== "exam_set") throw new Error("unexpected kind");
    expect(exam.content.exam.sections).toHaveLength(2);
    expect(exam.content.exam.sections.every((sec) => sec.short_answer.length === 0)).toBe(true);
  });

  it("converts text documents for free without AI", async () => {
    const id = await signup("f@test.kr");
    const m = await s.materials.createOcrMaterial(id, {
      name: "지문.txt",
      type: "text/plain",
      bytes: new TextEncoder().encode("가난한 내가\n아름다운 나타샤를 사랑해서"),
    });
    expect(m.pointsSpent).toBe(0);
    expect(m.sourceText).toContain("나타샤");
    // 이미지는 데모 모드에서 AI OCR이 불가하므로 실패하고 토큰은 환불됩니다.
    await expect(
      s.materials.createOcrMaterial(id, { name: "scan.png", type: "image/png", bytes: new Uint8Array([137, 80, 78, 71]) }),
    ).rejects.toThrow(/AI 엔진/);
    expect(await s.points.getBalance(id)).toBe(30);
  });
});
