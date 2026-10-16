import { destroySession } from "@/server/auth/session";
import { handle } from "@/server/http";

export const POST = handle(async () => {
  await destroySession();
  return Response.json({ ok: true });
});
