import Link from "next/link";
import { Feather, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SIGNUP_BONUS_PENCILS } from "@/lib/catalog";

export function FinalCta() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-blue-700 to-primary-deep px-6 py-14 text-center text-white shadow-[0_40px_80px_-30px_rgb(30_64_175/0.6)] sm:px-12 sm:py-16">
        <div className="bg-grid absolute inset-0 opacity-25" />
        <Feather className="absolute -right-6 -bottom-8 size-48 rotate-12 text-white/10" />
        <div className="relative">
          <h2 className="text-[1.7rem] leading-tight font-black tracking-tight text-balance sm:text-4xl">
            선생님의 아이디어에, 클래스픽의 날개를 더하세요.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100 sm:text-lg">
            지금 가입하시면 무료 체험 포인트(토큰 {SIGNUP_BONUS_PENCILS}개)를 제공해 드립니다. 첫 수업 자료를 직접 생성해 보세요!
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" className="bg-white text-primary-deep shadow-xl hover:bg-blue-50">
              <Link href="/signup">
                <Sparkles className="size-5" /> 지금 무료로 시작하기
              </Link>
            </Button>
            <Button asChild size="xl" variant="ghost" className="text-white ring-1 ring-white/40 hover:bg-white/10 hover:text-white">
              <Link href="/login?guest=1">가입 없이 체험해 보기</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
