"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api-client";

/** 선생님: 질문·답변을 반 전체에 공개 (다른 학생에게는 질문한 학생 이름 없이 보임) */
export function PublicToggle({ inquiryId, isPublic, answered }: { inquiryId: string; isPublic: boolean; answered: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(isPublic);
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-muted/60 p-3.5 text-sm has-[:disabled]:cursor-wait">
      <Checkbox
        checked={checked}
        disabled={pending}
        aria-label="반 전체에 공개"
        className="mt-0.5"
        onCheckedChange={(v) => {
          const next = v === true;
          setChecked(next);
          startTransition(async () => {
            try {
              await api(`/api/inquiries/${inquiryId}`, { method: "PATCH", json: { isPublic: next } });
              toast.success(next ? "반 전체에 공개했어요." : "공개를 취소했어요.");
              router.refresh();
            } catch (err) {
              setChecked(!next);
              toast.error((err as Error).message);
            }
          });
        }}
      />
      <span>
        <strong>반 전체에 공개</strong>
        <span className="block text-muted-foreground">
          같은 시험을 본 학생들이 이 문항 결과에서 질문과 답변을 볼 수 있어요. 질문한 학생의 이름은 보이지 않아요.
          {!answered && " (답변을 남긴 뒤부터 보여요)"}
        </span>
      </span>
    </label>
  );
}
