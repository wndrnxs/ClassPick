import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PrintDocument } from "@/components/material/print-document";
import { PrintToolbar } from "@/components/material/print-toolbar";
import { requireUser } from "@/server/auth/dal";
import { HttpError } from "@/server/http";
import { getMaterial } from "@/server/services/materials";

export const metadata: Metadata = { title: "인쇄 · PDF 저장", robots: { index: false } };

async function MaterialPrint({ params, searchParams }: PageProps<"/print/materials/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const audience = (await searchParams).audience === "student" ? "student" : "teacher";
  let material;
  try {
    material = getMaterial(user.id, id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const hasAudience = material.kind === "passage" || material.kind === "exam_set";
  return (
    <>
      <PrintToolbar backHref={`/app/materials/${id}`} basePath={`/print/materials/${id}`} audience={audience} hasAudience={hasAudience} />
      <div className="mt-8 print:mt-0">
        <PrintDocument material={material} audience={audience} />
      </div>
    </>
  );
}

export default function MaterialPrintPage(props: PageProps<"/print/materials/[id]">) {
  return (
    <Suspense fallback={<p className="p-10 text-center text-sm text-muted-foreground">인쇄용 문서를 준비하고 있습니다…</p>}>
      <MaterialPrint {...props} />
    </Suspense>
  );
}
