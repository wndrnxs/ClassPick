import { Features } from "@/components/marketing/features";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { LegalNotice } from "@/components/marketing/legal-notice";
import { OutputFormats } from "@/components/marketing/output-formats";
import { PainSolution } from "@/components/marketing/pain-solution";
import { PlanCards } from "@/components/marketing/pricing-cards";
import { SectionHeading } from "@/components/marketing/section-heading";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <PainSolution />
      <Features />
      <HowItWorks />
      <OutputFormats />
      <section className="bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="필요한 만큼, 연필로 간단하게"
            description="자료 유형마다 정해진 연필만 사용합니다. 가입하면 바로 쓸 수 있는 무료 연필을 드려요."
          />
          <div className="mt-14">
            <PlanCards />
          </div>
        </div>
      </section>
      <LegalNotice />
      <FinalCta />
    </>
  );
}
