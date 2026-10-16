import "server-only";

import { MATERIAL_TYPES, type MaterialType } from "@/lib/schemas";
import type { MaterialDTO } from "@/lib/material-dto";
import { safeFileName } from "@/lib/utils";
import { HttpError } from "@/server/http";
import { buildDocx } from "./docx";
import { materialToDocModel, type Audience } from "./from-material";
import { buildHwpx } from "./hwpx";

export type ExportQuery = { format: "hwpx" | "docx"; audience: Audience; types?: MaterialType[] };

const MIME = {
  hwpx: "application/hwp+zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

export function parseExportQuery(params: URLSearchParams): ExportQuery {
  const format = params.get("format") ?? "hwpx";
  if (format !== "hwpx" && format !== "docx") throw new HttpError(400, "지원하지 않는 형식입니다. (hwpx, docx)");
  const audience = params.get("audience") === "student" ? "student" : "teacher";
  const types = params
    .get("types")
    ?.split(",")
    .filter((t): t is MaterialType => (MATERIAL_TYPES as readonly string[]).includes(t));
  return { format, audience, types: types?.length ? types : undefined };
}

export async function exportResponse(material: MaterialDTO, query: ExportQuery): Promise<Response> {
  const doc = materialToDocModel(material, query.audience, query.types);
  const bytes = query.format === "hwpx" ? await buildHwpx(doc) : await buildDocx(doc);
  const suffix = material.kind === "passage" || material.kind === "exam_set" ? (query.audience === "teacher" ? "_교사용" : "_학생용") : "";
  const fileName = `${safeFileName(material.title)}${suffix}.${query.format}`;
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": MIME[query.format],
      "Content-Disposition": `attachment; filename="classpick.${query.format}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
