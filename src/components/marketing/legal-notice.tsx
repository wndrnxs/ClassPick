import { BadgeCheck, Copyright, Scale } from "lucide-react";

const ITEMS = [
  {
    icon: <Copyright />,
    title: "지적재산권 및 저작권 준수 안내",
    lines: [
      "본 서비스는 교사 및 강사의 정당한 교육 목적 및 수업 준비 도우미로 설계되었습니다.",
      "원저작물의 지적재산권을 보호하기 위해 교과서 및 모의고사 지문 활용 시 출처 표기 및 개인 수업/학원 내부용 사용 범위 준수를 권장합니다.",
    ],
  },
  {
    icon: <BadgeCheck />,
    title: "AI 생성 자료의 최종 검수 안내",
    lines: [
      "클래스픽의 AI 알고리즘은 최신 국어 교육과정을 기반으로 고도화되어 있으나, 실제 수업 배치 및 내신/수능 시험 출제 전 담당 선생님의 최종 내용 확인 및 다듬기 과정을 권장합니다.",
    ],
  },
  {
    icon: <Scale />,
    title: "표시·광고의 공정화에 관한 법률 준수",
    lines: [
      "클래스픽은 과장된 적중률이나 기적적인 성적 향상을 허위 보장하지 않으며, 선생님의 교재 제작 생산성 혁신과 수업 질 향상을 보조하는 정직한 파트너입니다.",
    ],
  },
];

export function LegalNotice() {
  return (
    <section className="bg-surface py-16 sm:py-20" aria-labelledby="legal-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 id="legal-title" className="text-center text-sm font-bold tracking-[0.2em] text-slate-500">
          [ 법적 안전성 및 서비스 이용 안내 ]
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {ITEMS.map((item, i) => (
            <div key={item.title} className="rounded-2xl border bg-white p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 [&_svg]:size-5">{item.icon}</span>
                <h3 className="font-bold text-slate-800">
                  {i + 1}. {item.title}
                </h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600">
                {item.lines.map((l) => (
                  <li key={l}>- {l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
