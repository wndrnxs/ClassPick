"use client";

import type { ReactNode } from "react";
import { Eye } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** 기능 카드의 '샘플 미리보기' 모달. 미리보기 내용은 서버에서 렌더링해 children으로 받습니다. */
export function FeatureDialog({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline"
        >
          <Eye className="size-4" /> 샘플 미리보기
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl gap-5 bg-surface sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-white p-4 sm:p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
