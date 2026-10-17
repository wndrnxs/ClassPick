import { describe, expect, it } from "vitest";

import { analyzeAssignment, analyzeStudent, buildSnapshot, grade, sanitizeAnswers, skillOf, toPublicSnapshot } from "@/lib/assessment";
import { SAMPLES } from "@/lib/samples";
import { sampleToMaterial } from "@/lib/samples/to-material";

const azalea = sampleToMaterial(SAMPLES[0]);
const snapshot = buildSnapshot(azalea);

describe("assessment snapshot", () => {
  it("includes only auto-gradable MCQ and OX questions, numbered in order", () => {
    expect(snapshot.questions).toHaveLength(3 + 6);
    expect(snapshot.questions.map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(snapshot.sections[0].genre).toBe("현대시");
  });

  it("strips answers and explanations from the public version", () => {
    const pub = JSON.stringify(toPublicSnapshot(snapshot));
    expect(pub).not.toContain('"answer"');
    expect(pub).not.toContain('"explanation"');
    expect(pub).not.toContain("optionNotes");
  });
});

describe("grading", () => {
  it("scores a perfect sheet as 100 and ignores invalid values", () => {
    const perfect = Object.fromEntries(snapshot.questions.map((q) => [q.id, q.answer]));
    expect(grade(snapshot, perfect).score).toBe(100);
    const dirty = sanitizeAnswers(snapshot, { ...perfect, [snapshot.questions[0].id]: 9, unknown: 1, [snapshot.questions[3].id]: "O" });
    const r = grade(snapshot, dirty);
    expect(r.correctCount).toBe(7);
    expect(r.items[0].answer).toBeNull();
  });
});

describe("analytics", () => {
  const sheet = (correctIds: string[]) =>
    Object.fromEntries(
      snapshot.questions.map((q) => [q.id, correctIds.includes(q.id) ? q.answer : q.kind === "mcq" ? (q.answer % 5) + 1 : !q.answer]),
    );
  const ids = snapshot.questions.map((q) => q.id);
  const subs = [ids, ids.slice(0, 6), ids.slice(3)].map((c, i) => {
    const answers = sheet(c);
    const g = grade(snapshot, answers);
    return { studentId: `s${i}`, studentName: `학생${i}`, answers, score: g.score, correctCount: g.correctCount, total: g.total, durationSec: 300, submittedAt: `2026-10-0${i + 1}T00:00:00Z` };
  });

  it("computes class statistics, option distribution and hardest questions", () => {
    const a = analyzeAssignment(snapshot, subs, 4);
    expect(a.submitted).toBe(3);
    expect(a.rosterSize).toBe(4);
    expect(a.max).toBe(100);
    expect(a.buckets.reduce((n, b) => n + b.count, 0)).toBe(3);
    const q1 = a.questionStats[0];
    expect(q1.choiceCounts.reduce((x, y) => x + y, 0)).toBe(3);
    expect(q1.correctRate).toBeCloseTo(66.7, 1);
    expect(a.hardest).toHaveLength(3);
  });

  it("finds a student's weakest categories across attempts", () => {
    const answers = sheet(ids.filter((id) => id.includes("-o"))); // OX만 맞히고 5지선다는 모두 틀림
    const report = analyzeStudent([
      { assignmentId: "a1", title: "1차", submittedAt: "2026-10-01T00:00:00Z", score: 67, answers, snapshot, revealAnswers: true },
      { assignmentId: "a2", title: "2차", submittedAt: "2026-10-02T00:00:00Z", score: 67, answers, snapshot, revealAnswers: false },
    ]);
    expect(report.attempts).toBe(2);
    expect(report.trend.map((t) => t.title)).toEqual(["1차", "2차"]);
    expect(report.weaknesses.map((w) => w.label)).toContain("<보기> 적용·감상");
    expect(report.weaknesses.find((w) => w.label === "<보기> 적용·감상")?.missed).toEqual(["외적 준거 감상"]);
    expect(report.wrongNotes).toHaveLength(6);
    expect(report.byDifficulty.find((d) => d.label === "상")?.rate).toBe(0);
  });
});

describe("skill areas", () => {
  it("groups fine-grained categories into reading skills", () => {
    const of = (category: string, kind: "mcq" | "ox" = "mcq") => skillOf({ category, kind });
    expect(of("표현상 특징")).toBe("표현·서술 방식");
    expect(of("구절의 맥락적 의미")).toBe("시어·구절의 의미");
    expect(of("사회·역사적 맥락", "ox")).toBe("<보기> 적용·감상");
    expect(of("<보기> 적용")).toBe("<보기> 적용·감상");
    expect(of("화자의 태도", "ox")).toBe("작품 구성 요소");
    expect(of("세부 정보 확인")).toBe("내용 이해·세부 정보");
    expect(of("자의성", "ox")).toBe("핵심 개념·관점");
  });
});
