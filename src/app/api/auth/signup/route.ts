import { SignupInput } from "@/lib/schemas";
import { homePathFor } from "@/server/auth/dal";
import { createSession } from "@/server/auth/session";
import { handle, readJson } from "@/server/http";
import { registerUser } from "@/server/services/users";

export const POST = handle(async (request: Request) => {
  const input = await readJson(request, SignupInput);
  const userId = await registerUser(input);
  await createSession(userId);
  return Response.json({ ok: true, home: homePathFor(input) }, { status: 201 });
});
