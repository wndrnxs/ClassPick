import { ArrowRight, CircleCheckBig, CircleX } from "lucide-react";

import { SectionHeading } from "./section-heading";

const PROBLEMS = [
  { title: "시간 소요", body: "지문 하나마다 해설 찾아 넣고, 문제 만들고, 도식화하느라 소비되는 수많은 시간" },
  { title: "변형 문제의 한계", body: "학생 수준별(기초/심화/내신 대비) 맞춤 문항을 일일이 제작하는 고단함" },
  { title: "재타이핑 번거로움", body: "스캔 교재나 모의고사 지문을 직접 손으로 재타이핑해야 하는 생산성 저하" },
];

const SOLUTIONS = [
  { title: "단 한 번의 입력", body: "지문 입력 또는 파일 업로드 한 번으로 원하는 모든 자료 유형 자동 생성" },
  { title: "수업 목적별 맞춤화", body: "5지선다부터 약술형, OX, 초성 퀴즈, 구조 분석 도식화까지 맞춤 구성" },
  { title: "완벽한 편집 포맷", body: "한글(HWPX) 파일로 즉시 다운로드하여 학교/학원 고유 양식으로 편집 가능" },
];

export function PainSolution() {
  return (
    <section className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Problem & Solution"
          title={
            <>
              매주 반복되는 밤샘 문제 출제와 교재 작업,
              <br className="hidden sm:block" /> 언제까지 계속하시겠습니까?
            </>
          }
        />
        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-2xl border bg-white p-6 sm:p-8">
            <p className="text-sm font-bold text-slate-400">기존 방식의 한계</p>
            <ul className="mt-5 space-y-5">
              {PROBLEMS.map((p) => (
                <li key={p.title} className="flex gap-3.5">
                  <CircleX className="mt-0.5 size-6 shrink-0 text-red-400" />
                  <div>
                    <p className="font-bold text-slate-800">{p.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-500">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-center">
            <span className="flex size-12 rotate-90 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:rotate-0">
              <ArrowRight className="size-6" />
            </span>
          </div>
          <div className="relative rounded-2xl border-2 border-primary/30 bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
            <p className="text-sm font-bold text-primary">클래스픽의 혁신</p>
            <ul className="mt-5 space-y-5">
              {SOLUTIONS.map((s) => (
                <li key={s.title} className="flex gap-3.5">
                  <CircleCheckBig className="mt-0.5 size-6 shrink-0 text-emerald" />
                  <div>
                    <p className="font-bold text-slate-900">{s.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
