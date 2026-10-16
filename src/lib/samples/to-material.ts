import type { PassageMaterialDTO } from "@/lib/material-dto";
import type { MaterialType } from "@/lib/schemas";
import type { SampleMaterial } from "./types";

/** 샘플을 자료(Material) 형태로 변환 — 같은 렌더러·내보내기 파이프라인을 재사용합니다. */
export function sampleToMaterial(sample: SampleMaterial): PassageMaterialDTO {
  return {
    id: `sample-${sample.slug}`,
    kind: "passage",
    title: sample.title,
    author: sample.author,
    sourceNote: sample.sourceNote,
    sourceText: sample.passage,
    settings: { ...sample.settings, genre: "auto" },
    types: Object.keys(sample.content) as MaterialType[],
    content: sample.content,
    engine: "demo",
    pointsSpent: 0,
    createdAt: new Date(0).toISOString(),
  };
}
