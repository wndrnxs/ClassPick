"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "복사" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          toast.success("복사했어요.");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("복사하지 못했어요. 직접 선택해 복사해 주세요.");
        }
      }}
    >
      {done ? <Check /> : <Copy />} {label}
    </Button>
  );
}
