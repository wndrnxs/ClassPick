/**
 * 자료 수정 입력 검증 (클라이언트·서버 공용)
 *
 * AI 출력 스키마를 그대로 쓰되, 사람이 고친 값에서 깨지기 쉬운 규칙(선지 5개, 정답 1~5, 빈 발문 등)을 더 엄격히 봅니다.
 * 자료 유형(지문 자료의 구성 등)과 생성 이력은 바꿀 수 없고, 글 내용만 고칩니다.
 */
import { z } from "zod";

import { normalizeRich, stripRich } from "./rich-text";
import {
  AnnotationSchema,
  DIFFICULTY_LEVELS,
  ExamReportSchema,
  McqSchema,
  OxSchema,
  ShortAnswerSchema,
  StructureSchema,
  VocabSchema,
} from "./schemas";

const required = (label: string, max = 4000) =>
  z.string().trim().min(1, `${label}을(를) 입력해 주세요.`).max(max, `${label}이(가) 너무 길어요.`);

export const McqQuestionEdit = McqSchema.shape.questions.element.extend({
  stem: required("발문", 1000),
  bogi: z
    .string()
    .max(4000)
    .nullable()
    .transform((v) => (v && v.trim() ? v : null)),
  options: z.array(required("선지", 1000)).length(5, "선지는 5개여야 해요."),
  answer: z.number().int().min(1, "정답 번호는 1~5 중 하나여야 해요.").max(5, "정답 번호는 1~5 중 하나여야 해요."),
  option_notes: z.array(z.string().max(1000)).length(5),
  difficulty: z.enum(DIFFICULTY_LEVELS),
});

export const ShortAnswerQuestionEdit = ShortAnswerSchema.shape.questions.element.extend({
  stem: required("서술형 발문", 1000),
  scoring: z.array(z.object({ criterion: z.string().max(1000), points: z.number({ error: "배점을 숫자로 입력해 주세요." }).min(0).max(100) })),
});

export const OxItemEdit = OxSchema.shape.items.element.extend({ statement: required("OX 진술", 1000) });

export const VocabItemEdit = VocabSchema.shape.items.element.extend({ answer: required("정답 어휘", 40) });

const PassageContentEdit = z.object({
  structure: StructureSchema.optional(),
  annotation: AnnotationSchema.optional(),
  mcq: z.object({ questions: z.array(McqQuestionEdit) }).optional(),
  short_answer: z.object({ questions: z.array(ShortAnswerQuestionEdit) }).optional(),
  ox: z.object({ items: z.array(OxItemEdit) }).optional(),
  // 초성(initials)은 서버에서 정답으로 다시 계산합니다.
  vocab: z.object({ items: z.array(VocabItemEdit) }).optional(),
});

/** 지문 텍스트: 서식 표기를 정돈하고, 표기를 뺀 길이로 검사 */
const PassageText = z
  .string()
  .max(80000, "지문은 20,000자 이하로 입력해 주세요.")
  .transform((v) => normalizeRich(v).trim())
  .refine((v) => stripRich(v).trim().length > 0, "지문을 입력해 주세요.")
  .refine((v) => stripRich(v).length <= 20000, "지문은 20,000자 이하로 입력해 주세요.");

const ExamSetEdit = z.object({
  title: z.string(),
  school: z.string().trim().max(60),
  grade: z.string().trim().max(20),
  timeLimit: z.number({ error: "제한 시간을 숫자로 입력해 주세요." }).int().min(5, "제한 시간은 5~300분으로 입력해 주세요.").max(300, "제한 시간은 5~300분으로 입력해 주세요.").nullable(),
  instructions: z.array(z.string().max(500)).max(20),
  sections: z
    .array(
      z.object({
        materialId: z.string(),
        passage: z.object({ title: z.string().max(120), author: z.string().max(60), text: PassageText }),
        mcq: z.array(McqQuestionEdit),
        short_answer: z.array(ShortAnswerQuestionEdit),
        ox: z.array(OxItemEdit),
      }),
    )
    .min(1),
});

const Base = {
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(120, "제목은 120자 이하로 입력해 주세요."),
  author: z.string().trim().max(60, "작가는 60자 이하로 입력해 주세요.").default(""),
  sourceNote: z.string().trim().max(120, "출처는 120자 이하로 입력해 주세요.").default(""),
};

export const UpdateMaterialInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("passage"), ...Base, sourceText: PassageText, content: PassageContentEdit }),
  z.object({ kind: z.literal("exam_report"), ...Base, content: z.object({ report: ExamReportSchema }) }),
  z.object({ kind: z.literal("exam_set"), ...Base, content: z.object({ exam: ExamSetEdit }) }),
  z.object({
    kind: z.literal("ocr"),
    ...Base,
    content: z.object({ ocr: z.object({ text: z.string().max(60000).refine((v) => v.trim().length > 0, "내용을 입력해 주세요.") }) }),
  }),
]);
export type UpdateMaterialInput = z.input<typeof UpdateMaterialInput>;

/* ------------------------------------------------------------------ */
/* 검증 오류를 사람이 읽을 수 있는 위치로                                    */
/* ------------------------------------------------------------------ */

const KEY_LABELS: Record<string, string> = {
  structure: "작품 도식화",
  annotation: "행간주 해설",
  mcq: "5지선다",
  short_answer: "서술형",
  ox: "OX 퀴즈",
  vocab: "어휘 퀴즈",
  report: "분석 보고서",
  exam: "시험지",
  sections: "지문",
  options: "선지",
  sourceText: "지문",
};

/** ["content","mcq","questions",1,"options",2] → "5지선다 2번 · 선지 3" */
export function issueLocation(path: PropertyKey[]): string {
  const parts: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (typeof key === "number") {
      const prev = parts.pop();
      parts.push(prev ? `${prev} ${key + 1}${path[i - 1] === "options" ? "" : "번"}` : `${key + 1}번`);
    } else if (typeof key === "string" && KEY_LABELS[key]) {
      parts.push(KEY_LABELS[key]);
    }
  }
  return parts.join(" · ");
}
