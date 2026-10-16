import Link from "next/link";
import { Check, Coins } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER, FEATURE_COSTS, PENCIL_PACKS, PLANS } from "@/lib/catalog";
import { cn, formatWon } from "@/lib/utils";

export function PlanCards() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {PLANS.map((plan) => {
        const highlight = "highlight" in plan && plan.highlight;
        return (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-white p-7",
              highlight && "border-2 border-primary shadow-[var(--shadow-lift)] lg:-my-3 lg:py-10",
            )}
          >
            {highlight && <Badge className="absolute -top-3 left-7">가장 많이 선택</Badge>}
            <h3 className="text-lg font-extrabold">{plan.name}</h3>
            <p className="mt-1 min-h-10 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tight">{plan.price ? formatWon(plan.price) : "0원"}</span>
              {plan.period && <span className="text-sm text-muted-foreground">/ {plan.period}</span>}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-primary">
              <Coins className="size-4" /> {plan.pencils}
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8" size="lg" variant={highlight ? "gradient" : "outline"}>
              <Link href="/signup">{plan.cta}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function PencilCostTable() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="flex items-center gap-2 font-extrabold">
          <Coins className="size-4 text-primary" /> 토큰 사용량
        </h3>
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y">
            {MATERIAL_TYPE_ORDER.map((t) => (
              <tr key={t}>
                <td className="py-2.5 text-slate-700">{MATERIAL_TYPE_META[t].label}</td>
                <td className="py-2.5 text-right font-bold tabular-nums">{MATERIAL_TYPE_META[t].cost}개</td>
              </tr>
            ))}
            <tr>
              <td className="py-2.5 text-slate-700">스캔 문서 스마트 OCR (파일당)</td>
              <td className="py-2.5 text-right font-bold tabular-nums">{FEATURE_COSTS.ocrPerFile}개</td>
            </tr>
            <tr>
              <td className="py-2.5 text-slate-700">시험지 분석 보고서</td>
              <td className="py-2.5 text-right font-bold tabular-nums">{FEATURE_COSTS.examReport}개</td>
            </tr>
            <tr>
              <td className="py-2.5 text-slate-700">여러 지문 모음 시험지 제본</td>
              <td className="py-2.5 text-right font-bold tabular-nums">{FEATURE_COSTS.examCompose}개</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">생성에 실패하면 사용한 토큰은 자동으로 환불됩니다. 다운로드는 횟수 제한 없이 무료입니다.</p>
      </div>
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="font-extrabold">토큰 충전 (1회 결제)</h3>
        <ul className="mt-4 space-y-3">
          {PENCIL_PACKS.map((p) => (
            <li
              key={p.id}
              className={cn("flex items-center justify-between rounded-xl border p-4", "popular" in p && p.popular && "border-primary bg-secondary/50")}
            >
              <div>
                <p className="font-bold">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.note}</p>
              </div>
              <p className="text-lg font-black tabular-nums">{formatWon(p.price)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
