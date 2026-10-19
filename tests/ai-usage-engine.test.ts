import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-usage-engine-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.CLASSPICK_AI_MODE = "claude";
process.env.CLASSPICK_AI_MODEL = "claude-opus-5-5";
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

// 실제 API 대신 응답을 흉내 내는 SDK: 5지선다는 정상, OX는 길이 초과로 실패시킵니다.
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class FakeAnthropic {
    beta = {
      messages: {
        stream: (params: { messages: { content: { text: string }[] }[] }) => {
          const prompt = params.messages[0].content.map((c) => c.text).join("\n");
          const isOx = prompt.includes("[OX 오개념 퀴즈");
          return {
            finalMessage: async () => ({
              model: "claude-opus-5-5",
              stop_reason: isOx ? "max_tokens" : "end_turn",
              usage: { input_tokens: 3200, output_tokens: isOx ? 32000 : 7000, cache_creation_input_tokens: 600, cache_read_input_tokens: 0 },
              parsed_output: isOx
                ? null
                : {
                    questions: [
                      { type: "표현상 특징", stem: "윗글에 대한 설명으로 적절한 것은?", bogi: null, options: ["가", "나", "다", "라", "마"], answer: 2, explanation: "해설", option_notes: ["1", "2", "3", "4", "5"], difficulty: "중" },
                    ],
                  },
            }),
          };
        },
      },
    };
  }
  return { ...actual, default: Object.assign(FakeAnthropic, actual.default) };
});

describe("Claude engine usage capture", () => {
  it("never calls the API for guest (trial) accounts", async () => {
    const users = await import("@/server/services/users");
    const materials = await import("@/server/services/materials");
    const aiUsage = await import("@/server/services/ai-usage");
    const guest = await users.createGuestUser("teacher");
    const m = await materials.createPassageMaterial(guest, {
      title: "",
      author: "",
      sourceNote: "",
      passage: "나 보기가 역겨워\n가실 때에는",
      types: ["mcq"],
      settings: { schoolLevel: "high", grade: "", difficulty: "standard", genre: "auto", counts: { mcq: 3, short_answer: 2, ox: 6, vocab: 6 } },
    });
    expect(m.engine).toBe("demo");
    expect((await aiUsage.getUsageReport(null)).total.calls).toBe(0);
  });

  it("records every billed call, including the one that failed, and refunds the job", async () => {
    const users = await import("@/server/services/users");
    const materials = await import("@/server/services/materials");
    const aiUsage = await import("@/server/services/ai-usage");
    // 체험(게스트) 계정은 실제 AI를 쓰지 않으므로 가입한 선생님 계정으로 테스트합니다.
    const userId = await users.registerUser({ name: "선생님", email: "member@test.kr", password: "password123", role: "teacher", organization: "", agreeTerms: true });
    const input = (types: ("mcq" | "ox")[]) => ({
      title: "",
      author: "",
      sourceNote: "",
      passage: "나 보기가 역겨워\n가실 때에는\n말없이 고이 보내 드리우리다",
      types,
      settings: { schoolLevel: "high" as const, grade: "", difficulty: "standard" as const, genre: "auto", counts: { mcq: 3, short_answer: 2, ox: 6, vocab: 6 } },
    });

    const ok = await materials.createPassageMaterial(userId, input(["mcq"]));
    expect(ok.engine).toBe("claude");
    await expect(materials.createPassageMaterial(userId, input(["mcq", "ox"]))).rejects.toThrow(/지문이 너무 길어/);

    const report = await aiUsage.getUsageReport(null);
    expect(report.total.calls).toBe(3);
    const success = report.jobs.find((j) => j.refId === ok.id);
    expect(success).toMatchObject({ succeeded: true, pointsSpent: 2, title: ok.title });
    expect(success?.costUsd).toBeCloseTo((3200 * 4 + 600 * 5 + 7000 * 20) / 1_000_000, 6);
    const failed = report.jobs.find((j) => j.refId !== ok.id);
    expect(failed?.succeeded).toBe(false);
    expect(failed?.features.sort()).toEqual(["mcq", "ox"]);
    expect(report.total.failedCalls).toBe(1);
  });
});
