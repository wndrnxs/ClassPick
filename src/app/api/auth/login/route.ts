import { LoginInput } from "@/lib/schemas";
import { homePathFor } from "@/server/auth/dal";
import { createSession } from "@/server/auth/session";
import { handle, readJson } from "@/server/http";
import { authenticate } from "@/server/services/users";

export const POST = handle(async (request: Request) => {
  const { email, password } = await readJson(request, LoginInput);
  const user = await authenticate(email, password);
  await createSession(user.id);
  return Response.json({ ok: true, home: homePathFor(user) });
});
