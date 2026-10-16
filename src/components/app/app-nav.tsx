"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookCopy, FolderOpen, Home, Pencil, ScanText, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_NAV } from "./nav-items";

const ICONS = {
  home: Home,
  sparkles: Sparkles,
  folder: FolderOpen,
  scan: ScanText,
  book: BookCopy,
  chart: BarChart3,
  pencil: Pencil,
};

export function AppNavLinks({ onNavigate, activePath }: { onNavigate?: () => void; activePath?: string | null }) {
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
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <AppNavLinks onNavigate={onNavigate} activePath={pathname} />;
}
