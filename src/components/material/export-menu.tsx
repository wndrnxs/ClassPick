"use client";

import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ExportTargets = {
  /** 예: /api/materials/:id/export */
  exportBase: string;
  /** 예: /print/materials/:id */
  printBase: string;
  /** 정답 유무에 따른 교사용/학생용 구분이 의미 있는 자료인지 */
  hasAudience: boolean;
  /** 시험지 형식(1단/2단)을 고를 수 있는 자료인지 (분석 보고서는 1단 고정) */
  hasColumns?: boolean;
};

export function ExportMenu({ exportBase, printBase, hasAudience, hasColumns = false, size = "default" }: ExportTargets & { size?: "default" | "sm" }) {
  const [columns, setColumns] = useState<1 | 2>(2);
  const col = hasColumns ? `&columns=${columns}` : "";
  const audiences = hasAudience
    ? ([
        ["teacher", "교사용 (정답·해설 포함)"],
        ["student", "학생용 (문제만)"],
      ] as const)
    : ([["teacher", "전체"]] as const);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant="gradient">
          <Download /> 다운로드
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {hasColumns && (
          <>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="text-xs font-bold text-muted-foreground">단 구성</span>
              <div className="flex rounded-md bg-muted p-0.5 text-xs font-bold" role="group" aria-label="단 구성">
                {([2, 1] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={columns === c}
                    onClick={() => setColumns(c)}
                    className={columns === c ? "rounded bg-white px-2.5 py-1 text-primary shadow-sm" : "px-2.5 py-1 text-slate-500"}
                  >
                    {c === 2 ? "2단 (시험지)" : "1단"}
                  </button>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {audiences.map(([audience, label], i) => (
          <div key={audience}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <a href={`${exportBase}?format=hwpx&audience=${audience}${col}`}>
                <FileText className="!text-primary" /> HWPX <span className="ml-auto text-xs text-muted-foreground">한글 편집용</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`${exportBase}?format=docx&audience=${audience}${col}`}>
                <FileText className="!text-sky-600" /> DOCS <span className="ml-auto text-xs text-muted-foreground">Word·구글 문서</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`${printBase}?audience=${audience}${col}`} target="_blank" rel="noreferrer">
                <Printer className="!text-red-500" /> PDF <span className="ml-auto text-xs text-muted-foreground">바로 인쇄용</span>
              </a>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
