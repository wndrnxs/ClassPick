import { FileImage, FileText, Printer } from "lucide-react";

import { SectionHeading } from "./section-heading";

const FORMATS = [
  {
    icon: <FileText />,
    name: "HWPX",
    label: "한글 문서",
    color: "bg-blue-50 text-primary",
    body: "학원 양식이나 학교 고유 템플릿에 맞춰 문제, 정답, 해설을 자유롭게 재편집할 때 활용합니다.",
  },
  {
    icon: <Printer />,
    name: "PDF",
    label: "인쇄용 문서",
    color: "bg-red-50 text-red-600",
    body: "레이아웃이 완성된 도식화 및 정밀 분석 자료를 바로 인쇄하거나 태블릿 수업용으로 배포할 때 활용합니다.",
  },
  {
    icon: <FileImage />,
    name: "DOCS",
    label: "디지털 매체",
    color: "bg-sky-50 text-sky-700",
    body: "온라인 과제 배포 및 시각 자료 공유용으로 활용합니다. Word·구글 문서에서 바로 열립니다.",
  },
];

export function OutputFormats() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Output Formats"
          title="수업 환경에 맞는 포맷으로"
          description="모든 자료는 교사용(정답·해설 포함)과 학생용(문제만) 두 가지 버전으로 내려받을 수 있습니다."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {FORMATS.map((f) => (
            <div key={f.name} className="rounded-2xl border bg-white p-7">
              <div className="flex items-center gap-3">
                <span className={`flex size-12 items-center justify-center rounded-xl ${f.color} [&_svg]:size-6`}>{f.icon}</span>
                <div>
                  <p className="text-xl font-black tracking-tight">{f.name}</p>
                  <p className="text-sm font-semibold text-muted-foreground">{f.label}</p>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
