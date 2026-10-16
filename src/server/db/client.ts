import "server-only";

import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { env } from "@/server/env";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __classpickDb?: DB };

function createDb(): DB {
  const file = path.resolve(env.databasePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  // 서버 기동 후 첫 접근 시 마이그레이션을 적용합니다 (drizzle/ 폴더).
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}

/** 프로세스당 하나의 커넥션을 재사용합니다 (개발 모드 HMR 대응). */
export function getDb(): DB {
  if (!globalForDb.__classpickDb) {
    globalForDb.__classpickDb = createDb();
  }
  return globalForDb.__classpickDb;
}

export { schema };
