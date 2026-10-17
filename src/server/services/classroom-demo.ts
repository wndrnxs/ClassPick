import "server-only";

/**
 * 체험용 반·학생·응시 데이터 시드.
 * 실제 학생 없이도 교사 분석 화면과 학생 약점 분석 화면을 바로 확인할 수 있도록,
 * 문항 난이도와 학생별 실력에 따라 결정적으로(재현 가능하게) 답안을 시뮬레이션합니다.
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { grade, recommendedTimeLimitMin, type AnswerSheet, type AssessmentSnapshot, type Timings } from "@/lib/assessment";
import { hashPassword } from "@/server/auth/password";
import { getDb, schema } from "@/server/db/client";
import { createAssignment, createClass } from "./classroom";

const DEMO_NAMES = ["김민준", "이서연", "박도윤", "최하은", "정시우", "강지유", "조예준", "윤수아", "장하준", "임지아", "한은우", "오채원"];

/** 문자열 시드 기반 의사 난수 (mulberry32) */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIFFICULTY_SHIFT = { 상: -0.3, 중: -0.1, 하: 0.08 } as const;

/** 실력(ability 0~1)에 따라 답안을 만듭니다. 오답은 '매력적 오답' 하나에 몰리도록 합니다. */
function simulateAnswers(snapshot: AssessmentSnapshot, ability: number, seed: string): AnswerSheet {
  const rand = rng(seed);
  const answers: AnswerSheet = {};
  for (const q of snapshot.questions) {
    const p = Math.min(0.97, Math.max(0.08, ability + DIFFICULTY_SHIFT[q.difficulty]));
    const correct = rand() < p;
    if (q.kind === "ox") {
      answers[q.id] = correct ? q.answer : !q.answer;
    } else if (correct) {
      answers[q.id] = q.answer;
    } else {
      const attractive = (q.answer % q.options.length) + 1;
      const others = q.options.map((_, i) => i + 1).filter((n) => n !== q.answer);
      answers[q.id] = rand() < 0.55 ? attractive : others[Math.floor(rand() * others.length)];
    }
  }
  return answers;
}

const BASE_MCQ_SEC = { 상: 125, 중: 85, 하: 55 } as const;

/**
 * 문항별 풀이 시간 시뮬레이션 (초).
 * 각 지문의 첫 문항에는 지문 읽는 시간이 더해지고, 실력이 낮을수록 오래 걸립니다.
 * 틀린 문항은 '빨리 풀다 틀림'과 '오래 고민하고 틀림'이 섞이도록 합니다.
 */
function simulateTimings(snapshot: AssessmentSnapshot, answers: AnswerSheet, ability: number, seed: string): Timings {
  const rand = rng(`${seed}:time`);
  const noise = () => 0.7 + rand() * 0.6;
  const timings: Timings = {};
  const firstOfSection = new Set<number>();
  for (const q of snapshot.questions) {
    let t: number;
    if (q.kind === "mcq") t = BASE_MCQ_SEC[q.difficulty] * (1.3 - ability * 0.6) * noise();
    else t = 14 * (1.2 - ability * 0.4) * noise();
    if (answers[q.id] !== q.answer) t *= rand() < 0.5 ? 0.45 : 1.45;
    if (!firstOfSection.has(q.sectionIndex)) {
      firstOfSection.add(q.sectionIndex);
      const chars = snapshot.sections[q.sectionIndex]?.text.length ?? 0;
      t += (chars / (5 + ability * 6)) * noise();
    }
    timings[q.id] = Math.max(3, Math.round(t));
  }
  return timings;
}

async function createDemoStudent(name: string, school: string) {
  const id = randomUUID();
  await (await getDb())
    .insert(schema.users)
    .values({
      id,
      email: `demo-student-${id.slice(0, 8)}@guest.classpick.local`,
      name,
      passwordHash: await hashPassword(randomUUID()),
      role: "student",
      organization: school,
      isGuest: true,
      createdAt: new Date(),
    })
    .run();
  return id;
}

async function addMember(classId: string, studentId: string) {
  await (await getDb()).insert(schema.classMembers).values({ classId, studentId, joinedAt: new Date() }).onConflictDoNothing().run();
}

