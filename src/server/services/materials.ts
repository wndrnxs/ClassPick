import "server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, like } from "drizzle-orm";

import { costOf, FEATURE_COSTS, MATERIAL_TYPE_META } from "@/lib/catalog";
import type { MaterialDTO, MaterialSummaryDTO } from "@/lib/material-dto";
import { SAMPLES } from "@/lib/samples";
import type {
  AnalyzeExamInput,
  ComposeExamInput,
  CreateMaterialInput,
  ExamSet,
  MaterialKind,
  MaterialType,
  OcrResult,
  PassageContent,
} from "@/lib/schemas";
import { analyzeExamPaper, generatePassageContent, ocrWithAi } from "@/server/ai/pipeline";
import { getDb, schema } from "@/server/db/client";
import type { Material } from "@/server/db/schema";
import { HttpError } from "@/server/http";
import { extractTextLocally, type UploadedFile } from "@/server/ingest/extract";
import { engineForUserId } from "@/server/ai/access";
import { withUsageLog } from "./ai-usage";
import { creditPoints, debitPoints } from "./points";

/* ------------------------------------------------------------------ */
/* 변환                                                                 */
/* ------------------------------------------------------------------ */

function toDTO(row: Material): MaterialDTO {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    author: row.author,
    sourceNote: row.sourceNote,
    sourceText: row.sourceText,
    settings: row.settings,
    types: row.types as MaterialType[],
    content: row.content,
    engine: row.engine,
    pointsSpent: row.pointsSpent,
    createdAt: row.createdAt.toISOString(),
  } as MaterialDTO;
}

function questionCounts(row: Material): MaterialSummaryDTO["questionCounts"] {
  if (row.kind !== "passage") return { mcq: 0, short_answer: 0, ox: 0 };
  const c = row.content as PassageContent;
  return {
    mcq: c.mcq?.questions.length ?? 0,
    short_answer: c.short_answer?.questions.length ?? 0,
    ox: c.ox?.items.length ?? 0,
  };
}

function toSummary(row: Material): MaterialSummaryDTO {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    author: row.author,
    types: row.types as MaterialType[],
    engine: row.engine,
    pointsSpent: row.pointsSpent,
    createdAt: row.createdAt.toISOString(),
    questionCounts: questionCounts(row),
  };
}

/* ------------------------------------------------------------------ */
/* 조회 · 삭제                                                          */
/* ------------------------------------------------------------------ */

export async function listMaterials(userId: string, opts: { kind?: MaterialKind; q?: string; limit?: number } = {}) {
  const conditions = [eq(schema.materials.userId, userId)];
  if (opts.kind) conditions.push(eq(schema.materials.kind, opts.kind));
  if (opts.q) conditions.push(like(schema.materials.title, `%${opts.q.replace(/[%_]/g, "")}%`));
  const rows = await (await getDb())
    .select()
    .from(schema.materials)
    .where(and(...conditions))
    .orderBy(desc(schema.materials.createdAt))
    .limit(opts.limit ?? 100)
    .all();
  return rows.map(toSummary);
}

async function findOwned(userId: string, id: string): Promise<Material> {
  const row = await (await getDb())
    .select()
    .from(schema.materials)
    .where(and(eq(schema.materials.id, id), eq(schema.materials.userId, userId)))
    .get();
  if (!row) throw new HttpError(404, "자료를 찾을 수 없습니다.");
  return row;
}

export async function getMaterial(userId: string, id: string): Promise<MaterialDTO> {
  return toDTO(await findOwned(userId, id));
}

export async function deleteMaterial(userId: string, id: string) {
  await findOwned(userId, id);
  await (await getDb()).delete(schema.materials).where(eq(schema.materials.id, id)).run();
}

async function insertMaterial(values: typeof schema.materials.$inferInsert): Promise<MaterialDTO> {
  const now = new Date();
  const row = await (await getDb())
    .insert(schema.materials)
    .values({ createdAt: now, updatedAt: now, ...values })
    .returning()
    .get();
  return toDTO(row);
}

