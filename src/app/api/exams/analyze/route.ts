import { AnalyzeExamInput } from "@/lib/schemas";
import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { createExamReportMaterial } from "@/server/services/materials";

export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const input = await readJson(request, AnalyzeExamInput);
  const material = await createExamReportMaterial(user.id, input);
  return Response.json({ material }, { status: 201 });
});
