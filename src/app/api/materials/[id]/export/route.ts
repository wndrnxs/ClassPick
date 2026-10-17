import type { NextRequest } from "next/server";

import { requireApiUser } from "@/server/auth/dal";
import { exportResponse, parseExportQuery } from "@/server/export/respond";
import { handle } from "@/server/http";
import { getMaterial } from "@/server/services/materials";

/** GET /api/materials/:id/export?format=hwpx|docx&audience=teacher|student&types=mcq,ox */
export const GET = handle(async (request: NextRequest, ctx: RouteContext<"/api/materials/[id]/export">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const query = parseExportQuery(request.nextUrl.searchParams);
  return exportResponse(await getMaterial(user.id, id), query);
});
