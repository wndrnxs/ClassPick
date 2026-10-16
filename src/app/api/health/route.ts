import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/server/db/client";
import { aiEngine, env } from "@/server/env";

export async function GET() {
  await connection();
  let database = "ok";
  try {
    await (await getDb()).get(sql`select 1`);
  } catch {
    database = "error";
  }
  return Response.json({ status: "ok", database, aiEngine: aiEngine(), model: env.aiModel, payments: env.paymentProvider });
}
