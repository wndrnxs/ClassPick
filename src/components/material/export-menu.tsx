"use client";

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
};

export function ExportMenu({ exportBase, printBase, hasAudience, size = "default" }: ExportTargets & { size?: "default" | "sm" }) {
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
        {audiences.map(([audience, label], i) => (
          <div key={audience}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <a href={`${exportBase}?format=hwpx&audience=${audience}`}>
                <FileText className="!text-primary" /> HWPX <span className="ml-auto text-xs text-muted-foreground">한글 편집용</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`${exportBase}?format=docx&audience=${audience}`}>
                <FileText className="!text-sky-600" /> DOCS <span className="ml-auto text-xs text-muted-foreground">Word·구글 문서</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`${printBase}?audience=${audience}`} target="_blank" rel="noreferrer">
                <Printer className="!text-red-500" /> PDF <span className="ml-auto text-xs text-muted-foreground">바로 인쇄용</span>
              </a>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
