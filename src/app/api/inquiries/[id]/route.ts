import type { NextRequest } from "next/server";

import { InquiryUpdateInput } from "@/lib/schemas";
import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { setInquiryPublic } from "@/server/services/inquiries";

/** 선생님: 질문·답변을 반 전체에 공개 / 비공개 */
export const PATCH = handle(async (request: NextRequest, ctx: RouteContext<"/api/inquiries/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { isPublic } = await readJson(request, InquiryUpdateInput);
  await setInquiryPublic(user.id, id, isPublic);
  return Response.json({ ok: true });
});
