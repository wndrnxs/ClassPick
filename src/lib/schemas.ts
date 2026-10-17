/**
 * 클래스픽 도메인 스키마 (Zod)
 *
 * - AI 파이프라인의 구조화 출력(Structured Outputs) 스키마
 * - DB에 JSON으로 저장되는 자료(material) 콘텐츠의 타입
 * - API 요청 바디 검증
 *
 * NOTE: Claude 구조화 출력은 min/max 같은 수치·길이 제약을 지원하지 않으므로
 * AI 출력 스키마에는 제약을 두지 않고, 개수 보정은 서버 후처리에서 수행합니다.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 1. 자료 유형                                                         */
/* ------------------------------------------------------------------ */

export const MATERIAL_TYPES = ["structure", "annotation", "mcq", "short_answer", "ox", "vocab"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_KINDS = ["passage", "exam_report", "exam_set", "ocr"] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

/* ------------------------------------------------------------------ */
/* 2. AI 출력 스키마 — 지문 기반 자료                                    */
/* ------------------------------------------------------------------ */

export const StructureSchema = z.object({
  title: z.string().describe("작품명 또는 글의 제목"),
  author: z.string().describe("작가명. 알 수 없으면 '미상'"),
  genre: z.string().describe("갈래 (예: 현대시, 자유시·서정시 / 현대소설, 단편소설 / 독서-인문)"),
  characteristics: z.array(z.string()).describe("성격 키워드 2~5개 (예: 전통적, 민요적, 애상적)"),
  basic_info: z.object({
    point_of_view: z.string().describe("시점 또는 화자"),
    background: z.string().describe("시대적·공간적 배경"),
    theme: z.string().describe("주제"),
    tone: z.string().describe("어조 또는 문체상 특징"),
  }),
  one_line_summary: z.string().describe("작품 전체를 한 문장으로 요약"),
  keywords: z
    .array(z.object({ term: z.string(), meaning: z.string() }))
    .describe("핵심 시어·소재·개념과 그 의미 3~6개"),
  structure_flow: z
    .array(
      z.object({
        stage: z.string().describe("단계명 (예: 1연(기), 발단, 1문단)"),
        summary: z.string().describe("핵심 내용"),
        key_symbol: z.string().describe("주요 상징 및 의미, 없으면 빈 문자열"),
      }),
    )
    .describe("시상 전개 또는 사건/논지 전개 흐름 3~6단계"),
  character_relation: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        kind: z.enum(["갈등", "협력", "애정", "중립"]),
        relation: z.string().describe("관계를 나타내는 짧은 표현"),
        description: z.string().describe("관계 또는 갈등의 원인"),
      }),
    )
    .describe("인물(또는 화자-대상) 관계. 비문학이면 빈 배열"),
  core_conflict: z.string().nullable().describe("핵심 갈등 구조. 없으면 null"),
  exam_points: z.array(z.string()).describe("내신·수능 핵심 출제 포인트 3~6개"),
});
export type Structure = z.infer<typeof StructureSchema>;

export const AnnotationSchema = z.object({
  overview: z.string().describe("해설 개관 (2~3문장)"),
  segments: z
    .array(
      z.object({
        ref: z.string().describe("구절 위치 (예: 1연 1~3행, 2문단)"),
        text: z.string().describe("원문 구절을 그대로 인용"),
        explanation: z.string().describe("구절의 의미와 맥락 해설"),
        devices: z.array(z.string()).describe("표현 기법·문법 요소 태그 (예: 반어법, 수미상관, 높임 표현)"),
        exam_point: z.string().nullable().describe("이 구절의 출제 포인트, 없으면 null"),
      }),
    )
    .describe("지문 전체를 빠짐없이 순서대로 덮는 구절별 해설"),
  key_takeaways: z.array(z.string()).describe("수업 마무리용 핵심 정리 3~5개"),
});
export type Annotation = z.infer<typeof AnnotationSchema>;

export const DIFFICULTY_LEVELS = ["하", "중", "상"] as const;

export const McqSchema = z.object({
  questions: z.array(
    z.object({
      type: z.string().describe("출제 유형 (예: 표현상 특징, 구절의 의미, 외적 준거 감상)"),
      stem: z.string().describe("발문. 예: '윗글에 대한 설명으로 가장 적절한 것은?'"),
      bogi: z.string().nullable().describe("<보기> 자료. 없으면 null"),
      options: z.array(z.string()).describe("선지 정확히 5개 (번호 기호 없이 내용만)"),
      answer: z.number().int().describe("정답 번호 1~5"),
      explanation: z.string().describe("정답 해설"),
      option_notes: z.array(z.string()).describe("선지별 해설 5개 (오답 이유 포함)"),
      difficulty: z.enum(DIFFICULTY_LEVELS),
    }),
  ),
});
export type Mcq = z.infer<typeof McqSchema>;
export type McqQuestion = Mcq["questions"][number];

