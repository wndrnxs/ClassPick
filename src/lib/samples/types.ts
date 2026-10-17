import type { DIFFICULTIES, PassageContent, SCHOOL_LEVELS } from "@/lib/schemas";

export type SampleMaterial = {
  slug: string;
  title: string;
  author: string;
  sourceNote: string;
  category: string;
  description: string;
  passage: string;
  settings: { schoolLevel: keyof typeof SCHOOL_LEVELS; grade: string; difficulty: keyof typeof DIFFICULTIES };
  content: PassageContent;
};
