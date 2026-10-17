/**
 * 학생 평가(배포 시험) 도메인 로직 — 순수 함수 (클라이언트·서버 공용, DB 의존성 없음)
 *
 * 1) 스냅샷: 배포 시점의 지문·문항을 고정해 저장합니다. 원본 자료가 바뀌거나 삭제되어도 결과가 유지됩니다.
 * 2) 채점: 자동 채점이 가능한 5지선다·OX 문항만 출제합니다. (서술형은 교사 채점이 필요해 제외)
 * 3) 분석: 교사용(문항별 정답률·선지 분포·점수 분포) / 학생용(유형·난이도·갈래별 정답률, 성적 추이, 오답 노트)
 * 4) 시간: 시험 전체 응시 시간(서버 기록)과 문항별 풀이 시간(직전 응답 → 이 문항 응답까지)을 함께 분석합니다.
 */
import type { MaterialDTO } from "@/lib/material-dto";
import type { McqQuestion, Ox } from "@/lib/schemas";

export type Difficulty = "상" | "중" | "하";

type QuestionBase = {
  id: string;
  number: number;
  sectionIndex: number;
  stem: string;
  explanation: string;
  /** 약점 분석 단위: 5지선다는 출제 유형, OX는 관련 개념 */
  category: string;
  difficulty: Difficulty;
};

export type McqItem = QuestionBase & {
  kind: "mcq";
  bogi: string | null;
  options: string[];
  answer: number;
  optionNotes: string[];
};

export type OxItem = QuestionBase & { kind: "ox"; answer: boolean };

export type AssessmentQuestion = McqItem | OxItem;

export type AssessmentSection = { title: string; author: string; text: string; genre: string };

export type AssessmentSnapshot = { sections: AssessmentSection[]; questions: AssessmentQuestion[] };

/** 학생에게 응시 전 보내는 형태 — 정답·해설 제거 */
export type PublicQuestion =
  | Omit<McqItem, "answer" | "explanation" | "optionNotes">
  | Omit<OxItem, "answer" | "explanation">;
export type PublicSnapshot = { sections: AssessmentSection[]; questions: PublicQuestion[] };

export type AnswerValue = number | boolean;
export type AnswerSheet = Record<string, AnswerValue>;

/* ------------------------------------------------------------------ */
/* 스냅샷                                                               */
/* ------------------------------------------------------------------ */

type SectionSource = {
  title: string;
  author: string;
  text: string;
  genre: string;
  mcq: McqQuestion[];
  ox: Ox["items"];
};

function snapshotFromSections(sources: SectionSource[]): AssessmentSnapshot {
  const questions: AssessmentQuestion[] = [];
  let number = 1;
  sources.forEach((src, sectionIndex) => {
    src.mcq.forEach((q, i) => {
      questions.push({
        id: `s${sectionIndex}-m${i}`,
        kind: "mcq",
        number: number++,
        sectionIndex,
        stem: q.stem,
        bogi: q.bogi,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        optionNotes: q.option_notes,
        category: q.type || "내용 이해",
        difficulty: q.difficulty,
      });
    });
    src.ox.forEach((x, i) => {
      questions.push({
        id: `s${sectionIndex}-o${i}`,
        kind: "ox",
        number: number++,
        sectionIndex,
        stem: x.statement,
        answer: x.answer,
        explanation: x.explanation,
        category: x.concept || "개념 확인",
        difficulty: "하",
      });
    });
  });
  return {
    sections: sources.map(({ title, author, text, genre }) => ({ title, author, text, genre })),
    questions,
  };
}

/** 배포 가능한 자료인지 (자동 채점 문항이 1개 이상) */
export function countGradable(material: MaterialDTO): number {
  if (material.kind === "passage") {
    return (material.content.mcq?.questions.length ?? 0) + (material.content.ox?.items.length ?? 0);
  }
  if (material.kind === "exam_set") {
    return material.content.exam.sections.reduce((n, s) => n + s.mcq.length + s.ox.length, 0);
  }
  return 0;
}