export const ShortAnswerSchema = z.object({
  questions: z.array(
    z.object({
      stem: z.string().describe("서술형 발문"),
      conditions: z.array(z.string()).describe("답안 작성 조건"),
      model_answer: z.string().describe("모범 답안"),
      scoring: z.array(z.object({ criterion: z.string(), points: z.number() })).describe("채점 기준"),
      difficulty: z.enum(DIFFICULTY_LEVELS),
    }),
  ),
});
export type ShortAnswer = z.infer<typeof ShortAnswerSchema>;

export const OxSchema = z.object({
  items: z.array(
    z.object({
      statement: z.string().describe("판단할 진술 (내신 오개념을 겨냥)"),
      answer: z.boolean().describe("O이면 true, X이면 false"),
      explanation: z.string(),
      concept: z.string().describe("관련 개념 (예: 반어법, 시점)"),
    }),
  ),
});
export type Ox = z.infer<typeof OxSchema>;

export const VocabSchema = z.object({
  items: z.array(
    z.object({
      answer: z.string().describe("정답 어휘 (지문에 등장한 단어 또는 관련 개념어)"),
      definition: z.string().describe("사전적 뜻풀이 (초성 힌트와 함께 제시됨)"),
      context: z.string().describe("지문 속 쓰임 또는 예문"),
    }),
  ),
});
export type Vocab = z.infer<typeof VocabSchema>;
/** 저장 시에는 초성을 서버에서 결정적으로 계산해 덧붙입니다. */
export type VocabItem = Vocab["items"][number] & { initials: string };

/** 지문 기반 자료의 생성 결과 묶음 */
export type PassageContent = {
  structure?: Structure;
  annotation?: Annotation;
  mcq?: Mcq;
  short_answer?: ShortAnswer;
  ox?: Ox;
  vocab?: { items: VocabItem[] };
};

/* ------------------------------------------------------------------ */
/* 3. AI 출력 스키마 — 시험지 분석 보고서                                */
/* ------------------------------------------------------------------ */

export const ExamReportSchema = z.object({
  exam_title: z.string(),
  overview: z.string().describe("시험 총평 (3~4문장)"),
  questions: z.array(
    z.object({
      number: z.number().int(),
      area: z.string().describe("영역 (문학, 독서, 문법, 화법과 작문, 매체 등)"),
      genre: z.string().describe("세부 갈래 (현대시, 고전소설, 인문 등)"),
      source: z.string().describe("출제 지문/작품명, 모르면 '미상'"),
      type: z.string().describe("문항 유형"),
      difficulty: z.enum(DIFFICULTY_LEVELS),
      point: z.string().describe("출제 의도·핵심 포인트"),
    }),
  ),
  difficulty_comment: z.string().describe("난이도 분포에 대한 해석"),
  key_findings: z.array(z.string()).describe("출제 경향 핵심 발견 3~5개"),
  study_strategies: z.array(z.object({ area: z.string(), strategy: z.string() })),
  consultation_guide: z.array(z.string()).describe("학부모 상담 시 활용할 안내 문구 3~5개"),
});
export type ExamReport = z.infer<typeof ExamReportSchema>;

/* ------------------------------------------------------------------ */
/* 4. 비AI 자료 — 시험지 제본, OCR                                      */
/* ------------------------------------------------------------------ */

export type ExamSetSection = {
  materialId: string;
  passage: { title: string; author: string; text: string };
  mcq: McqQuestion[];
  short_answer: ShortAnswer["questions"];
  ox: Ox["items"];
};

export type ExamSet = {
  title: string;
  school: string;
  grade: string;
  timeLimit: number | null;
  instructions: string[];
  sections: ExamSetSection[];
};

export type OcrResult = {
  fileName: string;
  method: "text" | "hwpx" | "docx" | "pdf-text" | "ai-ocr" | "demo";
  text: string;
  note?: string;
};

/* ------------------------------------------------------------------ */
/* 5. 생성 설정 & API 입력                                              */
/* ------------------------------------------------------------------ */

