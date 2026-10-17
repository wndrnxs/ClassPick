"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Target } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/student", label: "내 시험", icon: ClipboardList, match: (p: string) => p === "/student" || p.startsWith("/student/exams") },
  { href: "/student/report", label: "약점 분석", icon: Target, match: (p: string) => p.startsWith("/student/report") },
];

export function StudentNavLinks({ activePath, className }: { activePath?: string | null; className?: string }) {
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
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition sm:flex-none",
              active ? "bg-secondary text-primary" : "text-slate-600 hover:bg-muted hover:text-slate-900",
            )}
          >
            <item.icon className={cn("size-4", active ? "text-primary" : "text-slate-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StudentNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return <StudentNavLinks activePath={pathname} className={className} />;
}
