import { AskQuestionInput } from "@/lib/schemas";
import { requireApiStudent } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { askQuestion } from "@/server/services/inquiries";

/** 학생: 제출한 시험의 문항에 대해 선생님께 질문 (같은 문항이면 기존 대화에 이어서) */
export const POST = handle(async (request: Request) => {
  const user = await requireApiStudent();
  const input = await readJson(request, AskQuestionInput);
  return Response.json({ inquiry: await askQuestion(user.id, input) }, { status: 201 });
});
