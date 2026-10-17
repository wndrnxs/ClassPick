/** 인쇄(PDF 저장) 전용 문서 레이아웃 — A4 기준, 교사용/학생용 */
import { MATERIAL_TYPE_META, MATERIAL_TYPE_ORDER } from "@/lib/catalog";
import type { MaterialDTO } from "@/lib/material-dto";
import { DIFFICULTIES, SCHOOL_LEVELS } from "@/lib/schemas";
import { ExamReportView, ExamSetView } from "./exam-views";
import { AnnotationView, McqView, OxView, PassageView, ShortAnswerView, StructureView, VocabView } from "./sections";

const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ"];

function PrintSection({ title, children, breakBefore }: { title: string; children: React.ReactNode; breakBefore?: boolean }) {
  return (
    <section className={breakBefore ? "print-break pt-2" : "pt-2"}>
      <h2 className="mb-4 border-b-2 border-primary pb-1.5 text-lg font-extrabold text-primary-deep">{title}</h2>
      {children}
    </section>
  );
}

export function PrintDocument({ material, audience }: { material: MaterialDTO; audience: "teacher" | "student" }) {
  const showAnswers = audience === "teacher";
  const meta: string[] = [];
  if (material.author) meta.push(material.author);
  if (material.kind === "passage") {
    const s = material.settings;
    if (s.schoolLevel) meta.push(`${SCHOOL_LEVELS[s.schoolLevel]}${s.grade ? ` ${s.grade}` : ""}`);
    if (s.difficulty) meta.push(`난이도 ${DIFFICULTIES[s.difficulty]}`);
  } else if (material.sourceNote) meta.push(material.sourceNote);
  if (material.kind === "passage" || material.kind === "exam_set") meta.push(showAnswers ? "교사용 (정답·해설 포함)" : "학생용");

  return (
    <article className="mx-auto max-w-[210mm] space-y-8 bg-white px-[14mm] py-[14mm] text-slate-900 shadow-xl print:max-w-none print:p-0 print:shadow-none">
      {material.kind !== "exam_set" && (
        <header className="border-b pb-4 text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-primary">CLASSPICK</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{material.title}</h1>
          {meta.length > 0 && <p className="mt-2 text-sm text-slate-500">{meta.join("  ·  ")}</p>}
        </header>
      )}

      {material.kind === "passage" && (
        <>
          <PrintSection title="지문">
            <PassageView text={material.sourceText} sourceNote={material.sourceNote || undefined} />
          </PrintSection>
          {MATERIAL_TYPE_ORDER.filter((t) => material.content[t]).map((t, i) => {
            const c = material.content;
            return (
              <PrintSection key={t} title={`${ROMAN[i]}. ${MATERIAL_TYPE_META[t].label}`} breakBefore={i > 0}>
                {t === "structure" && c.structure && <StructureView data={c.structure} />}
                {t === "annotation" && c.annotation && <AnnotationView data={c.annotation} />}
                {t === "mcq" && c.mcq && <McqView data={c.mcq} showAnswers={showAnswers} />}
                {t === "short_answer" && c.short_answer && <ShortAnswerView data={c.short_answer} showAnswers={showAnswers} />}
                {t === "ox" && c.ox && <OxView data={c.ox} showAnswers={showAnswers} />}
                {t === "vocab" && c.vocab && <VocabView data={c.vocab} showAnswers={showAnswers} />}
              </PrintSection>
            );
          })}
        </>
      )}
      {material.kind === "exam_report" && <ExamReportView report={material.content.report} />}
      {material.kind === "exam_set" && <ExamSetView exam={material.content.exam} showAnswers={showAnswers} />}
      {material.kind === "ocr" && <PassageView text={material.content.ocr.text} />}

      <footer className="border-t pt-3 text-[11px] leading-relaxed text-slate-500">
        ※ 본 자료는 클래스픽(ClassPick) AI가 생성한 초안입니다. 수업·평가 활용 전 담당 선생님의 최종 검수를 거쳐 주세요. 지문의 저작권은
        원저작자에게 있으며, 교육 목적 범위에서 출처를 밝혀 사용해 주세요.
      </footer>
    </article>
  );
}
