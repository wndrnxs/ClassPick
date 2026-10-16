"use client";

import { useState, type ReactNode } from "react";
import { Download, FileText, Printer } from "lucide-react";

import { cn } from "@/lib/utils";

export type PreviewPanel = { id: string; label: string; icon: ReactNode; content: ReactNode };

/** 히어로 영역의 인터랙티브 미리보기 카드 (탭 전환 + 실제 샘플 다운로드) */
export function HeroPreview({ panels, sampleSlug }: { panels: PreviewPanel[]; sampleSlug: string }) {
  const [active, setActive] = useState(panels[0].id);
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-blue-400/25 via-indigo-300/20 to-emerald-300/20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_30px_80px_-30px_rgb(30_64_175/0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b bg-slate-50/80 px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-red-300" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-emerald-300" />
          </div>
          <p className="truncate text-xs font-semibold text-slate-500">
            진달래꽃 · 김소월 <span className="text-slate-300">|</span> 고1 문학 · 표준 난이도
          </p>
        </div>
        <div role="tablist" aria-label="생성 자료 미리보기" className="flex gap-1 overflow-x-auto border-b px-2 pt-2">
          {panels.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              type="button"
              aria-selected={active === p.id}
              aria-controls={`hero-panel-${p.id}`}
              onClick={() => setActive(p.id)}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-[13px] font-bold transition [&_svg]:size-4",
                active === p.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              <span className="hidden sm:inline-flex">{p.icon}</span>
              {i + 1}. {p.label}
            </button>
          ))}
        </div>
        {panels.map((p) => (
          <div
            key={p.id}
            id={`hero-panel-${p.id}`}
            role="tabpanel"
            hidden={active !== p.id}
            className="h-[400px] overflow-y-auto bg-white p-4 [mask-image:linear-gradient(to_bottom,black_88%,transparent)] sm:p-5"
          >
            {p.content}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-slate-50/80 px-4 py-3">
          <span className="text-xs font-semibold text-slate-500">실제 샘플 파일을 내려받아 보세요</span>
          <div className="flex gap-1.5">
            <a
              href={`/api/samples/${sampleSlug}/export?format=hwpx`}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-primary-deep"
            >
              <Download className="size-3.5" /> HWPX
            </a>
            <a
              href={`/samples/${sampleSlug}/print`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-red-300 hover:text-red-600"
            >
              <Printer className="size-3.5" /> PDF
            </a>
            <a
              href={`/api/samples/${sampleSlug}/export?format=docx`}
              className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              <FileText className="size-3.5" /> DOCS
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
