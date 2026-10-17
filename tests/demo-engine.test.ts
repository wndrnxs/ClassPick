import { describe, expect, it } from "vitest";

import {
  AnnotationSchema,
  ExamReportSchema,
  GenerationSettingsSchema,
  McqSchema,
  OxSchema,
  ShortAnswerSchema,
  StructureSchema,
  VocabSchema,
} from "@/lib/schemas";
import { SAMPLES } from "@/lib/samples";
import { SAMPLE_EXAM_TEXT } from "@/lib/samples/exam-text";
import { demoEngine } from "@/server/ai/demo-engine";
import type { PassageContext } from "@/server/ai/types";

const POEM = "산에는 꽃 피네\n꽃이 피네\n갈 봄 여름 없이\n꽃이 피네\n\n산에\n산에\n피는 꽃은\n저만치 혼자서 피어 있네\n\n산에는 꽃 지네\n꽃이 지네";

const ctx = (passage: string): PassageContext => ({
  passage,
  title: "산유화",
  author: "김소월",
  sourceNote: "",
  settings: GenerationSettingsSchema.parse({}),
});

describe("demo engine", () => {
  it("returns curated content for sample passages", async () => {
    const azalea = SAMPLES[0];
    const out = await demoEngine.generateSection("structure", ctx(azalea.passage));
    expect(out).toEqual(azalea.content.structure);
  });

  it("produces schema-valid sections for arbitrary passages", async () => {
    const c = ctx(POEM);
    StructureSchema.parse(await demoEngine.generateSection("structure", c));
    AnnotationSchema.parse(await demoEngine.generateSection("annotation", c));
    ShortAnswerSchema.parse(await demoEngine.generateSection("short_answer", c));
    OxSchema.parse(await demoEngine.generateSection("ox", c));
    VocabSchema.parse(await demoEngine.generateSection("vocab", c));
    const mcq = McqSchema.parse(await demoEngine.generateSection("mcq", c));
    expect(mcq.questions).toHaveLength(3);
    for (const q of mcq.questions) {
      expect(q.options).toHaveLength(5);
      expect(q.answer).toBeGreaterThanOrEqual(1);
      expect(q.answer).toBeLessThanOrEqual(5);
      expect(new Set(q.options).size).toBe(5);
    }
  });

  it("puts the false statement at the answer position for '적절하지 않은' questions", async () => {
    const mcq = await demoEngine.generateSection("mcq", ctx(POEM));
    const q = mcq.questions[0];
    expect(q.stem).toContain("적절하지 않은");
    expect(q.options[q.answer - 1]).toContain("5개의 연"); // 실제 3연 → 오답 진술
  });

  it("analyzes a numbered exam paper", async () => {
    const report = ExamReportSchema.parse(
      await demoEngine.analyzeExam({ examTitle: "예시", school: "", grade: "", examText: SAMPLE_EXAM_TEXT }),
    );
    expect(report.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(report.questions.find((q) => q.number === 7)?.area).toBe("문법");
  });

  it("rejects exam text without question numbers", async () => {
    await expect(demoEngine.analyzeExam({ examTitle: "", school: "", grade: "", examText: "문항 번호가 없는 글입니다. ".repeat(10) })).rejects.toThrow(
      /문항 번호/,
    );
  });
});
