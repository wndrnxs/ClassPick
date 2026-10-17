import type { NextRequest } from "next/server";

import { requireApiStudent } from "@/server/auth/dal";
import { handle } from "@/server/http";
import { startAssignment } from "@/server/services/classroom";

/** 학생: 응시 시작 — 서버에 시작 시각을 기록하고 남은 시간을 돌려줍니다. (여러 번 호출해도 처음 기록 유지) */
export const POST = handle(async (_request: NextRequest, ctx: RouteContext<"/api/assignments/[id]/start">) => {
  const user = await requireApiStudent();
  const { id } = await ctx.params;
  return Response.json(await startAssignment(user.id, id));
});
