import Link from "next/link";
import { Coins } from "lucide-react";

import { cn, formatNumber } from "@/lib/utils";

export function PointsPill({ points, className }: { points: number; className?: string }) {
  return (
    <Link
      href="/app/billing"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-soft px-3 py-1.5 text-sm font-bold text-amber-800 transition hover:border-amber-300",
        className,
      )}
      title="토큰 충전하기"
    >
      <Coins className="size-3.5" /> 토큰 <span className="tabular-nums">{formatNumber(points)}</span>
    </Link>
  );
}
