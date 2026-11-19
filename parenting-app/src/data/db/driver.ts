export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;

/**
 * The only thing the rest of the data layer knows about SQLite.
 * Native uses expo-sqlite; web and the test-suite use sql.js. Same SQL everywhere.
 */
export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T extends SqlRow = SqlRow>(sql: string, params?: SqlValue[]): Promise<T[]>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
