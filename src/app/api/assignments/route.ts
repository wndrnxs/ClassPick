import { CreateAssignmentInput } from "@/lib/schemas";
import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { createAssignment } from "@/server/services/classroom";

/** 선생님: 자료(5지선다·OX 포함)를 반 학생들에게 시험으로 배포합니다. */
export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const input = await readJson(request, CreateAssignmentInput);
  return Response.json({ assignment: await createAssignment(user.id, input) }, { status: 201 });
});
