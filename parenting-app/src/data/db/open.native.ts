import * as SQLite from 'expo-sqlite';
import type { SqlDriver, SqlRow, SqlValue } from './driver';

const DB_NAME = 'parenting.db';

export async function openDriver(): Promise<SqlDriver> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  let inTransaction = false;
  return {
    exec: (sql) => db.execAsync(sql),
    async run(sql, params = []) {
      await db.runAsync(sql, params);
    },
    all: <T extends SqlRow>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    async transaction<T>(fn: () => Promise<T>) {
      if (inTransaction) return fn();
      let result!: T;
      inTransaction = true;
      try {
        await db.withTransactionAsync(async () => {
          result = await fn();
        });
      } finally {
        inTransaction = false;
      }
      return result;
    },
  };
}
