import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { SIGNUP_BONUS_TOKENS } from "@/lib/catalog";
import type { SignupInput } from "@/lib/schemas";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { getDb, schema } from "@/server/db/client";
import { env, masterEnabled } from "@/server/env";
import { HttpError } from "@/server/http";
import { creditPoints } from "./points";
import { seedStudentClassroom, seedTeacherClassroom } from "./classroom-demo";
import { seedSampleMaterials } from "./materials";

export async function registerUser(input: SignupInput) {
  if (env.masterEmail && input.email.toLowerCase() === env.masterEmail) {
    throw new HttpError(409, "사용할 수 없는 이메일입니다. 다른 이메일로 가입해 주세요.");
  }
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
  // 토큰은 자료를 만드는 선생님 계정에만 지급합니다.
  if (input.role !== "student") await creditPoints(id, SIGNUP_BONUS_TOKENS, "signup_bonus", "가입 축하 무료 체험 토큰");
  return id;
}

/* ------------------------------------------------------------------ */
/* 마스터 계정                                                            */
/* ------------------------------------------------------------------ */

/** 마스터 계정 토큰: 로그인할 때마다 이만큼으로 채워 사실상 무제한으로 씁니다. */
export const MASTER_TOKENS = 100_000;

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * 마스터 계정 로그인: 가입 절차 없이 환경 변수(CLASSPICK_MASTER_EMAIL / _PASSWORD)로만 존재합니다.
 * 비밀번호는 환경 변수가 기준이라 바꾸면 바로 반영되고, 계정은 첫 로그인 때 만들어집니다.
 * 운영자 권한(사용량 화면)과 실제 AI 사용이 허용되며, 체험 계정이 아니므로 데이터가 계속 남습니다.
 */
async function signInMaster(password: string) {
  if (!sameSecret(password, env.masterPassword)) throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
  const db = await getDb();
  let user = await db.select().from(schema.users).where(eq(schema.users.email, env.masterEmail)).get();
  if (!user) {
    user = await db
      .insert(schema.users)
      .values({
        id: randomUUID(),
        email: env.masterEmail,
        name: "마스터",
        // 실제 비밀번호 확인은 환경 변수로 하므로 DB에는 쓸 수 없는 값을 둡니다.
        passwordHash: await hashPassword(randomUUID()),
        role: "teacher",
        organization: "클래스픽 운영",
        createdAt: new Date(),
      })
      .returning()
      .get();
  }
  if (user.role === "student") await db.update(schema.users).set({ role: "teacher" }).where(eq(schema.users.id, user.id)).run();
  if (user.points < MASTER_TOKENS) await creditPoints(user.id, MASTER_TOKENS - user.points, "adjustment", "마스터 계정 토큰 충전");
  return { id: user.id, role: "teacher" as const };
}

export async function authenticate(email: string, password: string) {
  if (masterEnabled() && email.toLowerCase() === env.masterEmail) return signInMaster(password);
  const user = await (await getDb()).select().from(schema.users).where(eq(schema.users.email, email)).get();
  // 사용자 존재 여부와 관계없이 같은 시간이 걸리도록 해시 비교를 수행합니다.
  const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$00$00");
  if (!user || !ok) throw new HttpError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
  return { id: user.id, role: user.role };
}

async function insertGuest(role: "teacher" | "student", name: string, organization: string) {
  const id = randomUUID();
  await (await getDb())
    .insert(schema.users)
    .values({
      id,
      email: `guest-${id.slice(0, 8)}@guest.classpick.local`,
      name,
      passwordHash: await hashPassword(randomUUID()),
      role,
      organization,
      isGuest: true,
      createdAt: new Date(),
    })
    .run();
  return id;
}

/**
 * 체험 계정: 가입 없이 둘러볼 수 있는 임시 계정을 만듭니다.
 * - 선생님: 샘플 자료 + 학생 12명의 응시 결과가 있는 체험반
 * - 학생: 체험반 소속, 이미 푼 시험 2개 + 풀 수 있는 시험 1개
 */
export async function createGuestUser(role: "teacher" | "student" = "teacher") {
  if (role === "student") {
    const teacherId = await insertGuest("teacher", "김국어", "클래스픽고등학교");
    const materialIds = await seedSampleMaterials(teacherId);
    const id = await insertGuest("student", "체험 학생", "클래스픽고등학교");
    await seedStudentClassroom(id, teacherId, materialIds);
    return id;
  }
  const id = await insertGuest("teacher", "게스트", "클래스픽 체험");
  await creditPoints(id, SIGNUP_BONUS_TOKENS, "signup_bonus", "체험 계정 무료 토큰");
  const materialIds = await seedSampleMaterials(id);
  await seedTeacherClassroom(id, materialIds);
  return id;
}
