"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Compass } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export function GuestButton({ highlight = false }: { highlight?: boolean }) {
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
            await api("/api/auth/guest", { method: "POST" });
            toast.success("체험 계정으로 시작합니다. 샘플 자료가 준비되어 있어요!");
            router.push("/app");
            router.refresh();
          } catch (e) {
            toast.error((e as Error).message);
          }
        })
      }
    >
      <Compass /> {pending ? "체험 계정을 준비하는 중…" : "가입 없이 체험 계정으로 둘러보기"}
    </Button>
  );
}
