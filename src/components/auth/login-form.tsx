"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { GuestButton } from "./guest-button";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await api("/api/auth/login", { method: "POST", json: { email: form.get("email"), password: form.get("password") } });
        router.push(safeNext(params.get("next")));
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">다시 오신 것을 환영해요</h1>
        <p className="mt-2 text-muted-foreground">클래스픽 계정으로 로그인하세요.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="teacher@school.kr" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          <LogIn /> {pending ? "로그인 중…" : "로그인"}
        </Button>
      </form>
      <div className="relative text-center text-xs text-muted-foreground">
        <span className="relative z-10 bg-background px-3">또는</span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      </div>
      <GuestButton highlight={params.get("guest") === "1"} />
      <p className="text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-bold text-primary hover:underline">
          무료로 시작하기
        </Link>
      </p>
    </div>
  );
}
