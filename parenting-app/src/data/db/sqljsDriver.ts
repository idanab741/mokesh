import type { Database } from 'sql.js';
import type { SqlDriver, SqlRow, SqlValue } from './driver';

/** Wraps a sql.js database. `onWrite` lets the web build persist the file after changes. */
export function createSqlJsDriver(db: Database, onWrite?: () => void): SqlDriver {
  let depth = 0;
  const wrote = () => {
    if (depth === 0) onWrite?.();
  };
  return {
    async exec(sql) {
      db.exec(sql);
      wrote();
    },
    async run(sql, params = []) {
      db.run(sql, params);
      wrote();
    },
    async all<T extends SqlRow>(sql: string, params: SqlValue[] = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async transaction<T>(fn: () => Promise<T>) {
      if (depth > 0) return fn();
      db.exec('BEGIN');
      depth += 1;
      try {
        const result = await fn();
        db.exec('COMMIT');
        depth -= 1;
        wrote();
        return result;
      } catch (err) {
        depth -= 1;
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}
