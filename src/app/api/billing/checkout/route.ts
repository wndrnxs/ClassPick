import { z } from "zod";

import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { startCheckout } from "@/server/services/billing";

export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const { packId } = await readJson(request, z.object({ packId: z.string().min(1) }));
  return Response.json(await startCheckout(user.id, packId));
});
