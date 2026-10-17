import { ComposeExamInput } from "@/lib/schemas";
import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { composeExamSetMaterial } from "@/server/services/materials";

export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const input = await readJson(request, ComposeExamInput);
  const material = await composeExamSetMaterial(user.id, input);
  return Response.json({ material }, { status: 201 });
});
