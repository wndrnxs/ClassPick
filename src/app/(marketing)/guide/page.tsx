import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Download, FileInput, LayoutGrid, Lightbulb, ShieldCheck } from "lucide-react";

import { Faq } from "@/components/marketing/faq";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "이용가이드",
  description: "클래스픽으로 지문 하나에서 수업 자료 세트를 만드는 방법과 좋은 결과를 얻는 팁.",
};

const STEPS = [
  {
    icon: <FileInput />,
    title: "1. 지문 입력 및 설정",
    points: [
      "‘새 자료 만들기’에서 지문을 붙여넣거나 파일을 업로드합니다.",
      "작품명·작가·출처를 입력하면 자료 하단에 출처가 자동으로 표기됩니다.",
      "학교급(중/고/수능), 학년, 난이도(기초/표준/심화)를 선택합니다.",
    ],
  },
  {
    icon: <LayoutGrid />,
    title: "2. 자료 유형 선택",
    points: [
      "작품 도식화, 행간주 해설, 5지선다, 서술형, OX, 초성 어휘 퀴즈 중 필요한 것만 고릅니다.",
      "문항 수를 조절할 수 있으며, 선택에 따라 사용할 토큰 수가 바로 표시됩니다.",
    ],
  },
  {
    icon: <Download />,
    title: "3. 포맷 선택 및 다운로드",
    points: [
      "HWPX(한글 편집), DOCS(Word·구글 문서), PDF(인쇄) 중 선택합니다.",
      "교사용(정답·해설 포함)과 학생용(문제만)을 따로 내려받을 수 있습니다.",
    ],
  },
];

const FORMATS = [
  ["텍스트 붙여넣기", "가장 정확합니다. 연·행 구분은 빈 줄과 줄바꿈으로 표시해 주세요.", "무료"],
  ["HWPX · DOCX · TXT", "문서의 본문 텍스트를 그대로 가져옵니다.", "무료"],
  ["텍스트 PDF", "PDF 안의 텍스트 레이어를 추출합니다.", "무료"],
  ["스캔 PDF · 이미지(JPG/PNG)", "스마트 OCR로 지문·표·기호(①, ㉠)를 읽어 편집 가능한 문서로 바꿉니다.", "토큰 1개"],
  ["구버전 HWP", "한글에서 ‘다른 이름으로 저장 → HWPX’로 변환 후 업로드해 주세요.", "-"],
];

const TIPS = [
  "시는 연과 연 사이에 빈 줄을 넣어 주세요. 행간주 해설과 시상 전개 분석이 연 단위로 정확해집니다.",
  "소설은 장면이 바뀌는 지점에서 문단을 나누면 사건 전개 도식화가 깔끔해집니다.",
  "수업에서 강조할 갈래를 직접 지정하면(예: 고전시가) 분석 틀이 그 갈래에 맞춰집니다.",
  "생성된 문항은 반드시 한 번 풀어 보고, 학교·학원 양식에 맞게 HWPX에서 다듬어 사용하세요.",
];

const FAQ = [
  { q: "교과서·모의고사 지문을 써도 되나요?", a: "학교 수업 목적의 이용은 저작권법 제25조의 범위에서 가능하며, 학원 등 그 밖의 기관은 공정 이용 범위 또는 저작권자 허락 범위에서 이용해야 합니다. 자세한 내용은 이용약관의 ‘저작권 및 교육 목적 이용’ 조항을 확인해 주세요." },
  { q: "만든 자료를 다른 선생님과 공유할 수 있나요?", a: "내려받은 파일은 자유롭게 공유할 수 있습니다. 팀 자료함 공유 기능은 프로·학원 요금제에서 준비 중입니다." },
  { q: "AI가 만든 문항을 그대로 시험에 써도 되나요?", a: "클래스픽의 결과물은 초안입니다. 실제 시험 출제 전에는 담당 선생님이 정답의 유일성, 선지의 타당성, 교육과정 범위를 반드시 검토해 주세요." },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading eyebrow="Guide" title="클래스픽 이용가이드" description="처음 사용하시나요? 세 단계만 따라 하면 첫 수업 자료가 완성됩니다." />

      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.title} className="rounded-2xl border bg-white p-6">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary [&_svg]:size-5">{s.icon}</span>
            <h2 className="mt-4 text-lg font-extrabold">{s.title}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              {s.points.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-xl font-extrabold">
          <BookOpenCheck className="size-5 text-primary" /> 지원하는 입력 형식
        </h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-secondary text-left text-secondary-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">형식</th>
                <th className="px-4 py-3 font-bold">처리 방식</th>
                <th className="px-4 py-3 text-right font-bold">비용</th>
              </tr>
            </thead>
            <tbody>
              {FORMATS.map(([name, how, cost]) => (
                <tr key={name} className="border-t">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{name}</td>
                  <td className="px-4 py-3 text-slate-600">{how}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-soft/60 p-6">
        <h2 className="flex items-center gap-2 text-xl font-extrabold">
          <Lightbulb className="size-5 text-amber" /> 더 좋은 결과를 얻는 팁
        </h2>
        <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-slate-700">
          {TIPS.map((t) => (
            <li key={t}>✔ {t}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold">
          <ShieldCheck className="size-5 text-emerald" /> 자주 묻는 질문
        </h2>
        <Faq items={FAQ} />
      </section>

      <div className="flex justify-center">
        <Button asChild size="lg" variant="gradient">
          <Link href="/signup">지금 첫 자료 만들기</Link>
        </Button>
      </div>
    </div>
  );
}
