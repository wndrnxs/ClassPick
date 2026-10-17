"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Compass, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export function GuestButton({ highlight = false, role = "teacher" }: { highlight?: boolean; role?: "teacher" | "student" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={highlight ? "emerald" : "outline"}
      size="lg"
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const res = await api<{ home: string }>(`/api/auth/guest?role=${role}`, { method: "POST" });
            toast.success(
              role === "student"
                ? "학생 체험 계정으로 시작합니다. 받은 시험이 준비되어 있어요!"
                : "체험 계정으로 시작합니다. 샘플 자료와 체험반이 준비되어 있어요!",
            );
            router.push(res.home);
            router.refresh();
          } catch (e) {
            toast.error((e as Error).message);
          }
        })
      }
    >
      {role === "student" ? <GraduationCap /> : <Compass />}{" "}
      {pending ? "체험 계정을 준비하는 중…" : role === "student" ? "학생 화면 체험하기" : "가입 없이 체험 계정으로 둘러보기"}
    </Button>
  );
}
