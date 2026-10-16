import "server-only";

import type {
  Annotation,
  AnalyzeExamInput,
  ExamReport,
  GenerationSettings,
  MaterialType,
  Mcq,
  Ox,
  ShortAnswer,
  Structure,
  Vocab,
} from "@/lib/schemas";
import type { UploadedFile } from "@/server/ingest/extract";

/** 자료 유형별 AI 원시 출력 */
export type SectionOutput = {
  structure: Structure;
  annotation: Annotation;
  mcq: Mcq;
  short_answer: ShortAnswer;
  ox: Ox;
  vocab: Vocab;
};

export type PassageContext = {
  passage: string;
  title: string;
  author: string;
  sourceNote: string;
  settings: GenerationSettings;
};

/** AI 엔진 추상화: Claude(실서비스) / Demo(키 없이 동작하는 로컬 엔진) */
export interface AiEngine {
  readonly name: "claude" | "demo";
  generateSection<T extends MaterialType>(type: T, ctx: PassageContext): Promise<SectionOutput[T]>;
  analyzeExam(input: AnalyzeExamInput): Promise<ExamReport>;
  ocr(file: UploadedFile): Promise<string>;
}