/** 토큰을 먼저 차감하고, 작업이 실패하면 같은 수량을 환불합니다. */
async function withPoints<T>(userId: string, cost: number, memo: string, refId: string, work: () => Promise<T>): Promise<T> {
  await debitPoints(userId, cost, memo, refId);
  try {
    return await work();
  } catch (err) {
    await creditPoints(userId, cost, "refund", `생성 실패 환불 · ${memo}`, refId);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* 생성                                                                 */
/* ------------------------------------------------------------------ */

export async function createPassageMaterial(userId: string, input: CreateMaterialInput): Promise<MaterialDTO> {
  const id = randomUUID();
  const types = [...new Set(input.types)];
  const cost = costOf(types);
  const label = types.map((t) => MATERIAL_TYPE_META[t].shortLabel).join("·");
  return withPoints(userId, cost, `자료 생성 (${label})`, id, async () => {
    const generated = await withUsageLog(userId, id, "passage", async (log) =>
      generatePassageContent({ ...input, types }, { engine: await engineForUserId(userId), log }),
    );
    return insertMaterial({
      id,
      userId,
      kind: "passage",
      title: generated.title || "제목 없는 지문",
      author: generated.author,
      sourceNote: input.sourceNote,
      sourceText: input.passage,
      settings: input.settings,
      types,
      content: generated.content,
      engine: generated.engine,
      pointsSpent: cost,
    });
  });
}

export async function createOcrMaterial(userId: string, file: UploadedFile): Promise<MaterialDTO> {
  const id = randomUUID();
  const save = (result: OcrResult, engine: MaterialDTO["engine"], pointsSpent: number) => {
    if (!result.text.trim()) throw new HttpError(422, "문서에서 텍스트를 찾지 못했습니다.");
    return insertMaterial({
      id,
      userId,
      kind: "ocr",
      title: file.name.replace(/\.[^.]+$/, ""),
      sourceText: result.text,
      content: { ocr: result },
      engine,
      pointsSpent,
    });
  };
  // 텍스트 레이어가 있는 문서(HWPX·DOCX·TXT·텍스트 PDF)는 무료로 변환합니다.
  const local = await extractTextLocally(file);
  if (local) return save({ fileName: file.name, ...local }, "none", 0);
  // 스캔 PDF·이미지는 AI OCR (토큰 차감, 실패 시 환불)
  const cost = FEATURE_COSTS.ocrPerFile;
  return withPoints(userId, cost, `스마트 OCR (${file.name})`, id, async () => {
    const { engine, text } = await withUsageLog(userId, id, "ocr", async (log) => ocrWithAi(file, { engine: await engineForUserId(userId), log }));
    return save({ fileName: file.name, method: "ai-ocr", text }, engine, cost);
  });
}

export async function createExamReportMaterial(userId: string, input: AnalyzeExamInput): Promise<MaterialDTO> {
  const id = randomUUID();
  const cost = FEATURE_COSTS.examReport;
  return withPoints(userId, cost, "시험지 분석 보고서", id, async () => {
    const { engine, report } = await withUsageLog(userId, id, "exam_report", async (log) =>
      analyzeExamPaper(input, { engine: await engineForUserId(userId), log }),
    );
    if (input.examTitle) report.exam_title = input.examTitle;
    return insertMaterial({
      id,
      userId,
      kind: "exam_report",
      title: report.exam_title || "시험지 분석 보고서",
      sourceNote: [input.school, input.grade].filter(Boolean).join(" · "),
      sourceText: input.examText,
      settings: { school: input.school, grade: input.grade },
      content: { report },
      engine,
      pointsSpent: cost,
    });
  });
}

export async function composeExamSetMaterial(userId: string, input: ComposeExamInput): Promise<MaterialDTO> {
  const sections = [];
  for (const { materialId, include } of input.sections) {
    const row = await findOwned(userId, materialId);
    if (row.kind !== "passage") throw new HttpError(400, `‘${row.title}’은(는) 지문 자료가 아니어서 묶을 수 없습니다.`);
    const c = row.content as PassageContent;
    const section = {
      materialId,
      passage: { title: row.title, author: row.author, text: row.sourceText },
      mcq: include.includes("mcq") ? (c.mcq?.questions ?? []) : [],
      short_answer: include.includes("short_answer") ? (c.short_answer?.questions ?? []) : [],
      ox: include.includes("ox") ? (c.ox?.items ?? []) : [],
    };
    if (!section.mcq.length && !section.short_answer.length && !section.ox.length) {
      throw new HttpError(400, `‘${row.title}’에는 선택한 유형의 문항이 없습니다. 먼저 문항을 생성해 주세요.`);
    }
    sections.push(section);
  }

  const exam: ExamSet = {
    title: input.title,
    school: input.school,
    grade: input.grade,
    timeLimit: input.timeLimit,
    instructions: [
      "문제지와 답안지에 학년, 반, 번호, 이름을 정확하게 쓰시오.",
      "선택형 문항은 답안지의 해당 번호에, 서술형 문항은 서술형 답안지에 작성하시오.",
      "각 문항의 배점은 문항 끝에 표시된 점수를 따르시오.",
    ],
    sections,
  };
  const id = randomUUID();
  const cost = FEATURE_COSTS.examCompose;
  return withPoints(userId, cost, `모음 시험지 제본 (${sections.length}개 지문)`, id, async () =>
    insertMaterial({
      id,
      userId,
      kind: "exam_set",
      title: input.title,
      sourceNote: [input.school, input.grade].filter(Boolean).join(" · "),
      settings: { timeLimit: input.timeLimit },
      content: { exam },
      engine: "none",
      pointsSpent: cost,
    }),
  );
}

/** 체험 계정에 샘플 자료를 미리 채워 둡니다. 샘플 slug → 생성된 자료 ID를 돌려줍니다. */
export async function seedSampleMaterials(userId: string): Promise<Record<string, string>> {
  const base = Date.now();
  const db = await getDb();
  const ids: Record<string, string> = {};
  const values = SAMPLES.map((sample, i) => {
    const types = Object.keys(sample.content) as MaterialType[];
    const at = new Date(base - (SAMPLES.length - i) * 60_000);
    ids[sample.slug] = randomUUID();
    return {
      id: ids[sample.slug],
      userId,
      kind: "passage",
      title: sample.title,
      author: sample.author,
      sourceNote: sample.sourceNote,
      sourceText: sample.passage,
      settings: { ...sample.settings, genre: "auto" },
      types,
      content: sample.content,
      engine: "none",
      pointsSpent: 0,
      createdAt: at,
      updatedAt: at,
    } satisfies typeof schema.materials.$inferInsert;
  });
  await db.insert(schema.materials).values(values).run();
  return ids;
}
