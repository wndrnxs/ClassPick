import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PrintDocument } from "@/components/material/print-document";
import { PrintToolbar } from "@/components/material/print-toolbar";
import { getSample, SAMPLES } from "@/lib/samples";
import { sampleToMaterial } from "@/lib/samples/to-material";

export const metadata: Metadata = { title: "인쇄용 샘플", robots: { index: false } };

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ slug: s.slug }));
}

async function SamplePrint({ params, searchParams }: PageProps<"/samples/[slug]/print">) {
  const { slug } = await params;
  const sample = getSample(slug);
  if (!sample) notFound();
  const sp = await searchParams;
  const audience = sp.audience === "student" ? "student" : "teacher";
  const columns = sp.columns === "1" ? 1 : 2;
  return (
    <>
      <PrintToolbar backHref={`/samples/${slug}`} basePath={`/samples/${slug}/print`} audience={audience} hasAudience columns={columns} />
      <div className="mt-8 print:mt-0">
        <PrintDocument material={sampleToMaterial(sample)} audience={audience} columns={columns} />
      </div>
    </>
  );
}

export default function SamplePrintPage(props: PageProps<"/samples/[slug]/print">) {
  return (
    <Suspense fallback={<p className="p-10 text-center text-sm text-muted-foreground">인쇄용 문서를 준비하고 있습니다…</p>}>
      <SamplePrint {...props} />
    </Suspense>
  );
}
