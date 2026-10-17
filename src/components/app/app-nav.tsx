"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookCopy, ClipboardCheck, Coins, FolderOpen, Home, MessageCircleQuestion, ScanText, Sparkles, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_NAV } from "./nav-items";

const ICONS = {
  home: Home,
  sparkles: Sparkles,
  folder: FolderOpen,
  scan: ScanText,
  book: BookCopy,
  chart: BarChart3,
  coins: Coins,
  users: Users,
  clipboard: ClipboardCheck,
  message: MessageCircleQuestion,
};

/** 메뉴 href → 알림 숫자 (예: 답변 대기 질문 수) */
export type NavBadges = Partial<Record<string, number>>;

export function AppNavLinks({ onNavigate, activePath, badges }: { onNavigate?: () => void; activePath?: string | null; badges?: NavBadges }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="워크스페이스 메뉴">
      {APP_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active =
          activePath != null &&
          ("exact" in item && item.exact ? activePath === item.href : activePath === item.href || activePath.startsWith(`${item.href}/`));
        const isPrimary = item.href === "/app/new";
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold transition",
              active ? "bg-secondary text-primary" : "text-slate-600 hover:bg-muted hover:text-slate-900",
              isPrimary && !active && "text-primary",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-primary" : isPrimary ? "text-primary" : "text-slate-400")} />
            {item.label}
            {!!badges?.[item.href] && (
              <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[11px] leading-[18px] font-bold text-white tabular-nums" aria-label={`답변 대기 ${badges[item.href]}개`}>
                {badges[item.href]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNav({ onNavigate, badges }: { onNavigate?: () => void; badges?: NavBadges }) {
  const pathname = usePathname();
  return <AppNavLinks onNavigate={onNavigate} activePath={pathname} badges={badges} />;
}
