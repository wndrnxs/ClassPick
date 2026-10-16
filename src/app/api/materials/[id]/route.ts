import type { NextRequest } from "next/server";

import { requireApiUser } from "@/server/auth/dal";
import { handle } from "@/server/http";
import { deleteMaterial, getMaterial } from "@/server/services/materials";

export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/materials/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  return Response.json({ material: getMaterial(user.id, id) });
});

export const DELETE = handle(async (_request: NextRequest, ctx: RouteContext<"/api/materials/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  deleteMaterial(user.id, id);
  return Response.json({ ok: true });
});
