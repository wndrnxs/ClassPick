import type { Metadata } from "next";

import { Faq } from "@/components/marketing/faq";
import { PencilCostTable, PlanCards } from "@/components/marketing/pricing-cards";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SIGNUP_BONUS_PENCILS } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "요금제",
  description: "토큰(포인트) 기반의 합리적인 요금제. 가입 즉시 무료 체험 토큰을 드립니다.",
};

const FAQ = [
  {
    q: "토큰은 어떻게 사용되나요?",
    a: "자료를 생성할 때 선택한 자료 유형에 따라 토큰이 차감됩니다. 예를 들어 작품 도식화(1) + 행간주 해설(1) + 5지선다(2)를 함께 만들면 토큰 4개가 사용됩니다. 생성이 실패하면 자동으로 환불됩니다.",
  },
  {
    q: "무료 체험으로 무엇을 할 수 있나요?",
    a: `가입하면 토큰 ${SIGNUP_BONUS_PENCILS}개가 지급되어, 지문 4~5편 분량의 풀세트 자료(6가지 유형)를 직접 만들어 볼 수 있습니다. 모든 다운로드 포맷도 제한 없이 이용할 수 있습니다.`,
  },
  {
    q: "만든 자료를 여러 번 내려받으면 토큰이 또 차감되나요?",
    a: "아니요. 한 번 생성한 자료는 내 자료함에 보관되며, HWPX·DOCS·PDF 어떤 형식으로든 횟수 제한 없이 무료로 내려받을 수 있습니다.",
  },
  {
    q: "생성 결과가 마음에 들지 않으면 어떻게 하나요?",
    a: "같은 지문으로 난이도·문항 수·갈래 설정을 바꿔 다시 생성할 수 있습니다. 생성 과정에서 오류가 발생한 경우에는 사용한 토큰이 자동으로 환불됩니다.",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 sm:py-20">
        <div>
          <SectionHeading
            eyebrow="Pricing"
            title="필요한 만큼, 토큰으로 간단하게"
            description="자료 유형마다 정해진 토큰만 사용합니다. 정기 구독 또는 1회 충전 중 편한 방식을 선택하세요."
          />
          <div className="mt-14">
            <PlanCards />
          </div>
        </div>
        <PencilCostTable />
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-extrabold">자주 묻는 질문</h2>
          <Faq items={FAQ} />
        </div>
      </div>
    </div>
  );
}
