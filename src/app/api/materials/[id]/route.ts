import type { NextRequest } from "next/server";

import { requireApiUser } from "@/server/auth/dal";
import { handle, HttpError } from "@/server/http";
import { deleteMaterial, getMaterial, updateMaterial } from "@/server/services/materials";

export const GET = handle(async (_request: NextRequest, ctx: RouteContext<"/api/materials/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  return Response.json({ material: await getMaterial(user.id, id) });
});

/** 자료 수정 — 제목·지문·생성된 내용 (토큰 차감 없음) */
export const PATCH = handle(async (request: NextRequest, ctx: RouteContext<"/api/materials/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  if (Number(request.headers.get("content-length") ?? 0) > 2_000_000) throw new HttpError(413, "수정 내용이 너무 큽니다.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, "요청 본문(JSON)을 읽을 수 없습니다.");
  }
  return Response.json({ material: await updateMaterial(user.id, id, body) });
});

export const DELETE = handle(async (_request: NextRequest, ctx: RouteContext<"/api/materials/[id]">) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await deleteMaterial(user.id, id);
  return Response.json({ ok: true });
});
