import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-gemini-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
// Claude 키 없이 Gemini 키만 있으면 자동으로 Gemini
delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_AUTH_TOKEN;
delete process.env.CLASSPICK_AI_MODE;
process.env.GEMINI_API_KEY = ' "test-gemini-key" ';
process.env.CLASSPICK_GEMINI_MODEL = "gemini-3.8-flash";
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const mcqJson = {
  questions: [
    {
      type: "표현상 특징",
      stem: "윗글에 대한 설명으로 적절한 것은?",
      bogi: null,
      options: ["① 가", "나", "다", "라", "마"],
      answer: 2,
      explanation: "해설",
      option_notes: ["1", "2", "3", "4", "5"],
      difficulty: "중",
    },
  ],
};

const ok = (text: string, usage = { promptTokenCount: 3000, cachedContentTokenCount: 1000, candidatesTokenCount: 2000, thoughtsTokenCount: 500 }, finishReason = "STOP") =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "생각 중…", thought: true }, { text }] }, finishReason }], usageMetadata: usage }), {
    status: 200,
  });
const fail = (status: number, message: string, retryDelay?: string) =>
  new Response(
    JSON.stringify({ error: { code: status, message, details: retryDelay ? [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay }] : [] } }),
    { status },
  );

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);
beforeEach(() => fetchMock.mockReset());

const ctx = {
  passage: "나 보기가 역겨워\n가실 때에는",
  title: "진달래꽃",
  author: "김소월",
  sourceNote: "",
  settings: { schoolLevel: "high" as const, grade: "", difficulty: "standard" as const, genre: "auto", counts: { mcq: 3, short_answer: 2, ox: 6, vocab: 6 } },
};

describe("Gemini engine", () => {
  it("is chosen automatically when only a Gemini key is set, for members but not guests", async () => {
    const { aiEngine, aiModelName } = await import("@/server/env");
    const { engineFor } = await import("@/server/ai/access");
    expect(aiEngine()).toBe("gemini");
    expect(aiModelName()).toBe("gemini-3.8-flash");
    expect(engineFor({ email: "t@test.kr", isGuest: false })).toBe("gemini");
    expect(engineFor({ email: "g@test.kr", isGuest: true })).toBe("demo");
  });

  it("sends a JSON-schema request and returns validated output with usage", async () => {
    const { geminiEngine } = await import("@/server/ai/gemini-engine");
    const { UsageLog } = await import("@/server/ai/usage");
    fetchMock.mockResolvedValueOnce(ok(JSON.stringify(mcqJson)));
    const log = new UsageLog();
    const out = await geminiEngine.generateSection("mcq", ctx, log);
    expect(out.questions[0].answer).toBe(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-gemini-key");
    const body = JSON.parse(String(init!.body));
    expect(body.systemInstruction.parts[0].text).toContain("국어 교사");
    expect(body.contents[0].parts[0].text).toContain("<passage>");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    const schema = JSON.stringify(body.generationConfig.responseJsonSchema);
    expect(schema).not.toContain("$schema");
    expect(schema).not.toContain("9007199254740991");
    expect(schema).toContain('"type":["string","null"]'); // bogi: 없으면 null

    expect(log.entries).toEqual([
      expect.objectContaining({ feature: "mcq", model: "gemini-3.8-flash", inputTokens: 2000, cacheReadTokens: 1000, outputTokens: 2500, status: "ok" }),
    ]);
    expect(log.entries[0].costUsd).toBeCloseTo((2000 * 0.75 + 1000 * 0.075 + 2500 * 3.75) / 1_000_000, 8);
  });

  it("waits and retries when the free tier rate limit is hit", async () => {
    const { geminiEngine } = await import("@/server/ai/gemini-engine");
    fetchMock.mockResolvedValueOnce(fail(429, "Resource has been exhausted", "0s")).mockResolvedValueOnce(ok(JSON.stringify(mcqJson)));
    await expect(geminiEngine.generateSection("mcq", ctx)).resolves.toMatchObject({ questions: [{ stem: "윗글에 대한 설명으로 적절한 것은?" }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => fail(429, "Resource has been exhausted", "0s"));
    await expect(geminiEngine.generateSection("mcq", ctx)).rejects.toThrow(/무료 사용량 한도/);
  });

  it("asks again once when the JSON does not match the schema", async () => {
    const { geminiEngine } = await import("@/server/ai/gemini-engine");
    const { UsageLog } = await import("@/server/ai/usage");
    fetchMock.mockResolvedValueOnce(ok('{"questions": [{"stem": "빠진 항목"}]}')).mockResolvedValueOnce(ok("```json\n" + JSON.stringify(mcqJson) + "\n```"));
    const log = new UsageLog();
    await expect(geminiEngine.generateSection("mcq", ctx, log)).resolves.toMatchObject({ questions: [{ answer: 2 }] });
    expect(log.entries.map((e) => e.status)).toEqual(["invalid_output", "ok"]);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]!.body)).contents[0].parts.at(-1).text).toContain("JSON 형식에 맞지 않았습니다");
  });

  it("reports safety blocks, long outputs and bad keys in Korean", async () => {
    const { geminiEngine } = await import("@/server/ai/gemini-engine");
    fetchMock.mockResolvedValueOnce(ok("", undefined, "SAFETY"));
    await expect(geminiEngine.generateSection("mcq", ctx)).rejects.toThrow(/진행하지 못했습니다/);
    fetchMock.mockResolvedValueOnce(ok("{", undefined, "MAX_TOKENS"));
    await expect(geminiEngine.generateSection("mcq", ctx)).rejects.toThrow(/너무 길어/);
    fetchMock.mockResolvedValueOnce(fail(400, "API key not valid. Please pass a valid API key."));
    await expect(geminiEngine.generateSection("mcq", ctx)).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("falls back to prompt-described JSON when the schema option is not accepted", async () => {
    const { geminiEngine } = await import("@/server/ai/gemini-engine");
    fetchMock
      .mockResolvedValueOnce(fail(400, 'Invalid JSON payload received. Unknown name "responseJsonSchema"'))
      .mockResolvedValueOnce(ok(JSON.stringify(mcqJson)));
    await expect(geminiEngine.generateSection("mcq", ctx)).resolves.toBeTruthy();
    const retry = JSON.parse(String(fetchMock.mock.calls[1][1]!.body));
    expect(retry.generationConfig.responseJsonSchema).toBeUndefined();
    expect(retry.contents[0].parts.map((p: { text: string }) => p.text).join("\n")).toContain("JSON 스키마에 정확히 맞는 JSON");
  });

  it("creates a passage material end to end and marks it as Gemini-made", async () => {
    const users = await import("@/server/services/users");
    const materials = await import("@/server/services/materials");
    fetchMock.mockImplementation(async () => ok(JSON.stringify(mcqJson)));
    const teacher = await users.registerUser({ name: "선생", email: "gem@test.kr", password: "password123", role: "teacher", organization: "", agreeTerms: true });
    const m = await materials.createPassageMaterial(teacher, {
      title: "",
      author: "",
      sourceNote: "",
      passage: "나 보기가 역겨워\n가실 때에는\n말없이 고이 보내 드리우리다",
      types: ["mcq"],
      settings: ctx.settings,
    });
    expect(m.engine).toBe("gemini");
    expect(m.kind === "passage" && m.content.mcq?.questions[0].options[0]).toBe("가"); // 선지 번호 기호는 후처리에서 제거
  });
});
