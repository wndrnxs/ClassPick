import { createSession } from "@/server/auth/session";
import { handle } from "@/server/http";
import { createGuestUser } from "@/server/services/users";

/** 가입 없이 체험: ?role=student 이면 학생 체험 계정, 아니면 선생님 체험 계정 */
export const POST = handle(async (request: Request) => {
  const role = new URL(request.url).searchParams.get("role") === "student" ? "student" : "teacher";
  const userId = await createGuestUser(role);
  await createSession(userId);
  return Response.json({ ok: true, home: role === "student" ? "/student" : "/app" }, { status: 201 });
});
