import type { ExamReport } from "@/lib/schemas";

export type ReportStats = {
  total: number;
  difficulty: { level: "상" | "중" | "하"; count: number; ratio: number }[];
  areas: { name: string; count: number; ratio: number }[];
  genres: { name: string; count: number; ratio: number }[];
};

function tally(values: string[]) {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/** 문항별 분석 결과에서 난이도·영역·갈래 분포를 결정적으로 계산합니다. */
export function computeReportStats(report: Pick<ExamReport, "questions">): ReportStats {
  const total = report.questions.length;
  const ratio = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const levels = ["상", "중", "하"] as const;
  return {
    total,
    difficulty: levels.map((level) => {
      const count = report.questions.filter((q) => q.difficulty === level).length;
      return { level, count, ratio: ratio(count) };
    }),
    areas: tally(report.questions.map((q) => q.area)).map(([name, count]) => ({ name, count, ratio: ratio(count) })),
    genres: tally(report.questions.map((q) => q.genre)).map(([name, count]) => ({ name, count, ratio: ratio(count) })),
  };
}
