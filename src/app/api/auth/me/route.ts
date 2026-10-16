import { getCurrentUser } from "@/server/auth/dal";
import { handle } from "@/server/http";

export const GET = handle(async () => {
  const user = await getCurrentUser();
  return Response.json({ user });
});
