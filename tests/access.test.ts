import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classpick-access-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.CLASSPICK_AI_MODE = "claude"; // API 키가 있다고 가정
process.env.CLASSPICK_MASTER_EMAIL = "Master@ClassPick.kr";
process.env.CLASSPICK_MASTER_PASSWORD = "very-long-master-pass";
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

let users: typeof import("@/server/services/users");
let access: typeof import("@/server/ai/access");
let envMod: typeof import("@/server/env");
let points: typeof import("@/server/services/points");

beforeAll(async () => {
  users = await import("@/server/services/users");
  access = await import("@/server/ai/access");
  envMod = await import("@/server/env");
  points = await import("@/server/services/points");
});

describe("AI access by account", () => {
  it("keeps guest accounts on the demo engine even when an API key is set", () => {
    expect(access.demoReasonFor({ email: "guest-1@guest.classpick.local", isGuest: true })).toBe("guest");
    expect(access.engineFor({ email: "t@school.kr", isGuest: false })).toBe("claude");
  });

  it("limits real AI to operators and the master account in admins-only mode", () => {
    envMod.env.aiUsers = "admins";
    try {
      expect(access.demoReasonFor({ email: "t@school.kr", isGuest: false })).toBe("restricted");
      expect(access.engineFor({ email: "master@classpick.kr", isGuest: false })).toBe("claude");
    } finally {
      envMod.env.aiUsers = "members";
    }
  });
});

describe("master account", () => {
  it("exists only through environment variables and keeps a full token balance", async () => {
    await expect(users.authenticate("master@classpick.kr", "wrong-password-xx")).rejects.toThrow(/올바르지 않습니다/);
    const first = await users.authenticate("MASTER@classpick.kr", "very-long-master-pass");
    expect(first.role).toBe("teacher");
    expect(await points.getBalance(first.id)).toBe(users.MASTER_TOKENS);

    await points.debitPoints(first.id, 500, "테스트 사용", "x");
    const again = await users.authenticate("master@classpick.kr", "very-long-master-pass");
    expect(again.id).toBe(first.id);
    expect(await points.getBalance(first.id)).toBe(users.MASTER_TOKENS);

    await expect(
      users.registerUser({ name: "가짜", email: "master@classpick.kr", password: "password123", role: "teacher", organization: "", agreeTerms: true }),
    ).rejects.toThrow(/사용할 수 없는 이메일/);
    expect(envMod.isOperatorEmail("master@classpick.kr")).toBe(true);
  });

  it("is disabled when the password is too short", () => {
    const saved = envMod.env.masterPassword;
    envMod.env.masterPassword = "short";
    try {
      expect(envMod.masterEnabled()).toBe(false);
      expect(envMod.isOperatorEmail("master@classpick.kr")).toBe(false);
    } finally {
      envMod.env.masterPassword = saved;
    }
  });
});

describe("master account settings from the dashboard", () => {
  it("ignores stray quotes and spaces pasted around the values", async () => {
    const saved = { e: process.env.CLASSPICK_MASTER_EMAIL, p: process.env.CLASSPICK_MASTER_PASSWORD };
    process.env.CLASSPICK_MASTER_EMAIL = ' "Boss@ClassPick.kr" ';
    process.env.CLASSPICK_MASTER_PASSWORD = "'another-long-pass' \n";
    try {
      const { vi } = await import("vitest");
      vi.resetModules();
      const fresh = await import("@/server/env");
      expect(fresh.env.masterEmail).toBe("boss@classpick.kr");
      expect(fresh.env.masterPassword).toBe("another-long-pass");
    } finally {
      process.env.CLASSPICK_MASTER_EMAIL = saved.e;
      process.env.CLASSPICK_MASTER_PASSWORD = saved.p;
    }
  });
});
