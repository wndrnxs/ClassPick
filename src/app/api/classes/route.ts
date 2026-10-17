import { CreateClassInput } from "@/lib/schemas";
import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { createClass, listClasses } from "@/server/services/classroom";

export const GET = handle(async () => {
  const user = await requireApiUser();
  return Response.json({ classes: await listClasses(user.id) });
});

export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const { name } = await readJson(request, CreateClassInput);
  return Response.json({ class: await createClass(user.id, name) }, { status: 201 });
});
