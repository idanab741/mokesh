import initSqlJs from 'sql.js';
import type { SqlDriver } from '@/data/db/driver';
import { migrate } from '@/data/db/schema';
import { createSqlJsDriver } from '@/data/db/sqljsDriver';

/** A fresh, fully migrated in-memory SQLite database (real SQLite, compiled to WASM). */
export async function createTestDb(): Promise<SqlDriver> {
  const SQL = await initSqlJs();
  const driver = createSqlJsDriver(new SQL.Database());
  await migrate(driver);
  return driver;
}
