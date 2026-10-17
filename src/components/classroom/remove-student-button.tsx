"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export function RemoveStudentButton({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={`${name} 학생을 반에서 내보내기`}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`${name} 학생을 반에서 내보낼까요? 응시 기록은 유지됩니다.`)) return;
        startTransition(async () => {
          try {
            await api(`/api/classes/${classId}/members/${studentId}`, { method: "DELETE" });
            toast.success("반에서 내보냈어요.");
            router.refresh();
          } catch (e) {
            toast.error((e as Error).message);
          }
        });
      }}
    >
      <UserMinus className="text-muted-foreground" />
    </Button>
  );
}
