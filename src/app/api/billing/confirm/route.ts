import { z } from "zod";

import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { confirmTossPayment } from "@/server/services/billing";

/** 토스페이먼츠 결제 성공 리다이렉트 이후 서버 승인 */
export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const params = await readJson(
    request,
    z.object({ paymentKey: z.string().min(1), orderId: z.string().min(1), amount: z.number().int().positive() }),
  );
  return Response.json(await confirmTossPayment(user.id, params));
});
