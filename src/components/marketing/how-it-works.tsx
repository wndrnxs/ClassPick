import { Download, FileInput, LayoutGrid } from "lucide-react";

import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    icon: <FileInput />,
    step: "STEP 1",
    title: "지문 입력 및 설정",
    body: "수업할 지문 본문을 붙여넣거나 파일(PDF/이미지/스캔본)로 업로드하고 과목, 학교급, 난이도를 선택합니다.",
  },
  {
    icon: <LayoutGrid />,
    step: "STEP 2",
    title: "자료 유형 선택",
    body: "핵심정리·도식화, 행간주 해설, OX, 5지선다, 어휘 퀴즈 등 오늘 수업에 필요한 자료를 골라 생성합니다.",
  },
  {
    icon: <Download />,
    step: "STEP 3",
    title: "포맷 선택 및 다운로드",
    body: "HWPX(한글 편집용), PDF(바로 인쇄용), DOCS 포맷 중 선택하여 내려받아 즉시 수업에 활용합니다.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-deep to-[#172554] py-20 text-white sm:py-24">
      <div className="bg-grid absolute inset-0 opacity-20" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How It Works"
          title={<span className="text-white">3단계면 충분합니다</span>}
          description={<span className="text-blue-100">복잡한 설정 없이, 지문을 넣고 고르고 내려받으면 끝.</span>}
          className="[&>p:first-child]:text-blue-300"
        />
        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.step} className="relative">
              {i < STEPS.length - 1 && (
                <span className="absolute top-8 left-[calc(50%+3rem)] hidden h-px w-[calc(100%-6rem)] border-t-2 border-dashed border-blue-300/40 md:block" />
              )}
              <div className="flex flex-col items-center text-center">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25 backdrop-blur [&_svg]:size-7">
                  {s.icon}
                </span>
                <p className="mt-5 text-xs font-black tracking-[0.25em] text-amber-300">{s.step}</p>
                <h3 className="mt-2 text-xl font-extrabold">{s.title}</h3>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-blue-100/90">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
