import Link from "next/link";
import { BarChart3, BookCopy, ChevronRight, FileScan, FileText, FlaskConical } from "lucide-react";

import { KIND_LABELS, MATERIAL_TYPE_META } from "@/lib/catalog";
import type { MaterialSummaryDTO } from "@/lib/material-dto";
import { cn, formatDateTime } from "@/lib/utils";

const KIND_ICON = {
  passage: { icon: FileText, cls: "bg-blue-50 text-primary" },
  exam_report: { icon: BarChart3, cls: "bg-violet-50 text-violet-600" },
  exam_set: { icon: BookCopy, cls: "bg-emerald-50 text-emerald-600" },
  ocr: { icon: FileScan, cls: "bg-amber-50 text-amber-600" },
} as const;

export function MaterialRow({ m }: { m: MaterialSummaryDTO }) {
  const { icon: Icon, cls } = KIND_ICON[m.kind];
  return (
    <Link
      href={`/app/materials/${m.id}`}
      className="group flex items-center gap-3.5 rounded-xl border bg-white p-3.5 transition hover:border-primary/30 hover:shadow-[var(--shadow-soft)] sm:p-4"
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", cls)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-slate-900 group-hover:text-primary">
          {m.title}
          {m.author && <span className="ml-1.5 text-sm font-medium text-muted-foreground">{m.author}</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-semibold">{KIND_LABELS[m.kind]}</span>
          <span aria-hidden>·</span>
          <span>{formatDateTime(m.createdAt)}</span>
          {m.engine === "demo" && (
            <span className="inline-flex items-center gap-0.5 text-amber-600">
              <FlaskConical className="size-3" /> 데모
            </span>
          )}
          {m.types.length > 0 && (
            <span className="hidden flex-wrap gap-1 sm:flex">
              {m.types.map((t) => (
                <span key={t} className="rounded bg-muted px-1.5 py-px text-[11px] font-semibold text-slate-600">
                  {MATERIAL_TYPE_META[t].shortLabel}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
