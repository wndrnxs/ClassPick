import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/server/db/client";
import { aiEngine, env } from "@/server/env";

export async function GET() {
  await connection();
  let database = "ok";
  try {
    await (await getDb()).get(sql`select 1`);
  } catch (err) {
    database = "error";
    console.error("[health] DB 연결 실패", err);
  }
  return Response.json({
    status: "ok",
    database,
    // 어떤 DB에 연결됐는지 (주소·토큰은 노출하지 않음): remote = DATABASE_URL(Turso 등), local = 서버 파일
    databaseKind: env.databaseUrl ? "remote" : "local",
    aiEngine: aiEngine(),
    model: env.aiModel,
    payments: env.paymentProvider,
  });
}
