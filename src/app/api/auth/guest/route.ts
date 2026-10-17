import { createSession } from "@/server/auth/session";
import { handle } from "@/server/http";
import { createGuestUser } from "@/server/services/users";

/** 가입 없이 체험: 샘플 자료가 담긴 체험 계정으로 로그인합니다. */
export const POST = handle(async () => {
  const userId = await createGuestUser();
  await createSession(userId);
  return Response.json({ ok: true }, { status: 201 });
});
