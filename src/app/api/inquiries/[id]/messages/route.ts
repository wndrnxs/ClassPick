import type { NextRequest } from "next/server";

import { InquiryMessageInput } from "@/lib/schemas";
import { getCurrentUser } from "@/server/auth/dal";
import { HttpError, handle, readJson } from "@/server/http";
import { postInquiryMessage } from "@/server/services/inquiries";

/** 선생님 답변 또는 학생 추가 질문 */
export const POST = handle(async (request: NextRequest, ctx: RouteContext<"/api/inquiries/[id]/messages">) => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  const { id } = await ctx.params;
  const { body } = await readJson(request, InquiryMessageInput);
  return Response.json(await postInquiryMessage(user, id, body), { status: 201 });
});
