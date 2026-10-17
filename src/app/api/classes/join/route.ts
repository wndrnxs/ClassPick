import { JoinClassInput } from "@/lib/schemas";
import { requireApiStudent } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { joinClass } from "@/server/services/classroom";

/** 학생: 선생님이 알려 준 6자리 참여 코드로 반에 들어갑니다. */
export const POST = handle(async (request: Request) => {
  const user = await requireApiStudent();
  const { code } = await readJson(request, JoinClassInput);
  return Response.json({ class: await joinClass(user.id, code) });
});
