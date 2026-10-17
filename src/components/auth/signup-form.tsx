"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Gift, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioChip, RadioGroup } from "@/components/ui/radio-group";
import { api } from "@/lib/api-client";
import { SIGNUP_BONUS_TOKENS } from "@/lib/catalog";

export function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState("teacher");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const res = await api<{ home: string }>("/api/auth/signup", {
          method: "POST",
          json: {
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            organization: form.get("organization") ?? "",
            role,
            agreeTerms: agree,
          },
        });
        toast.success(
          role === "student" ? "가입을 환영합니다! 선생님께 받은 참여 코드를 입력해 주세요." : `가입을 환영합니다! 무료 토큰 ${SIGNUP_BONUS_TOKENS}개를 드렸어요.`,
        );
        router.push(role === "student" ? res.home : "/app/new");
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">무료로 시작하기</h1>
        {role === "student" ? (
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <GraduationCap className="size-4 text-emerald-600" /> 학생은 무료예요. 가입 후 선생님께 받은 참여 코드를 입력하세요.
          </p>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <Gift className="size-4 text-amber" /> 가입 즉시 무료 체험 토큰 {SIGNUP_BONUS_TOKENS}개를 드려요.
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" autoComplete="name" placeholder="김국어" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">소속 (선택)</Label>
            <Input id="organization" name="organization" placeholder="OO고등학교 / OO학원" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>직군</Label>
          <RadioGroup value={role} onValueChange={setRole} className="flex flex-wrap gap-2" aria-label="직군">
            <RadioChip value="teacher">학교 교사</RadioChip>
            <RadioChip value="instructor">학원 강사</RadioChip>
            <RadioChip value="other">기타</RadioChip>
            <RadioChip value="student">학생</RadioChip>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder={role === "student" ? "student@school.kr" : "teacher@school.kr"} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="8자 이상" minLength={8} required />
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" aria-label="약관 동의" />
          <span>
            <Link href="/terms" target="_blank" className="font-semibold text-primary underline-offset-2 hover:underline">
              이용약관
            </Link>{" "}
            및{" "}
            <Link href="/terms#copyright" target="_blank" className="font-semibold text-primary underline-offset-2 hover:underline">
              저작권·교육 목적 이용 안내
            </Link>
            ,{" "}
            <Link href="/privacy" target="_blank" className="font-semibold text-primary underline-offset-2 hover:underline">
              개인정보처리방침
            </Link>
            에 동의합니다.
          </span>
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" variant="gradient" className="w-full" disabled={pending}>
          <Sparkles /> {pending ? "가입하는 중…" : "가입하고 첫 자료 만들기"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
