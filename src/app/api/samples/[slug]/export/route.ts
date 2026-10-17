import type { NextRequest } from "next/server";

import { getSample } from "@/lib/samples";
import { sampleToMaterial } from "@/lib/samples/to-material";
import { exportResponse, parseExportQuery } from "@/server/export/respond";
import { handle, HttpError } from "@/server/http";

/** 공개 샘플 자료 다운로드 — 랜딩페이지/샘플 페이지에서 실제 HWPX·DOCX를 내려받아 볼 수 있습니다. */
export const GET = handle(async (request: NextRequest, ctx: RouteContext<"/api/samples/[slug]/export">) => {
  const { slug } = await ctx.params;
  const sample = getSample(slug);
  if (!sample) throw new HttpError(404, "샘플을 찾을 수 없습니다.");
  return exportResponse(sampleToMaterial(sample), parseExportQuery(request.nextUrl.searchParams));
});
