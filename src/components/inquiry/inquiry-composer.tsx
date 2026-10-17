"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";

const MAX = 1000;

/** 질문·답변 입력창. 보내면 화면을 새로 고쳐 대화에 반영합니다. */
export function InquiryComposer({
  url,
  extra,
  placeholder,
  submitLabel,
  successMessage,
  autoFocus = false,
  onSent,
  onCancel,
}: {
  url: string;
  /** body 외에 함께 보낼 값 (예: assignmentId, questionId) */
  extra?: Record<string, string>;
  placeholder: string;
  submitLabel: string;
  successMessage: string;
  autoFocus?: boolean;
  onSent?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const trimmed = body.trim();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            await api(url, { method: "POST", json: { ...extra, body: trimmed } });
            toast.success(successMessage);
            setBody("");
            onSent?.();
            router.refresh();
          } catch (err) {
            toast.error((err as Error).message);
          }
        });
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX))}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        rows={3}
        className="min-h-20 bg-white"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {body.length}/{MAX}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
              취소
            </Button>
          )}
          <Button type="submit" size="sm" disabled={pending || !trimmed}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
