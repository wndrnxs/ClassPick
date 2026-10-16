"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Sparkles } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from "@/components/ui/dialog";

const NAV = [
  { href: "/#features", label: "기능 소개" },
  { href: "/samples", label: "생성 샘플" },
  { href: "/pricing", label: "요금제" },
  { href: "/guide", label: "이용가이드" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="glass sticky top-0 z-40 border-b border-white/60 shadow-[0_1px_0_rgb(15_23_42/0.04)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="주 메뉴">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3.5 py-2 text-[15px] font-semibold text-slate-600 transition hover:bg-secondary hover:text-primary"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/login">로그인</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              <Sparkles /> 무료로 시작하기
            </Link>
          </Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기">
              <Menu className="size-5" />
            </Button>
          </DialogTrigger>
          <SheetContent>
            <DialogTitle className="sr-only">메뉴</DialogTitle>
            <Logo />
            <nav className="mt-4 flex flex-col gap-1" aria-label="모바일 메뉴">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-semibold text-slate-700 hover:bg-secondary"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2">
              <Button asChild variant="outline" size="lg">
                <Link href="/login" onClick={() => setOpen(false)}>
                  로그인
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/signup" onClick={() => setOpen(false)}>
                  <Sparkles /> 무료로 시작하기
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Dialog>
      </div>
    </header>
  );
}
