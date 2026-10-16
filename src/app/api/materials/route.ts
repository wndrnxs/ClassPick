import type { NextRequest } from "next/server";

import { CreateMaterialInput, MATERIAL_KINDS, type MaterialKind } from "@/lib/schemas";
import { requireApiUser } from "@/server/auth/dal";
import { handle, readJson } from "@/server/http";
import { createPassageMaterial, listMaterials } from "@/server/services/materials";

export const GET = handle(async (request: NextRequest) => {
  const user = await requireApiUser();
  const kind = request.nextUrl.searchParams.get("kind");
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const materials = listMaterials(user.id, {
    kind: MATERIAL_KINDS.includes(kind as MaterialKind) ? (kind as MaterialKind) : undefined,
    q,
  });
  return Response.json({ materials });
});

/** 지문 → 선택한 자료 유형 생성 (연필 차감, 실패 시 환불) */
export const POST = handle(async (request: Request) => {
  const user = await requireApiUser();
  const input = await readJson(request, CreateMaterialInput);
  const material = await createPassageMaterial(user.id, input);
  return Response.json({ material }, { status: 201 });
});
