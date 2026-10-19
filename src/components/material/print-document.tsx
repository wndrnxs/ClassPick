/** 인쇄(PDF 저장) 전용 문서 레이아웃 — A4 기준, 교사용/학생용 */
import type { MaterialDTO } from "@/lib/material-dto";
import { ExamReportView } from "./exam-views";
import { hasPaperLayout, PaperDocument } from "./paper";

export function PrintDocument({ material, audience, columns = 2 }: { material: MaterialDTO; audience: "teacher" | "student"; columns?: 1 | 2 }) {
  // 지문 자료·모음 시험지·OCR 문서는 시험지 형식(기본 2단)으로 인쇄합니다.
  if (hasPaperLayout(material)) {
    return (
      <article className="mx-auto max-w-[210mm] print:max-w-none">
        <PaperDocument material={material} showAnswers={audience === "teacher"} columns={columns} />
      </article>
    );
  }

  // 시험지 분석 보고서는 표·차트가 많아 1단 보고서 형식을 유지합니다.
  return (
    <article className="mx-auto max-w-[210mm] space-y-8 bg-white px-[14mm] py-[14mm] text-slate-900 shadow-xl print:max-w-none print:p-0 print:shadow-none">
      <header className="border-b pb-4 text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-primary">CLASSPICK</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{material.title}</h1>
        {material.sourceNote && <p className="mt-2 text-sm text-slate-500">{material.sourceNote}</p>}
      </header>
      <ExamReportView report={material.content.report} />
      <footer className="border-t pt-3 text-[11px] leading-relaxed text-slate-500">
        ※ 본 자료는 클래스픽(ClassPick) AI가 생성한 초안입니다. 수업·평가 활용 전 담당 선생님의 최종 검수를 거쳐 주세요.
      </footer>
    </article>
  );
}
