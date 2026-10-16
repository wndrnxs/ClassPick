import type { Metadata } from "next";
import { Suspense } from "react";
import { Pencil } from "lucide-react";

import { PencilPackList } from "@/components/app/checkout-buttons";
import { PageHeader } from "@/components/app/page-header";
import { PencilCostTable } from "@/components/marketing/pricing-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { requireUser } from "@/server/auth/dal";
import { env } from "@/server/env";
import { listTransactions } from "@/server/services/points";

export const metadata: Metadata = { title: "연필 충전" };

const REASON_LABEL = {
  signup_bonus: "가입 보너스",
  generation: "사용",
  refund: "환불",
  purchase: "충전",
  adjustment: "조정",
} as const;

async function Balance() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-soft to-white p-6">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-amber text-white shadow-md">
        <Pencil className="size-7" />
      </span>
      <div>
        <p className="text-sm font-bold text-amber-800">보유 연필</p>
        <p className="text-4xl font-black tracking-tight tabular-nums">
          {formatNumber(user.points)}
          <span className="ml-1 text-base font-semibold text-muted-foreground">자루</span>
        </p>
      </div>
    </div>
  );
}

async function History() {
  const user = await requireUser();
  const txs = await listTransactions(user.id, 50);
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-bold">일시</th>
            <th className="px-4 py-3 font-bold">구분</th>
            <th className="px-4 py-3 font-bold">내용</th>
            <th className="px-4 py-3 text-right font-bold">변동</th>
            <th className="px-4 py-3 text-right font-bold">잔액</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(t.createdAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{REASON_LABEL[t.reason]}</td>
              <td className="px-4 py-3">{t.memo}</td>
              <td className={cn("px-4 py-3 text-right font-bold tabular-nums", t.delta > 0 ? "text-emerald-600" : "text-slate-700")}>
                {t.delta > 0 ? `+${t.delta}` : t.delta}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{t.balanceAfter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BillingPage() {
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Pencils" title="연필 충전 · 사용 내역" description="연필은 자료를 생성할 때 사용됩니다. 다운로드는 횟수 제한 없이 무료예요." />
      <Suspense fallback={<Skeleton className="h-[106px] rounded-2xl" />}>
        <Balance />
      </Suspense>
      <section>
        <h2 className="mb-4 text-lg font-extrabold">연필 충전</h2>
        <PencilPackList provider={env.paymentProvider} />
      </section>
      <PencilCostTable />
      <section>
        <h2 className="mb-4 text-lg font-extrabold">사용 내역</h2>
        <Suspense fallback={<Skeleton className="h-60 rounded-2xl" />}>
          <History />
        </Suspense>
      </section>
    </div>
  );
}