/**
 * 자료 → 시험 스냅샷.
 * @param genreOf 모음 시험지의 각 지문 원본 자료 ID로 갈래를 찾는 함수 (없으면 '기타')
 */
export function buildSnapshot(material: MaterialDTO, genreOf: (materialId: string) => string | undefined = () => undefined) {
  if (material.kind === "passage") {
    const c = material.content;
    return snapshotFromSections([
      {
        title: material.title,
        author: material.author,
        text: material.sourceText,
        genre: c.structure?.genre?.split(/[·,(]/)[0].trim() || material.settings.genre || "기타",
        mcq: c.mcq?.questions ?? [],
        ox: c.ox?.items ?? [],
      },
    ]);
  }
  if (material.kind === "exam_set") {
    return snapshotFromSections(
      material.content.exam.sections.map((s) => ({
        title: s.passage.title,
        author: s.passage.author,
        text: s.passage.text,
        genre: genreOf(s.materialId) ?? "기타",
        mcq: s.mcq,
        ox: s.ox,
      })),
    );
  }
  throw new Error("지문 자료 또는 모음 시험지만 배포할 수 있습니다.");
}

export function toPublicSnapshot(snapshot: AssessmentSnapshot): PublicSnapshot {
  return {
    sections: snapshot.sections,
    questions: snapshot.questions.map((q): PublicQuestion => {
      const base = { id: q.id, number: q.number, sectionIndex: q.sectionIndex, stem: q.stem, category: q.category, difficulty: q.difficulty };
      return q.kind === "mcq" ? { ...base, kind: "mcq", bogi: q.bogi, options: q.options } : { ...base, kind: "ox" };
    }),
  };
}

/* ------------------------------------------------------------------ */
/* 채점                                                                 */
/* ------------------------------------------------------------------ */

export type GradedItem = { id: string; answer: AnswerValue | null; correct: boolean };
export type GradeResult = { items: GradedItem[]; correctCount: number; total: number; score: number };

/** 응답 형식을 문항 유형에 맞게 정리합니다(잘못된 값은 무응답 처리). */
export function sanitizeAnswers(snapshot: AssessmentSnapshot, raw: Record<string, unknown>): AnswerSheet {
  const out: AnswerSheet = {};
  for (const q of snapshot.questions) {
    const v = raw[q.id];
    if (q.kind === "mcq" && typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= q.options.length) out[q.id] = v;
    if (q.kind === "ox" && typeof v === "boolean") out[q.id] = v;
  }
  return out;
}

export function grade(snapshot: AssessmentSnapshot, answers: AnswerSheet): GradeResult {
  const items = snapshot.questions.map((q) => {
    const answer = answers[q.id] ?? null;
    return { id: q.id, answer, correct: answer !== null && answer === q.answer };
  });
  const correctCount = items.filter((i) => i.correct).length;
  const total = items.length;
  return { items, correctCount, total, score: total ? Math.round((correctCount / total) * 100) : 0 };
}

/* ------------------------------------------------------------------ */
/* 시간                                                                 */
/* ------------------------------------------------------------------ */

/** 수능 국어 기준 페이스: 80분 · 45문항 → 문항당 약 107초 */
export const SUNEUNG_PACE_SEC = Math.round((80 * 60) / 45);
const OX_PACE_SEC = 20;
const MAX_SEC = 60 * 60 * 6;
/** 네트워크 지연 등을 감안한 제한 시간 유예 */
export const OVERTIME_GRACE_SEC = 30;

export type Timings = Record<string, number>;

/** 수능 페이스로 계산한 권장 제한 시간(분, 5분 단위 올림) */
export function recommendedTimeLimitMin(snapshot: AssessmentSnapshot) {
  const sec = snapshot.questions.reduce((n, q) => n + (q.kind === "mcq" ? SUNEUNG_PACE_SEC : OX_PACE_SEC), 0);
  return Math.max(5, Math.ceil(sec / 60 / 5) * 5);
}

export function isOvertime(durationSec: number | null, timeLimitMin: number | null) {
  return timeLimitMin != null && durationSec != null && durationSec > timeLimitMin * 60 + OVERTIME_GRACE_SEC;
}

/** 클라이언트가 보낸 문항별 풀이 시간을 정리합니다(알 수 없는 문항·잘못된 값 제거). */
export function sanitizeTimings(snapshot: AssessmentSnapshot, raw: Record<string, unknown>): Timings {
  const out: Timings = {};
  for (const q of snapshot.questions) {
    const v = raw[q.id];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[q.id] = Math.min(MAX_SEC, Math.round(v));
  }
  return out;
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const v = [...xs].sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

/* ------------------------------------------------------------------ */
/* 교사용 분석                                                           */
/* ------------------------------------------------------------------ */

export type SubmissionLike = {
  studentId: string;
  studentName: string;
  answers: AnswerSheet;
  score: number;
  correctCount: number;
  total: number;
  durationSec: number | null;
  timings: Timings;
  submittedAt: string;
};

export type QuestionStat = {
  question: AssessmentQuestion;
  correctRate: number;
  attempts: number;
  /** 5지선다: 선지 1~5 선택 수 / OX: [O, X] */
  choiceCounts: number[];
  blank: number;
  /** 평균 풀이 시간(초) — 전체 / 정답자 / 오답자. 기록이 없으면 null */
  avgTimeSec: number | null;
  avgTimeCorrectSec: number | null;
  avgTimeWrongSec: number | null;
};

export type Rate = { label: string; correct: number; total: number; rate: number };

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

/* ------------------------------------------------------------------ */
/* 독해 영역                                                             */
/* ------------------------------------------------------------------ */

/**
 * 세부 유형(5지선다 유형명 · OX 관련 개념)은 문항마다 제각각이라 한두 문항씩밖에 모이지 않습니다.
 * 약점 진단은 6개 독해 영역으로 묶어서 해야 표본이 충분해집니다.
 */
export const SKILLS = ["표현·서술 방식", "시어·구절의 의미", "작품 구성 요소", "내용 이해·세부 정보", "핵심 개념·관점", "<보기> 적용·감상"] as const;
export type Skill = (typeof SKILLS)[number];

// 위에서부터 먼저 맞는 규칙을 씁니다. ('구절의 맥락적 의미'는 구절, '사회·역사적 맥락'은 외적 감상)
const SKILL_RULES: [RegExp, Skill][] = [
  [/보기|외적|준거/, "<보기> 적용·감상"],
  [/시어|구절|소재|상징|함축|의미/, "시어·구절의 의미"],
  [/맥락|추론|비교|탐구|적용|감상/, "<보기> 적용·감상"],
  [/표현|서술|운율|율격|수미|반어|역설|어조|문체|심상|이미지|대구|반복/, "표현·서술 방식"],
  [/시점|인물|배경|갈등|구성|화자|상황|태도|정서|심리|사건|성격/, "작품 구성 요소"],
  [/세부|정보|내용|일치|사실/, "내용 이해·세부 정보"],
  [/개념|관점|논지|주장|화제|전제|견해/, "핵심 개념·관점"],
];

export function skillOf(q: Pick<AssessmentQuestion, "category" | "kind">): Skill {
  for (const [re, skill] of SKILL_RULES) if (re.test(q.category)) return skill;
  return q.kind === "ox" ? "핵심 개념·관점" : "내용 이해·세부 정보";
}

/** 학생 약점 분석 화면의 영역별 학습 가이드 */
export const SKILL_TIPS: Record<Skill, string> = {
  "표현·서술 방식": "반어·역설·대구·설의 같은 표현 기법의 개념을 정리하고, 선지가 말하는 표현이 지문의 어느 구절에 있는지 직접 찾아 표시해 보세요.",
  "시어·구절의 의미": "시어·구절 문제는 사전적 뜻이 아니라 맥락 속 기능을 묻습니다. 밑줄 친 부분의 앞뒤 2~3줄을 함께 읽고 화자의 정서와 연결해 보세요.",
  "작품 구성 요소": "시점·화자·인물·배경을 먼저 짧게 정리한 뒤 문제를 풀어 보세요. 특히 '누가 말하고, 누구의 눈으로 보는가'를 구분하는 연습이 도움이 됩니다.",
  "내용 이해·세부 정보": "선지의 핵심어를 지문에서 찾아 근거 문장에 밑줄을 긋는 습관을 들이세요. '항상·모두·오직'처럼 범위가 바뀐 선지가 대표적인 함정입니다.",
  "핵심 개념·관점": "핵심 개념을 한 문장으로 정의해 보고, 비슷한 개념끼리 차이를 비교해 정리하세요. OX 오답은 개념을 사례에 잘못 연결한 경우가 많아요.",
  "<보기> 적용·감상": "<보기>를 먼저 읽고 판단 기준을 한 줄로 요약한 뒤, 선지를 '지문 내용'과 '<보기> 기준' 두 부분으로 나누어 각각 맞는지 확인하세요.",
};

function rateBy(entries: { key: string; correct: boolean }[], order?: string[]): Rate[] {
  const map = new Map<string, { c: number; t: number }>();
  for (const e of entries) {
    const v = map.get(e.key) ?? { c: 0, t: 0 };
    v.t += 1;
    if (e.correct) v.c += 1;
    map.set(e.key, v);
  }
  const rows = [...map.entries()].map(([label, v]) => ({ label, correct: v.c, total: v.t, rate: pct(v.c, v.t) }));
  if (order) return order.filter((k) => map.has(k)).map((k) => rows.find((r) => r.label === k)!);
  return rows.sort((a, b) => a.rate - b.rate || b.total - a.total);
}

export function analyzeAssignment(snapshot: AssessmentSnapshot, subs: SubmissionLike[], rosterSize: number) {
  const scores = subs.map((s) => s.score).sort((a, b) => a - b);
  const n = scores.length;
  const avg = n ? scores.reduce((a, b) => a + b, 0) / n : 0;
  const sd = n ? Math.sqrt(scores.reduce((a, s) => a + (s - avg) ** 2, 0) / n) : 0;

  const buckets = [
    { label: "0~39", min: 0, max: 39 },
    { label: "40~59", min: 40, max: 59 },
    { label: "60~69", min: 60, max: 69 },
    { label: "70~79", min: 70, max: 79 },
    { label: "80~89", min: 80, max: 89 },
    { label: "90~100", min: 90, max: 100 },
  ].map((b) => ({ label: b.label, count: scores.filter((s) => s >= b.min && s <= b.max).length }));

  const questionStats: QuestionStat[] = snapshot.questions.map((q) => {
    const choiceCounts = q.kind === "mcq" ? q.options.map(() => 0) : [0, 0];
    let correct = 0;
    let blank = 0;
    const times: { t: number; ok: boolean }[] = [];
    for (const s of subs) {
      const a = s.answers[q.id];
      const t = s.timings[q.id];
      if (t !== undefined) times.push({ t, ok: a === q.answer });
      if (a === undefined || a === null) {
        blank += 1;
        continue;
      }
      if (q.kind === "mcq" && typeof a === "number") choiceCounts[a - 1] += 1;
      if (q.kind === "ox" && typeof a === "boolean") choiceCounts[a ? 0 : 1] += 1;
      if (a === q.answer) correct += 1;
    }
    return {
      question: q,
      correctRate: pct(correct, subs.length),
      attempts: subs.length,
      choiceCounts,
      blank,
      avgTimeSec: mean(times.map((x) => x.t)),
      avgTimeCorrectSec: mean(times.filter((x) => x.ok).map((x) => x.t)),
      avgTimeWrongSec: mean(times.filter((x) => !x.ok).map((x) => x.t)),
    };
  });
  const durations = subs.map((s) => s.durationSec).filter((d): d is number => d != null);

  const entries = subs.flatMap((s) => snapshot.questions.map((q) => ({ q, correct: s.answers[q.id] === q.answer })));

  return {
    rosterSize,
    submitted: n,
    mean: Math.round(avg * 10) / 10,
    median: median(scores) ?? 0,
    sd: Math.round(sd * 10) / 10,
    max: n ? scores[n - 1] : 0,
    min: n ? scores[0] : 0,
    buckets,
    questionStats,
    hardest: [...questionStats].filter((q) => q.attempts > 0).sort((a, b) => a.correctRate - b.correctRate).slice(0, 3),
    bySkill: rateBy(entries.map((e) => ({ key: skillOf(e.q), correct: e.correct }))),
    byCategory: rateBy(entries.map((e) => ({ key: e.q.category, correct: e.correct }))),
    byDifficulty: rateBy(
      entries.map((e) => ({ key: e.q.difficulty, correct: e.correct })),
      ["상", "중", "하"],
    ),
    timing: {
      avgDurationSec: mean(durations),
      medianDurationSec: median(durations),
      /** 지문(세트)별 평균 소요 시간 = 그 지문 문항들의 평균 풀이 시간 합 */
      bySection: snapshot.sections.map((sec, i) => {
        const stats = questionStats.filter((qs) => qs.question.sectionIndex === i && qs.avgTimeSec != null);
        return { title: sec.title, questionCount: stats.length, avgSec: stats.length ? stats.reduce((t, qs) => t + qs.avgTimeSec!, 0) : null };
      }),
      slowest: [...questionStats]
        .filter((qs) => qs.avgTimeSec != null)
        .sort((a, b) => b.avgTimeSec! - a.avgTimeSec!)
        .slice(0, 3),
    },
  };
}

/* ------------------------------------------------------------------ */
/* 학생용 약점 분석                                                       */
/* ------------------------------------------------------------------ */

export type StudentAttempt = {
  assignmentId: string;
  title: string;
  submittedAt: string;
  score: number;
  answers: AnswerSheet;
  timings: Timings;
  durationSec: number | null;
  snapshot: AssessmentSnapshot;
  revealAnswers: boolean;
};

/** 내 평소 풀이 속도(같은 문항 형식의 중앙값) 대비: 1.5배 이상 오래 / 절반 미만으로 빨리 */
export type Pace = "slow" | "fast" | null;

export type WrongNote = {
  assignmentId: string;
  assignmentTitle: string;
  question: AssessmentQuestion;
  sectionTitle: string;
  myAnswer: AnswerValue | null;
  revealAnswers: boolean;
  timeSec: number | null;
  pace: Pace;
};

export function analyzeStudent(attempts: StudentAttempt[]) {
  const sorted = [...attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const entries = sorted.flatMap((a) =>
    a.snapshot.questions.map((q) => ({
      a,
      q,
      skill: skillOf(q),
      genre: a.snapshot.sections[q.sectionIndex]?.genre ?? "기타",
      correct: a.answers[q.id] === q.answer,
      time: a.timings[q.id] ?? null,
    })),
  );
  const bySkill = rateBy(entries.map((e) => ({ key: e.skill, correct: e.correct })));
  const total = entries.length;
  const correct = entries.filter((e) => e.correct).length;

  // 풀이 속도: 5지선다와 OX는 걸리는 시간이 크게 달라 형식별 중앙값을 기준으로 삼습니다.
  const timed = entries.filter((e): e is typeof e & { time: number } => e.time !== null);
  const typical = {
    mcq: median(timed.filter((e) => e.q.kind === "mcq").map((e) => e.time)),
    ox: median(timed.filter((e) => e.q.kind === "ox").map((e) => e.time)),
  };
  const paceOf = (kind: AssessmentQuestion["kind"], time: number | null): Pace => {
    const base = typical[kind];
    if (time === null || !base) return null;
    if (time >= base * 1.5) return "slow";
    if (time < base * 0.5) return "fast";
    return null;
  };
  const wrongEntries = entries.filter((e) => !e.correct);
  const avgMcqSec = mean(timed.filter((e) => e.q.kind === "mcq").map((e) => e.time));

  // 최근 시험부터, 시험 안에서는 문항 번호 순서대로
  const wrongNotes: WrongNote[] = [...sorted].reverse().flatMap((a) =>
    wrongEntries
      .filter((e) => e.a === a)
      .map((e) => ({
        assignmentId: a.assignmentId,
        assignmentTitle: a.title,
        question: e.q,
        sectionTitle: a.snapshot.sections[e.q.sectionIndex]?.title ?? "",
        myAnswer: a.answers[e.q.id] ?? null,
        revealAnswers: a.revealAnswers,
        timeSec: e.time,
        pace: paceOf(e.q.kind, e.time),
      })),
  );

  return {
    attempts: sorted.length,
    overallRate: pct(correct, total),
    averageScore: sorted.length ? Math.round((sorted.reduce((s, a) => s + a.score, 0) / sorted.length) * 10) / 10 : 0,
    trend: sorted.map((a) => ({ title: a.title, submittedAt: a.submittedAt, score: a.score, durationSec: a.durationSec })),
    bySkill,
    byCategory: rateBy(entries.map((e) => ({ key: e.q.category, correct: e.correct }))),
    byDifficulty: rateBy(
      entries.map((e) => ({ key: e.q.difficulty, correct: e.correct })),
      ["상", "중", "하"],
    ),
    byGenre: rateBy(entries.map((e) => ({ key: e.genre, correct: e.correct }))),
    /** 정답률 70% 미만 영역(2문항 이상) — 그 영역에서 틀린 세부 유형을 함께 알려 줍니다. */
    weaknesses: bySkill
      .filter((r) => r.rate < 70 && r.total >= 2)
      .slice(0, 3)
      .map((r) => ({
        ...r,
        skill: r.label as Skill,
        missed: [...new Set(entries.filter((e) => e.skill === r.label && !e.correct).map((e) => e.q.category))],
      })),
    strengths: [...bySkill].filter((r) => r.rate >= 80 && r.total >= 2).sort((a, b) => b.rate - a.rate).slice(0, 3),
    timing: {
      timedCount: timed.length,
      avgMcqSec,
      avgOxSec: mean(timed.filter((e) => e.q.kind === "ox").map((e) => e.time)),
      /** 5지선다 평균이 수능 페이스보다 몇 초 느린지(+) / 빠른지(-) */
      paceDiffSec: avgMcqSec === null ? null : avgMcqSec - SUNEUNG_PACE_SEC,
      /** 영역별 5지선다 평균 풀이 시간 (OX는 시간이 짧아 섞으면 왜곡되므로 제외) */
      bySkill: SKILLS.map((skill) => {
        const xs = timed.filter((e) => e.skill === skill && e.q.kind === "mcq");
        return { label: skill, avgSec: mean(xs.map((e) => e.time)), count: xs.length, rate: pct(xs.filter((e) => e.correct).length, xs.length) };
      })
        .filter((r) => r.count > 0)
        .sort((a, b) => b.avgSec! - a.avgSec!),
      /** 오래 고민하고도 틀림 → 개념·독해 보완 / 빨리 풀다 틀림 → 실수(선지 끝까지 읽기) */
      slowWrong: wrongEntries.filter((e) => paceOf(e.q.kind, e.time) === "slow").length,
      fastWrong: wrongEntries.filter((e) => paceOf(e.q.kind, e.time) === "fast").length,
    },
    wrongNotes,
  };
}
