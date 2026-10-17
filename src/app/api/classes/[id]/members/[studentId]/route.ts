import type { NextRequest } from "next/server";

import { requireApiUser } from "@/server/auth/dal";
import { handle } from "@/server/http";
import { removeStudent } from "@/server/services/classroom";

export const DELETE = handle(async (_req: NextRequest, ctx: RouteContext<"/api/classes/[id]/members/[studentId]">) => {
  const user = await requireApiUser();
  const { id, studentId } = await ctx.params;
  await removeStudent(user.id, id, studentId);
  return Response.json({ ok: true });
});
