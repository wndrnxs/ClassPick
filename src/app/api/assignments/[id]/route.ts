import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { deleteAssignment, setAssignmentStatus } from "@/server/services/classroom";

/** 응시 마감 / 다시 열기 */
export const PATCH = handle(async (request: NextRequest, ctx: RouteContext<"/api/assignments/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { status } = await readJson(request, z.object({ status: z.enum(["open", "closed"]) }));
  await setAssignmentStatus(user.id, id, status);
  return Response.json({ ok: true });
});

export const DELETE = handle(async (_req: NextRequest, ctx: RouteContext<"/api/assignments/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await deleteAssignment(user.id, id);
  return Response.json({ ok: true });
});
