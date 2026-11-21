export type SyncTable = 'children' | 'activity_events' | 'measurements' | 'milestones';

/** A row as the server returns it (snake_case, jsonb already parsed). */
export interface RemoteRow {
  id: string;
  version: number;
  updated_at: string;
  deleted_at: string | null;
  [column: string]: unknown;
}

/**
 * Everything the sync engine needs from a backend. The Supabase implementation lives in
 * supabaseGateway.ts; tests use an in-memory fake that mimics the server's version rules.
 */
export interface RemoteGateway {
  /** Returns the id of a family the signed-in user belongs to, creating one if there is none. */
  ensureFamily(defaultName: string): Promise<string>;
  /** Insert-if-absent, keyed by id. `created` is false when the row already existed. */
  insert(table: SyncTable, row: Record<string, unknown>): Promise<{ row: RemoteRow; created: boolean }>;
  /** Applies the patch only when the server row is still at `baseVersion`. Null = version mismatch. */
  update(table: SyncTable, id: string, baseVersion: number, patch: Record<string, unknown>): Promise<RemoteRow | null>;
  get(table: SyncTable, id: string): Promise<RemoteRow | null>;
  /** Rows with updated_at >= cursor (all rows when null), oldest first, including soft-deleted ones. */
  pull(table: SyncTable, cursor: string | null): Promise<RemoteRow[]>;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  /** Rows that could not be uploaded this round (kept as pending and retried next time). */
  failed: number;
  lastError: string | null;
}
