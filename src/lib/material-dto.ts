/** 서버 → 클라이언트로 전달되는 자료(Material) 데이터 형태 */
import type { ExamReport, ExamSet, GenerationSettings, MaterialType, OcrResult, PassageContent } from "@/lib/schemas";

type MaterialBase = {
  id: string;
  title: string;
  author: string;
  sourceNote: string;
  sourceText: string;
  types: MaterialType[];
  engine: "claude" | "demo" | "none";
  pointsSpent: number;
  createdAt: string;
};

export type PassageMaterialDTO = MaterialBase & {
  kind: "passage";
  settings: Partial<GenerationSettings>;
  content: PassageContent;
};
export type ExamReportMaterialDTO = MaterialBase & {
  kind: "exam_report";
  settings: { school?: string; grade?: string };
  content: { report: ExamReport };
};
export type ExamSetMaterialDTO = MaterialBase & {
  kind: "exam_set";
  settings: Record<string, unknown>;
  content: { exam: ExamSet };
};
export type OcrMaterialDTO = MaterialBase & {
  kind: "ocr";
  settings: Record<string, unknown>;
  content: { ocr: OcrResult };
};

export type MaterialDTO = PassageMaterialDTO | ExamReportMaterialDTO | ExamSetMaterialDTO | OcrMaterialDTO;

export type MaterialSummaryDTO = Pick<
  MaterialBase,
  "id" | "title" | "author" | "types" | "engine" | "pointsSpent" | "createdAt"
> & {
  kind: MaterialDTO["kind"];
  /** 시험지 제본에 쓸 수 있는 문항 수 */
  questionCounts: { mcq: number; short_answer: number; ox: number };
};
