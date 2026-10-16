import { LoginInput } from "@/lib/schemas";
import { createSession } from "@/server/auth/session";
import { handle, readJson } from "@/server/http";
import { authenticate } from "@/server/services/users";

export const POST = handle(async (request: Request) => {
  const { email, password } = await readJson(request, LoginInput);
  const userId = await authenticate(email, password);
  await createSession(userId);
  return Response.json({ ok: true });
});
