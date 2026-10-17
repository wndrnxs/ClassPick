import { BarChart3, BookCopy, FileScan, ListChecks, Network, ScrollText, ScanText, Wand2 } from "lucide-react";

import { ExamReportView, ExamSetView } from "@/components/material/exam-views";
import { AnnotationView, McqView, OxView, StructureView, VocabView } from "@/components/material/sections";
import { getSample, SAMPLES, sampleExamReport } from "@/lib/samples";
import type { ExamSet } from "@/lib/schemas";
import { FeatureDialog } from "./feature-dialog";
import { SectionHeading } from "./section-heading";

function OcrPreview() {
  const lucky = getSample("lucky-day")!;
  return (
    <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
      <div className="relative rotate-[-1.5deg] rounded-lg border bg-[#f6f1e7] p-4 shadow-inner">
        <span className="absolute top-2 right-2 rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-bold text-white">SCAN.pdf</span>
        <div className="passage text-[13px] leading-loose text-slate-700/80 blur-[0.6px]">{lucky.passage.slice(0, 210)}…</div>
      </div>
      <div className="flex justify-center">
        <span className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">
          <ScanText className="size-4" /> OCR
        </span>
      </div>
      <div className="rounded-lg border-2 border-primary/30 bg-white p-4">
        <span className="mb-2 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-primary">편집 가능한 HWPX</span>
        <p className="passage text-[13px] leading-loose text-slate-900">{lucky.passage.slice(0, 210)}…</p>
      </div>
    </div>
  );
}

function sampleExam(): ExamSet {
  return {
    title: "1학기 중간고사 대비 실전 모의평가",
    school: "클래스픽고등학교",
    grade: "1학년",
    timeLimit: 50,
    instructions: ["문제지와 답안지에 이름을 정확히 쓰시오.", "선택형은 OMR, 서술형은 서술형 답안지에 작성하시오."],
    sections: SAMPLES.slice(0, 2).map((s) => ({
      materialId: s.slug,
      passage: { title: s.title, author: s.author, text: s.passage },
      mcq: s.content.mcq!.questions.slice(0, 1),
      short_answer: [],
      ox: [],
    })),
  };
}

export function Features() {
  const azalea = getSample("azalea")!.content;
  const features = [
    {
      icon: <Network />,
      tag: "Structure",
      title: "작품 도식화 & 구조 분석",
      copy: "한눈에 들어오는 시각적 작품 요약 노트",
      body: "갈래, 성격, 시점 등 기본 정보부터 주요 인물 관계, 갈등 구조, 사건의 인과관계 및 핵심 출제 포인트까지 한 페이지에 깔끔하게 도식화해 드립니다.",
      preview: <StructureView data={azalea.structure!} />,
    },
    {
      icon: <ScrollText />,
      tag: "Annotation",
      title: "행간주 & 구절별 정밀 해설",
      copy: "지문 구절마다 세밀하게 짚어주는 출제 포인트 해설",
      body: "시·소설·비문학 본문 구절별 핵심 해설과 표현 기법, 출제 포인트를 행간주 형태로 자동 정리하여 고품질 해설지를 완성합니다.",
      preview: <AnnotationView data={azalea.annotation!} />,
    },
    {
      icon: <ListChecks />,
      tag: "Questions & Quiz",
      title: "다채로운 문제 은행 & OX·어휘 퀴즈",
      copy: "5지선다부터 약술형, OX, 초성 퀴즈까지 맞춤 출제",
      body: "내신 및 수능 스타일의 5지선다·약술형 문항은 물론, 오개념을 잡는 OX 정리와 어휘력 향상을 위한 초성 퀴즈를 자유롭게 선택하여 출제할 수 있습니다.",
      preview: (
        <div className="space-y-5">
          <McqView data={azalea.mcq!} showAnswers limit={2} />
          <OxView data={azalea.ox!} showAnswers limit={3} />
          <VocabView data={azalea.vocab!} showAnswers limit={3} />
        </div>
      ),
    },
    {
      icon: <BarChart3 />,
      tag: "Exam Analysis",
      title: "시험지 구조 및 난이도 분석 보고서",
      copy: "내신 시험지를 다각도로 분석한 정밀 분석 리포트",
      body: "시험지 등록 시 문항별 난이도 분포, 장르별 출제 비중, 세부 분석과 영역별 학습 전략 보고서를 자동 추출하여 학부모 상담 및 수업 안내에 활용합니다.",
      preview: <ExamReportView report={sampleExamReport} />,
    },
    {
      icon: <FileScan />,
      tag: "Smart OCR",
      title: "스캔 문서 스마트 OCR 변환",
      copy: "타이핑 없이 스캔본을 바로 편집 가능 문서로",
      body: "스캔한 PDF나 이미지 속 지문·표·기호를 OCR 기술로 정확히 읽어내어 편집 가능한 한글(HWPX) 문서로 손쉽게 전환해 드립니다.",
      preview: <OcrPreview />,
    },
    {
      icon: <BookCopy />,
      tag: "Multi-Passage Test",
      title: "여러 지문 모음 시험지 제본",
      copy: "원하는 지문들을 묶어 단 하나의 시험지로 완결",
      body: "작품별 본문 파일들을 원하는 순서대로 배치하고, 영역별 출제 유형을 매칭하여 완성도 높은 종합 시험지 한 묶음을 생성합니다.",
      preview: <ExamSetView exam={sampleExam()} showAnswers={false} />,
    },
  ];

  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Core Features"
          title="수업 준비에 필요한 6가지 핵심 기능"
          description="지문 한 편이면 충분합니다. 분석부터 출제, 시험지 제본과 분석 보고서까지 국어 수업의 전 과정을 클래스픽이 함께합니다."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <article
              key={f.tag}
              className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--shadow-lift)] sm:p-7"
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-emerald opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-white [&_svg]:size-6">
                  {f.icon}
                </span>
                <span className="text-xs font-bold tracking-wide text-slate-300">0{i + 1}</span>
              </div>
              <p className="mt-5 text-xs font-bold tracking-wider text-primary uppercase">{f.tag}</p>
              <h3 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">{f.title}</h3>
              <p className="mt-3 text-[15px] font-bold text-slate-800">“{f.copy}”</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{f.body}</p>
              <div className="mt-5 border-t pt-4">
                <FeatureDialog title={f.title} description={f.copy}>
                  {f.preview}
                </FeatureDialog>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Wand2 className="size-4 text-primary" /> 모든 샘플은 실제 클래스픽 출력 형식 그대로입니다.
        </p>
      </div>
    </section>
  );
}
