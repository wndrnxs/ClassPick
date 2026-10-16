import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { SIGNUP_BONUS_PENCILS } from "@/lib/catalog";
import type { SignupInput } from "@/lib/schemas";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { getDb, schema } from "@/server/db/client";
import { HttpError } from "@/server/http";
import { creditPoints } from "./points";
import { seedSampleMaterials } from "./materials";

export async function registerUser(input: SignupInput) {
  const db = await getDb();
  const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email)).get();
  if (exists) throw new HttpError(409, "이미 가입된 이메일입니다. 로그인해 주세요.");

  const id = randomUUID();
  await db
    .insert(schema.users)
    .values({
      id,
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      organization: input.organization,
      createdAt: new Date(),
    })
    .run();
  await creditPoints(id, SIGNUP_BONUS_PENCILS, "signup_bonus", "가입 축하 무료 체험 토큰");
  return id;
}

export async function authenticate(email: string, password: string) {
  const user = await (await getDb()).select().from(schema.users).where(eq(schema.users.email, email)).get();
  // 사용자 존재 여부와 관계없이 같은 시간이 걸리도록 해시 비교를 수행합니다.
  const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$00$00");
  if (!user || !ok) throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
  return user.id;
}

/** 체험 계정: 가입 없이 둘러볼 수 있도록 샘플 자료가 담긴 임시 계정을 만듭니다. */
export async function createGuestUser() {
  const id = randomUUID();
  await (await getDb())
    .insert(schema.users)
    .values({
      id,
      email: `guest-${id.slice(0, 8)}@guest.classpick.local`,
      name: "게스트",
      passwordHash: await hashPassword(randomUUID()),
      role: "teacher",
      organization: "클래스픽 체험",
      isGuest: true,
      createdAt: new Date(),
    })
    .run();
  await creditPoints(id, SIGNUP_BONUS_PENCILS, "signup_bonus", "체험 계정 무료 토큰");
  await seedSampleMaterials(id);
  return id;
}
