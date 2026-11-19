import type { SqlDriver } from '../db/driver';

export function createKvStore(db: SqlDriver) {
  return {
    async get(key: string): Promise<string | null> {
      const rows = await db.all<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
      return rows[0]?.value ?? null;
    },
    async set(key: string, value: string): Promise<void> {
      await db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
    },
    async remove(key: string): Promise<void> {
      await db.run('DELETE FROM kv WHERE key = ?', [key]);
    },
  };
}
export type KvStore = ReturnType<typeof createKvStore>;
