import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-usage-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.CLASSPICK_AI_MODE = "demo";

let usage: typeof import("@/server/ai/usage");
let aiUsage: typeof import("@/server/services/ai-usage");
let users: typeof import("@/server/services/users");

beforeAll(async () => {
  usage = await import("@/server/ai/usage");
  aiUsage = await import("@/server/services/ai-usage");
  users = await import("@/server/services/users");
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const zero = { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 };

describe("AI cost estimation", () => {
  it("prices input, output (incl. thinking) and cache tokens per model", () => {
    expect(usage.estimateCostUsd("claude-opus-5-5", { ...zero, inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(24);
    expect(usage.estimateCostUsd("claude-opus-5-5", { ...zero, cacheWriteTokens: 1_000_000 })).toBe(5);
    expect(usage.estimateCostUsd("claude-opus-5-5", { ...zero, cacheReadTokens: 1_000_000 })).toBe(0.2);
    expect(usage.estimateCostUsd("claude-sonnet-5-5", { ...zero, inputTokens: 21_000, outputTokens: 25_000 })).toBeCloseTo(0.292, 6);
    expect(usage.estimateCostUsd("some-unknown-model", { ...zero, inputTokens: 10 })).toBeNull();
  });

  it("maps an API response's usage block", () => {
    const entry = usage.usageFromMessage(
      "mcq",
      { model: "claude-opus-5-5", usage: { input_tokens: 3000, output_tokens: 6000, cache_creation_input_tokens: 1000, cache_read_input_tokens: null } },
      4200,
      "ok",
    );
    expect(entry).toMatchObject({ feature: "mcq", inputTokens: 3000, outputTokens: 6000, cacheWriteTokens: 1000, cacheReadTokens: 0, durationMs: 4200 });
    expect(entry.costUsd).toBeCloseTo((3000 * 4 + 1000 * 5 + 6000 * 20) / 1_000_000, 6);
  });
});

describe("usage log persistence", () => {
  it("records calls for successful and failed jobs and aggregates them", async () => {
    const userId = await users.registerUser({ name: "운영", email: "ops@test.kr", password: "password123", role: "teacher", organization: "", agreeTerms: true });
    const call = (feature: "mcq" | "ox", out: number) =>
      usage.usageFromMessage(feature, { model: "claude-opus-5-5", usage: { input_tokens: 3000, output_tokens: out } }, 1000, "ok");

    await aiUsage.withUsageLog(userId, "job-ok", "passage", async (log) => {
      log.add(call("mcq", 6000));
      log.add(call("ox", 2000));
      return "done";
    });
    await expect(
      aiUsage.withUsageLog(userId, "job-fail", "passage", async (log) => {
        log.add(call("mcq", 6000));
        throw new Error("AI 실패");
      }),
    ).rejects.toThrow("AI 실패");

    const report = await aiUsage.getUsageReport(null);
    expect(report.total.calls).toBe(3);
    expect(report.total.jobCount).toBe(2);
    expect(report.total.outputTokens).toBe(14_000);
    expect(report.features.find((f) => f.feature === "mcq")).toMatchObject({ calls: 2, avgOutput: 6000 });
    const failed = report.jobs.find((j) => j.refId === "job-fail");
    expect(failed?.succeeded).toBe(false);
    expect(failed?.userEmail).toBe("ops@test.kr");
    expect(report.jobs.find((j) => j.refId === "job-ok")?.costUsd).toBeCloseTo((6000 * 4 + 8000 * 20) / 1_000_000, 6);
  });

  it("records nothing for the demo engine", async () => {
    const userId = await users.createGuestUser("teacher");
    const before = (await aiUsage.getUsageReport(null)).total.calls;
    const materials = await import("@/server/services/materials");
    await materials.createPassageMaterial(userId, {
      title: "",
      author: "",
      sourceNote: "",
      passage: "나 보기가 역겨워\n가실 때에는\n말없이 고이 보내 드리우리다",
      types: ["mcq"],
      settings: { schoolLevel: "high", grade: "", difficulty: "standard", genre: "auto", counts: { mcq: 3, short_answer: 2, ox: 6, vocab: 6 } },
    });
    expect((await aiUsage.getUsageReport(null)).total.calls).toBe(before);
  });
});
