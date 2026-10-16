import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, ListChecks, Network, ScrollText, Sparkles } from "lucide-react";

import { ExamReportView } from "@/components/material/exam-views";
import { AnnotationView, OxView, StructureView, VocabView } from "@/components/material/sections";
import { Button } from "@/components/ui/button";
import { getSample, sampleExamReport } from "@/lib/samples";
import { HeroPreview } from "./hero-preview";

const TRUST = ["HWPX · PDF · DOCS 완벽 지원", "현직 국어 교사 및 명문 학원 강사 활용 중", "지문 1개로 6가지 자료 동시 생성"];

export function Hero() {
  const azalea = getSample("azalea")!;
  const c = azalea.content;
  const panels = [
    { id: "structure", label: "작품 도식화", icon: <Network />, content: <StructureView data={c.structure!} compact /> },
    { id: "annotation", label: "행간주 해설", icon: <ScrollText />, content: <AnnotationView data={c.annotation!} limit={3} /> },
    {
      id: "quiz",
      label: "OX/어휘 퀴즈",
      icon: <ListChecks />,
      content: (
        <div className="space-y-4">
          <OxView data={c.ox!} showAnswers limit={4} />
          <VocabView data={c.vocab!} showAnswers limit={2} />
        </div>
      ),
    },
    { id: "report", label: "시험지 분석 보고서", icon: <BarChart3 />, content: <ExamReportView report={sampleExamReport} compact /> },
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="absolute -top-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-200/50 to-transparent blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pt-20 lg:pb-28">
        <div>
          <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-blue-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-secondary-foreground shadow-sm sm:text-[13px]">
            <span className="flex items-center gap-1 text-primary">
              <Sparkles className="size-3.5" /> HWPX · PDF · DOCS 완벽 지원
            </span>
            <span className="hidden text-blue-200 sm:inline">|</span>
            <span>현직 국어 교사 및 명문 학원 강사 활용 중</span>
          </p>
          <h1 className="mt-6 text-[2.35rem] leading-[1.18] font-black tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-[3.6rem]">
            지문 하나로,
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-600 to-primary-deep bg-clip-text text-transparent">
              수업 준비가 달라집니다.
            </span>
          </h1>
          <p className="mt-5 text-lg font-bold text-slate-800 sm:text-xl">
            국어 수업 교재 제작, 이제 클래스픽으로 <span className="text-primary">3분 만에</span> 완벽하게.
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-slate-600 sm:text-[17px]">
            지문 한 편만 입력하면 문제 출제부터 행간주 해설, 작품 도식화, 시험 분석 보고서까지 한 번에 완성하세요. 편집 가능한 HWPX, DOCS,
            바로 인쇄하는 PDF 포맷을 완벽하게 지원합니다.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="xl" variant="gradient">
              <Link href="/signup">
                <Sparkles className="size-5" /> 무료로 첫 수업 자료 만들기
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="bg-white/70">
              <Link href="/samples">
                생성 샘플 자료 둘러보기 <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>
          <ul className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <CheckCircle2 className="size-4 text-emerald" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <HeroPreview panels={panels} sampleSlug="azalea" />
      </div>
    </section>
  );
}
