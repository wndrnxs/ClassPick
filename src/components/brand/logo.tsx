import Link from "next/link";

import { cn } from "@/lib/utils";

/** 클래스픽 로고 마크: 펼친 책 + 선택(✓) + AI 반짝임 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-8 shrink-0", className)}>
      <defs>
        <linearGradient id="cp-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cp-logo-g)" />
      <path d="M12 19.5c6.5-2.4 13-1.8 19 1.8v27.2c-6-3.4-12.5-4-19-1.8z" fill="#fff" />
      <path d="M52 19.5c-6.5-2.4-13-1.8-19 1.8v27.2c6-3.4 12.5-4 19-1.8z" fill="#DBEAFE" />
      <path
        d="M37.5 33.5l4 4 7-8.5"
        fill="none"
        stroke="#1E40AF"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M47 6l1.6 3.8L52.4 11.4l-3.8 1.6L47 16.8l-1.6-3.8-3.8-1.6 3.8-1.6z" fill="#FBBF24" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5 rounded-lg outline-none", className)} aria-label="클래스픽 홈">
      <LogoMark className="transition-transform group-hover:-rotate-6" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[1.05rem] font-extrabold tracking-tight text-foreground">
            Class<span className="text-primary">Pick</span>
          </span>
          <span className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">클래스픽</span>
        </span>
      )}
    </Link>
  );
}
