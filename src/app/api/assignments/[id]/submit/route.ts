import type { NextRequest } from "next/server";

import { SubmitAnswersInput } from "@/lib/schemas";
import { requireApiStudent } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { submitAnswers } from "@/server/services/classroom";

/** 학생: 답안 제출 (1회) — 서버에서 채점합니다. */
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/assignments/[id]/submit">) => {
  const user = await requireApiStudent();
  const { id } = await ctx.params;
  const input = await readJson(request, SubmitAnswersInput);
  return Response.json({ result: await submitAnswers(user.id, id, input) }, { status: 201 });
});
