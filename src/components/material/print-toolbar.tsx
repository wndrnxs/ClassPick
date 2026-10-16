"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintToolbar({
  backHref,
  basePath,
  audience,
  hasAudience,
}: {
  backHref: string;
  basePath: string;
  audience: "teacher" | "student";
  hasAudience: boolean;
}) {
  return (
    <div className="no-print sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-primary">
          <ArrowLeft className="size-4" /> 돌아가기
        </Link>
        <div className="flex items-center gap-2">
          {hasAudience && (
            <div className="flex rounded-lg bg-muted p-1 text-sm font-semibold">
              {(
                [
                  ["teacher", "교사용"],
                  ["student", "학생용"],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={value}
                  href={`${basePath}?audience=${value}`}
                  replace
                  className={cn("rounded-md px-3 py-1", audience === value ? "bg-white text-primary shadow-sm" : "text-slate-500")}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
          <Button onClick={() => window.print()}>
            <Printer /> 인쇄 · PDF로 저장
          </Button>
        </div>
      </div>
      <p className="mx-auto max-w-[210mm] px-4 pb-2 text-xs text-muted-foreground">
        인쇄 대화상자에서 대상을 ‘PDF로 저장’으로 선택하면 PDF 파일로 내려받을 수 있습니다. (배경 그래픽 옵션을 켜면 색상이 함께 인쇄됩니다)
      </p>
    </div>
  );
}
