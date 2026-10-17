import { textFingerprint } from "@/lib/hangul";
import { azaleaSample } from "./azalea";
import { languageSample } from "./language";
import { luckyDaySample } from "./lucky-day";
import type { SampleMaterial } from "./types";

export { sampleExamReport } from "./exam-report";
export type { SampleMaterial } from "./types";

export const SAMPLES: SampleMaterial[] = [azaleaSample, luckyDaySample, languageSample];

export function getSample(slug: string): SampleMaterial | undefined {
  return SAMPLES.find((s) => s.slug === slug);
}

const byFingerprint = new Map(SAMPLES.map((s) => [textFingerprint(s.passage), s]));

/** 입력 지문이 샘플 지문과 같은지 확인합니다(데모 모드에서 사전 제작 결과를 보여 주기 위함). */
export function matchSample(passage: string): SampleMaterial | undefined {
  return byFingerprint.get(textFingerprint(passage));
}
