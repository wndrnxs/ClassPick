import { CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const POINTS = ["지문 1개로 6가지 수업 자료 동시 생성", "편집 가능한 HWPX · DOCS, 인쇄용 PDF", "시험지 분석 보고서로 학부모 상담까지"];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-blue-700 to-primary-deep p-12 text-white lg:flex lg:flex-col">
        <div className="bg-grid absolute inset-0 opacity-25" />
        <div className="relative [&_span]:!text-white [&_.text-primary]:!text-amber-300">
          <Logo />
        </div>
        <div className="relative mt-auto">
          <p className="text-4xl leading-tight font-black tracking-tight">
            지문 하나로,
            <br />
            수업 준비가 달라집니다.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-blue-50">
                <CheckCircle2 className="size-5 text-emerald-300" /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-12 text-sm text-blue-200">선생님의 아이디어에, 클래스픽의 날개를 더하세요.</p>
        </div>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
