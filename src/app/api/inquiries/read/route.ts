import { InquiryReadInput } from "@/lib/schemas";
import { requireApiStudent } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { markInquiriesRead } from "@/server/services/inquiries";

/** 학생: 시험 결과 화면에서 선생님 답변을 확인함 → '새 답변' 표시 해제 */
export const POST = handle(async (request: Request) => {
  const user = await requireApiStudent();
  const { assignmentId } = await readJson(request, InquiryReadInput);
  await markInquiriesRead(user.id, assignmentId);
  return Response.json({ ok: true });
});
