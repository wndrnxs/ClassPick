import "server-only";

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import { env } from "@/server/env";
import * as schema from "./schema";

/**
 * SQLite(libSQL) 커넥션. @libsql/client는 Windows·macOS·Linux용 바이너리를 미리 빌드해 배포하므로
 * 설치 시 C++ 컴파일 도구가 필요 없습니다.
 */
export type DB = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __classpickDb?: Promise<DB> };

async function createDb(): Promise<DB> {
  const file = path.resolve(env.databasePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const client = createClient({ url: pathToFileURL(file).href });
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");
  await client.execute("PRAGMA busy_timeout = 5000");
  const db = drizzle(client, { schema });
  // 서버 기동 후 첫 접근 시 마이그레이션을 적용합니다 (drizzle/ 폴더).
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}

/** 프로세스당 하나의 커넥션을 재사용합니다 (개발 모드 HMR 대응). */
export function getDb(): Promise<DB> {
  if (!globalForDb.__classpickDb) {
    globalForDb.__classpickDb = createDb().catch((err) => {
      globalForDb.__classpickDb = undefined;
      throw err;
    });
  }
  return globalForDb.__classpickDb;
}

export { schema };
