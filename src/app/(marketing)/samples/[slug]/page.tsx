import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";

import { MaterialViewer } from "@/components/material/material-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSample, SAMPLES } from "@/lib/samples";
import { sampleToMaterial } from "@/lib/samples/to-material";

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(props: PageProps<"/samples/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const sample = getSample(slug);
  return { title: sample ? `${sample.title} 생성 샘플` : "생성 샘플" };
}

async function SampleViewer({ params }: { params: PageProps<"/samples/[slug]">["params"] }) {
  const { slug } = await params;
  const sample = getSample(slug);
  if (!sample) notFound();
  return (
    <MaterialViewer
      material={sampleToMaterial(sample)}
      isSample
      targets={{ exportBase: `/api/samples/${slug}/export`, printBase: `/samples/${slug}/print`, hasAudience: true, hasColumns: true }}
    />
  );
}

export default function SampleDetailPage(props: PageProps<"/samples/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/samples" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> 샘플 목록
      </Link>
      <Suspense
        fallback={
          <div className="space-y-5">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-[480px] rounded-2xl" />
          </div>
        }
      >
        <SampleViewer params={props.params} />
      </Suspense>
      <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border bg-secondary/60 p-8 text-center">
        <p className="text-lg font-extrabold">내 수업 지문으로도 바로 만들어 보세요</p>
        <Button asChild size="lg" variant="gradient">
          <Link href="/signup">
            <Sparkles /> 무료로 첫 수업 자료 만들기
          </Link>
        </Button>
      </div>
    </div>
  );
}
