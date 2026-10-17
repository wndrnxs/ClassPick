"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, MessageCircleQuestion, Target } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/student", label: "내 시험", icon: ClipboardList, match: (p: string) => p === "/student" || p.startsWith("/student/exams") },
  { href: "/student/questions", label: "내 질문", icon: MessageCircleQuestion, match: (p: string) => p.startsWith("/student/questions") },
  { href: "/student/report", label: "약점 분석", icon: Target, match: (p: string) => p.startsWith("/student/report") },
];

/** badges: 메뉴 href → 알림 숫자 (예: 새 답변 수) */
export type NavBadges = Partial<Record<string, number>>;

export function StudentNavLinks({ activePath, className, badges }: { activePath?: string | null; className?: string; badges?: NavBadges }) {
  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="학생 메뉴">
      {ITEMS.map((item) => {
        const active = activePath != null && item.match(activePath);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-bold whitespace-nowrap transition md:flex-none md:px-3",
              active ? "bg-secondary text-primary" : "text-slate-600 hover:bg-muted hover:text-slate-900",
            )}
          >
            <item.icon className={cn("size-4", active ? "text-primary" : "text-slate-400")} />
            {item.label}
            {!!badges?.[item.href] && (
              <span className="rounded-full bg-red-500 px-1.5 text-[11px] leading-4 font-bold text-white tabular-nums" aria-label={`새 답변 ${badges[item.href]}개`}>
                {badges[item.href]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function StudentNav({ className, badges }: { className?: string; badges?: NavBadges }) {
  const pathname = usePathname();
  return <StudentNavLinks activePath={pathname} className={className} badges={badges} />;
}