export const SCHOOL_LEVELS = { middle: "중학교", high: "고등학교", csat: "수능·모의고사" } as const;
export const DIFFICULTIES = { basic: "기초", standard: "표준", advanced: "심화" } as const;

export const GenerationSettingsSchema = z.object({
  schoolLevel: z.enum(["middle", "high", "csat"]).default("high"),
  grade: z.string().max(20).default(""),
  difficulty: z.enum(["basic", "standard", "advanced"]).default("standard"),
  genre: z.string().max(40).default("auto"),
  counts: z
    .object({
      mcq: z.number().int().min(1).max(10).default(3),
      short_answer: z.number().int().min(1).max(5).default(2),
      ox: z.number().int().min(3).max(15).default(6),
      vocab: z.number().int().min(3).max(15).default(6),
    })
    .default({ mcq: 3, short_answer: 2, ox: 6, vocab: 6 }),
});
export type GenerationSettings = z.infer<typeof GenerationSettingsSchema>;

export const CreateMaterialInput = z.object({
  title: z.string().trim().max(120).default(""),
  author: z.string().trim().max(60).default(""),
  sourceNote: z.string().trim().max(120).default(""),
  passage: z
    .string()
    .trim()
    .min(20, "지문은 20자 이상 입력해 주세요.")
    .max(20000, "지문은 20,000자 이하로 입력해 주세요."),
  types: z.array(z.enum(MATERIAL_TYPES)).min(1, "자료 유형을 1개 이상 선택해 주세요."),
  settings: GenerationSettingsSchema.default({
    schoolLevel: "high",
    grade: "",
    difficulty: "standard",
    genre: "auto",
    counts: { mcq: 3, short_answer: 2, ox: 6, vocab: 6 },
  }),
});
export type CreateMaterialInput = z.infer<typeof CreateMaterialInput>;

export const AnalyzeExamInput = z.object({
  examTitle: z.string().trim().max(120).default(""),
  school: z.string().trim().max(60).default(""),
  grade: z.string().trim().max(20).default(""),
  examText: z
    .string()
    .trim()
    .min(50, "시험지 본문을 50자 이상 입력해 주세요.")
    .max(60000, "시험지 본문은 60,000자 이하로 입력해 주세요."),
});
export type AnalyzeExamInput = z.infer<typeof AnalyzeExamInput>;

export const ComposeExamInput = z.object({
  title: z.string().trim().min(1, "시험지 제목을 입력해 주세요.").max(120),
  school: z.string().trim().max(60).default(""),
  grade: z.string().trim().max(20).default(""),
  timeLimit: z.number().int().min(5).max(300).nullable().default(null),
  sections: z
    .array(
      z.object({
        materialId: z.string().min(1),
        include: z.array(z.enum(["mcq", "short_answer", "ox"])).min(1),
      }),
    )
    .min(1, "지문을 1개 이상 선택해 주세요.")
    .max(12, "한 시험지에는 최대 12개 지문까지 묶을 수 있습니다."),
});
export type ComposeExamInput = z.infer<typeof ComposeExamInput>;

export const SignupInput = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(40),
  email: z.string().trim().toLowerCase().email("이메일 형식을 확인해 주세요.").max(120),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(100),
  role: z.enum(["teacher", "instructor", "other", "student"]).default("teacher"),
  organization: z.string().trim().max(80).default(""),
  agreeTerms: z.literal(true, { error: "이용약관 및 저작권 안내에 동의해 주세요." }),
});
export type SignupInput = z.infer<typeof SignupInput>;

export const LoginInput = z.object({
  email: z.string().trim().toLowerCase().email("이메일 형식을 확인해 주세요."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

/* ------------------------------------------------------------------ */
/* 학생 포털                                                            */
/* ------------------------------------------------------------------ */

export const CreateClassInput = z.object({
  name: z.string().trim().min(1, "반 이름을 입력해 주세요.").max(40),
});

export const JoinClassInput = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "참여 코드 6자리를 확인해 주세요."),
});

export const CreateAssignmentInput = z.object({
  materialId: z.string().min(1),
  classId: z.string().min(1, "배포할 반을 선택해 주세요."),
  title: z.string().trim().min(1, "시험 제목을 입력해 주세요.").max(120),
  revealAnswers: z.boolean().default(true),
});

export const SubmitAnswersInput = z.object({
  answers: z.record(z.string(), z.union([z.number().int(), z.boolean()])),
  durationSec: z.number().int().min(0).max(60 * 60 * 6).nullable().default(null),
});
