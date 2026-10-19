import Link from "next/link";
import { cache, type ReactNode } from "react";
import { Coins, Plus } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { isAdmin, requireUser } from "@/server/auth/dal";
import { countTeacherOpenInquiries } from "@/server/services/inquiries";
import { AppNav } from "./app-nav";
import { MobileNav } from "./mobile-nav";
import { PointsPill } from "./points-pill";
import { UserMenu } from "./user-menu";

/** 사이드바 하단: 토큰 잔액 + 사용자 메뉴 (요청 시점 데이터 → Suspense 내부에서 렌더링) */
export async function SidebarAccount() {
  const user = await requireUser();
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-soft to-white p-3.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-800">
          <span className="flex items-center gap-1">
            <Coins className="size-3.5" /> 보유 토큰
          </span>
          <Link href="/app/billing" className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 hover:bg-amber-100">
            <Plus className="size-3" /> 충전
          </Link>
        </div>
        <p className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
          {formatNumber(user.points)}
          <span className="ml-1 text-sm font-semibold text-muted-foreground">개</span>
        </p>
      </div>
      <UserMenu name={user.name} email={user.email} isGuest={user.isGuest} isAdmin={isAdmin(user)} />
    </div>
  );
}

export function SidebarAccountSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[84px] rounded-xl" />
      <Skeleton className="h-[52px] rounded-lg" />
    </div>
  );
}

export async function TopbarPoints() {
  const user = await requireUser();
  return <PointsPill points={user.points} />;
}

const navBadges = cache(async () => ({ "/app/questions": await countTeacherOpenInquiries((await requireUser()).id) }));

/** 사이드바 메뉴 + 답변 대기 질문 수 */
export async function AppNavWithBadges() {
  return <AppNav badges={await navBadges()} />;
}

export async function MobileNavWithBadges({ footer }: { footer?: ReactNode }) {
  return <MobileNav footer={footer} badges={await navBadges()} />;
}
