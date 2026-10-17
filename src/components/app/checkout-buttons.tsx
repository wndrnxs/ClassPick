"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Coins } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { TOKEN_PACKS } from "@/lib/catalog";
import { cn, formatWon } from "@/lib/utils";

export function TokenPackList({ provider }: { provider: "mock" | "toss" }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function buy(packId: string) {
    setPending(packId);
    try {
      const res = await api<{ status: string; balance?: number }>("/api/billing/checkout", { method: "POST", json: { packId } });
      if (res.status === "paid") {
        toast.success(`충전이 완료되었어요! 현재 토큰 ${res.balance}개`);
        router.refresh();
      } else {
        toast.info("결제창 연동(토스페이먼츠)이 설정되지 않았습니다. 관리자에게 문의해 주세요.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TOKEN_PACKS.map((p) => {
        const popular = "popular" in p && p.popular;
        return (
          <div key={p.id} className={cn("relative flex flex-col rounded-2xl border bg-white p-6", popular && "border-2 border-primary shadow-[var(--shadow-lift)]")}>
            {popular && <Badge className="absolute -top-3 left-6">추천</Badge>}
            <span className="flex size-11 items-center justify-center rounded-xl bg-amber-soft text-amber-600">
              <Coins className="size-5" />
            </span>
            <p className="mt-4 text-lg font-extrabold">{p.label}</p>
            <p className="text-sm text-muted-foreground">{p.note}</p>
            <p className="mt-4 text-3xl font-black tracking-tight tabular-nums">{formatWon(p.price)}</p>
            <Button className="mt-5" variant={popular ? "gradient" : "outline"} onClick={() => buy(p.id)} disabled={pending !== null}>
              {pending === p.id ? "결제 처리 중…" : provider === "mock" ? "테스트 결제로 충전" : "결제하기"}
            </Button>
          </div>
        );
      })}
      {provider === "mock" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:col-span-3">
          <Check className="size-3.5 text-emerald" />
          현재는 테스트 결제 모드입니다. 실제 결제 없이 토큰이 충전됩니다. (PAYMENT_PROVIDER=toss 설정 시 토스페이먼츠 승인 흐름 사용)
        </p>
      )}
    </div>
  );
}