async function insertSubmission(assignmentId: string, studentId: string, ability: number, minutesAgo: number, overtime = false) {
  const db = await getDb();
  const a = await db.select().from(schema.assignments).where(eq(schema.assignments.id, assignmentId)).get();
  if (!a) return;
  const snapshot = a.snapshot as unknown as AssessmentSnapshot;
  const answers = simulateAnswers(snapshot, ability, `${assignmentId}:${studentId}`);
  const result = grade(snapshot, answers);
  const timings = simulateTimings(snapshot, answers, ability, `${assignmentId}:${studentId}`);
  const solving = Object.values(timings).reduce((a, b) => a + b, 0);
  // 마지막 문항 이후 검토 시간 20~90초. 시간 초과 사례는 제한 시간을 넘겨 제출한 것으로 만듭니다.
  const durationSec = overtime && a.timeLimitMin ? a.timeLimitMin * 60 + 95 : solving + 20 + Math.round(rng(`${studentId}:review`)() * 70);
  const submittedAt = new Date(Date.now() - minutesAgo * 60_000);
  await db
    .insert(schema.submissions)
    .values({
      id: randomUUID(),
      assignmentId,
      studentId,
      answers,
      correctCount: result.correctCount,
      total: result.total,
      score: result.score,
      durationSec,
      timings,
      submittedAt,
    })
    .run();
  await db
    .insert(schema.examStarts)
    .values({ assignmentId, studentId, startedAt: new Date(submittedAt.getTime() - durationSec * 1000) })
    .onConflictDoNothing()
    .run();
}

type DemoMessage = ["student" | "teacher", string];

/** 체험용 문항 질문 대화 */
async function seedInquiry(
  assignmentId: string,
  studentId: string,
  teacherId: string,
  questionId: string,
  messages: DemoMessage[],
  opts: { minutesAgo: number; isPublic?: boolean; unread?: boolean },
) {
  const db = await getDb();
  const id = randomUUID();
  const start = Date.now() - opts.minutesAgo * 60_000;
  const at = (i: number) => new Date(start + i * 37 * 60_000);
  const last = messages[messages.length - 1][0];
  await db
    .insert(schema.inquiries)
    .values({
      id,
      assignmentId,
      studentId,
      questionId,
      status: last === "teacher" ? "answered" : "open",
      isPublic: opts.isPublic ?? false,
      studentUnread: opts.unread ?? false,
      createdAt: at(0),
      updatedAt: at(messages.length - 1),
    })
    .run();
  await db
    .insert(schema.inquiryMessages)
    .values(
      messages.map(([role, body], i) => ({
        id: randomUUID(),
        inquiryId: id,
        authorId: role === "teacher" ? teacherId : studentId,
        authorRole: role,
        body,
        createdAt: at(i),
      })),
    )
    .run();
}

/** 체험용 시험 배포: 수능 페이스 기준 권장 제한 시간을 붙입니다. */
async function distributeDemo(teacherId: string, materialId: string, classId: string, title: string) {
  const { id } = await createAssignment(teacherId, { materialId, classId, title, revealAnswers: true });
  const db = await getDb();
  const a = await db.select().from(schema.assignments).where(eq(schema.assignments.id, id)).get();
  if (a) {
    await db
      .update(schema.assignments)
      .set({ timeLimitMin: recommendedTimeLimitMin(a.snapshot as unknown as AssessmentSnapshot) })
      .where(eq(schema.assignments.id, id))
      .run();
  }
  return id;
}

/** 체험 선생님: 학생 12명이 있는 반과, 응시가 끝난 시험 2개를 만듭니다. */
export async function seedTeacherClassroom(teacherId: string, materialIds: Record<string, string>) {
  const cls = await createClass(teacherId, "체험반 · 2학년 3반");
  const students: { id: string; ability: number }[] = [];
  for (const [i, name] of DEMO_NAMES.entries()) {
    const id = await createDemoStudent(name, "클래스픽고등학교");
    await addMember(cls.id, id);
    students.push({ id, ability: 0.35 + ((i * 37) % 60) / 100 });
  }
  const plans = [
    { slug: "azalea", title: "[형성평가] 김소월 「진달래꽃」", submitters: 10, ago: 60 * 24 * 3 },
    { slug: "lucky-day", title: "[형성평가] 현진건 「운수 좋은 날」", submitters: 9, ago: 60 * 5 },
  ];
  for (const plan of plans) {
    const materialId = materialIds[plan.slug];
    if (!materialId) continue;
    const id = await distributeDemo(teacherId, materialId, cls.id, plan.title);
    for (const [i, s] of students.slice(0, plan.submitters).entries()) {
      // 마지막 제출자 한 명은 제한 시간을 넘겨 제출한 사례
      await insertSubmission(id, s.id, s.ability, plan.ago - i * 7, i === plan.submitters - 1);
    }
    if (plan.slug === "azalea") await seedAzaleaInquiries(id, teacherId, students.map((s) => s.id));
  }
  return cls;
}

