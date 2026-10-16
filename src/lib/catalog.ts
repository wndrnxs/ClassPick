/**
 * 서비스 카탈로그: 자료 유형 메타데이터, 연필(포인트) 단가, 요금제.
 * 클라이언트·서버 공용 상수이며, 가격 정책은 이 파일 한 곳에서 관리합니다.
 */
import type { MaterialKind, MaterialType } from "@/lib/schemas";

export type MaterialTypeMeta = {
  id: MaterialType;
  label: string;
  shortLabel: string;
  description: string;
  cost: number;
};

export const MATERIAL_TYPE_META: Record<MaterialType, MaterialTypeMeta> = {
  structure: {
    id: "structure",
    label: "작품 도식화 · 핵심 정리",
    shortLabel: "작품 도식화",
    description: "갈래·성격·시점부터 시상/사건 흐름, 인물 관계, 출제 포인트까지 한 장으로",
    cost: 1,
  },
  annotation: {
    id: "annotation",
    label: "행간주 · 구절별 정밀 해설",
    shortLabel: "행간주 해설",
    description: "구절마다 의미·표현 기법·출제 포인트를 행간주 형태로 정리",
    cost: 1,
  },
  mcq: {
    id: "mcq",
    label: "5지선다 문항",
    shortLabel: "5지선다",
    description: "내신·수능형 5지선다 문항과 선지별 해설",
    cost: 2,
  },
  short_answer: {
    id: "short_answer",
    label: "서술형 · 약술형 문항",
    shortLabel: "서술형",
    description: "조건형 서술형 발문, 모범 답안, 채점 기준",
    cost: 1,
  },
  ox: {
    id: "ox",
    label: "OX 오개념 퀴즈",
    shortLabel: "OX 퀴즈",
    description: "내신 오개념을 바로잡는 OX 정리 문항",
    cost: 1,
  },
  vocab: {
    id: "vocab",
    label: "초성 어휘 퀴즈",
    shortLabel: "어휘 퀴즈",
    description: "지문 속 핵심 어휘를 초성 힌트로 익히는 어휘 게임",
    cost: 1,
  },
};

export const MATERIAL_TYPE_ORDER: MaterialType[] = ["structure", "annotation", "mcq", "short_answer", "ox", "vocab"];

export const KIND_LABELS: Record<MaterialKind, string> = {
  passage: "지문 자료",
  exam_report: "시험지 분석 보고서",
  exam_set: "모음 시험지",
  ocr: "OCR 변환 문서",
};

/** 기능별 연필 차감량 */
export const FEATURE_COSTS = {
  ocrPerFile: 1,
  examReport: 3,
  examCompose: 1,
} as const;

export const SIGNUP_BONUS_PENCILS = 30;

export function costOf(types: MaterialType[]) {
  return types.reduce((sum, t) => sum + MATERIAL_TYPE_META[t].cost, 0);
}

/** 연필 충전 상품 (1회 결제) */
export const PENCIL_PACKS = [
  { id: "pack-100", pencils: 100, price: 9900, label: "연필 100자루", note: "지문 약 14편 풀세트" },
  { id: "pack-300", pencils: 300, price: 24900, label: "연필 300자루", note: "16% 할인 · 가장 많이 선택", popular: true },
  { id: "pack-1000", pencils: 1000, price: 69000, label: "연필 1,000자루", note: "30% 할인 · 학원 단위 추천" },
] as const;
export type PencilPackId = (typeof PENCIL_PACKS)[number]["id"];

/** 정기 구독 요금제 (요금제 페이지 노출용) */
export const PLANS = [
  {
    id: "free",
    name: "무료 체험",
    price: 0,
    period: "",
    pencils: `가입 즉시 연필 ${SIGNUP_BONUS_PENCILS}자루`,
    description: "클래스픽이 처음이라면, 첫 수업 자료부터 직접 만들어 보세요.",
    features: ["6가지 자료 유형 모두 체험", "HWPX · DOCS · PDF 다운로드", "생성 샘플 자료 열람"],
    cta: "무료로 시작하기",
  },
  {
    id: "standard",
    name: "스탠다드",
    price: 19900,
    period: "월",
    pencils: "매월 연필 300자루",
    description: "매주 수업 자료를 만드는 현직 교사·강사에게 알맞은 요금제입니다.",
    features: ["모든 자료 유형 무제한 선택", "스캔 문서 스마트 OCR", "시험지 분석 보고서", "모음 시험지 제본"],
    cta: "스탠다드 시작하기",
    highlight: true,
  },
  {
    id: "academy",
    name: "프로 · 학원",
    price: 49000,
    period: "월",
    pencils: "매월 연필 1,000자루",
    description: "여러 반·여러 강사가 함께 쓰는 학원과 교과 협의회를 위한 요금제입니다.",
    features: ["스탠다드의 모든 기능", "학원 고유 양식 HWPX 템플릿", "팀 자료함 공유 (준비 중)", "우선 고객 지원"],
    cta: "도입 문의하기",
  },
] as const;
