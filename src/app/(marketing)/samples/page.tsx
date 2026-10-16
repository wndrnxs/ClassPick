import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";
import { Badge } from "@/components/ui/badge";
import { MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import { SAMPLES } from "@/lib/samples";

export const metadata: Metadata = {
  title: "생성 샘플",
  description: "현대시·현대소설·비문학 지문으로 만든 클래스픽 생성 샘플을 둘러보고 HWPX·DOCS·PDF로 내려받아 보세요.",
};

export default function SamplesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="Samples"
        title="생성 샘플 자료 둘러보기"
        description="실제 클래스픽 출력물입니다. 화면에서 확인하고, HWPX·DOCS 파일로 내려받아 한글·Word에서 직접 편집해 보세요."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {SAMPLES.map((s) => {
          const types = MATERIAL_TYPE_ORDER.filter((t) => s.content[t]);
          return (
            <article key={s.slug} className="group flex flex-col rounded-2xl border bg-white p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <Badge variant="soft" className="w-fit">
                {s.category}
              </Badge>
              <h2 className="mt-4 text-xl font-extrabold tracking-tight">{s.title}</h2>
              <p className="text-sm font-semibold text-muted-foreground">{s.author}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.description}</p>
              <p className="passage mt-4 line-clamp-4 rounded-xl bg-surface p-4 text-sm whitespace-pre-line text-slate-700">{s.passage}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {types.map((t) => (
                  <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {MATERIAL_TYPE_META[t].shortLabel}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-1 items-end gap-2">
                <Link
                  href={`/samples/${s.slug}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-deep"
                >
                  자세히 보기 <ArrowRight className="size-4" />
                </Link>
                <a
                  href={`/api/samples/${s.slug}/export?format=hwpx`}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  <Download className="size-4" /> HWPX
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