/** 체험 선생님의 「진달래꽃」 시험: 답변을 기다리는 질문 2개 + 반 전체에 공개한 답변 1개 */
async function seedAzaleaInquiries(assignmentId: string, teacherId: string, studentIds: string[]) {
  await seedInquiry(
    assignmentId,
    studentIds[2],
    teacherId,
    "s0-m2",
    [
      ["student", "3번에서 ③이 왜 적절하지 않은지 모르겠어요. '즈려밟고 가시옵소서'도 결국 슬픈 마음을 표현한 것 아닌가요?"],
      [
        "teacher",
        "좋은 질문이에요. 이 구절에 슬픔이 담겨 있는 건 맞아요. 그런데 ③은 '임에 대한 원망을 직접 드러낸다'고 했지요. 화자는 꽃을 뿌려 임이 가는 길을 축복하고, 자신을 밟고 가라고 할 만큼 헌신하는 태도를 보여요. 원망을 드러내는 게 아니라 슬픔을 안으로 삭이는 '정한'의 태도라서 ③이 적절하지 않은 거예요. 선지에 '직접 드러내어'처럼 정도를 나타내는 말이 있으면 꼭 지문과 맞춰 보세요.",
      ],
    ],
    { minutesAgo: 60 * 24 * 2, isPublic: true },
  );
  await seedInquiry(
    assignmentId,
    studentIds[1],
    teacherId,
    "s0-m1",
    [["student", "2번 ③번 선지에는 '역설적으로 강조한다'고 되어 있는데, 수업 시간에는 이 구절이 반어법이라고 배웠어요. 반어와 역설은 어떻게 다른 건가요? 정답이 ③인 게 맞나요?"]],
    { minutesAgo: 60 * 5 },
  );
  await seedInquiry(
    assignmentId,
    studentIds[0],
    teacherId,
    "s0-o2",
    [["student", "6번 OX에서 반어적 표현이라고 했는데, 화자가 정말로 울지 않겠다고 다짐하는 걸로 읽으면 안 되나요?"]],
    { minutesAgo: 60 * 2 },
  );
}

/**
 * 체험 학생: 체험용 선생님 계정의 반에 소속되고, 이미 푼 시험 2개(약점 분석용)와
 * 아직 풀지 않은 시험 1개를 받은 상태로 시작합니다.
 */
export async function seedStudentClassroom(studentId: string, teacherId: string, materialIds: Record<string, string>) {
  const cls = await createClass(teacherId, "클래스픽 체험반");
  await addMember(cls.id, studentId);
  const plans = [
    { slug: "language", title: "[단원평가] 언어의 본질", ability: 0.55, ago: 60 * 24 * 6 },
    { slug: "lucky-day", title: "[형성평가] 현진건 「운수 좋은 날」", ability: 0.62, ago: 60 * 24 * 2 },
    { slug: "azalea", title: "[형성평가] 김소월 「진달래꽃」", ability: null, ago: 0 },
  ];
  for (const plan of plans) {
    const materialId = materialIds[plan.slug];
    if (!materialId) continue;
    const id = await distributeDemo(teacherId, materialId, cls.id, plan.title);
    if (plan.ability !== null) await insertSubmission(id, studentId, plan.ability, plan.ago);
    if (plan.slug === "lucky-day") {
      // 선생님이 답변했지만 학생이 아직 확인하지 않은 질문 → '새 답변' 표시
      await seedInquiry(
        id,
        studentId,
        teacherId,
        "s0-m1",
        [
          ["student", "2번에서 ①번도 맞는 것 같아요. 김 첨지도 하루 종일 일해서 배가 고팠을 텐데 왜 틀린 건가요?"],
          [
            "teacher",
            "김 첨지가 배고팠을 수는 있지만, 지문에서 설렁탕을 사려는 이유는 분명히 나와 있어요. '컬컬한 목에 모주 한 잔도 적실 수 있거니와 그보다도 앓는 아내에게 설렁탕 한 그릇도 사다 줄 수 있음이다.' 자기 목을 축이는 것보다 '그보다도' 아픈 아내에게 설렁탕을 사다 주는 것을 더 중요하게 여기고 있죠. 그래서 설렁탕은 아내에 대한 애정을 드러내는 소재이고, 결말에서 아내가 이미 죽어 있을 때 비극을 더 크게 만들어요. 선지를 고를 때는 지문의 근거 문장을 꼭 찾아보세요!",
          ],
        ],
        { minutesAgo: plan.ago - 60, unread: true },
      );
    }
  }
  return cls;
}
