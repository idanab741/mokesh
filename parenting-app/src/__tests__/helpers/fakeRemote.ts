import type { RemoteGateway, RemoteRow, SyncTable } from '@/data/sync/types';

/**
 * In-memory stand-in for the Supabase backend that follows the same rules as the real
 * schema: insert-if-absent by id, version bump on every update, compare-and-set on version.
 */
export function createFakeRemote() {
  const tables: Record<SyncTable, Map<string, RemoteRow>> = {
    children: new Map(),
    activity_events: new Map(),
    measurements: new Map(),
    milestones: new Map(),
    health_records: new Map(),
    medications: new Map(),
    medication_administrations: new Map(),
    appointments: new Map(),
  };
  let clock = Date.parse('2026-01-01T00:00:00.000Z');
  const tick = () => new Date((clock += 1000)).toISOString();
  const state = { offline: false, calls: 0, dropNextResponse: false };

  const guard = () => {
    state.calls += 1;
    if (state.offline) throw new Error('Network request failed');
  };

  const gateway: RemoteGateway = {
    async ensureFamily() {
      guard();
      return 'family-1';
    },
    async insert(table, row) {
      guard();
      const id = String(row.id);
      const existing = tables[table].get(id);
      let result: { row: RemoteRow; created: boolean };
      if (existing) {
        result = { row: { ...existing }, created: false };
      } else {
        const created = { ...row, id, version: 1, updated_at: tick(), deleted_at: (row.deleted_at as string | null) ?? null } as RemoteRow;
        tables[table].set(id, created);
        result = { row: { ...created }, created: true };
      }
      if (state.dropNextResponse) {
        state.dropNextResponse = false;
        throw new Error('Network request failed');
      }
      return result;
    },
    async update(table, id, baseVersion, patch) {
      guard();
      const existing = tables[table].get(id);
      if (!existing || existing.version !== baseVersion) return null;
      const next = { ...existing, ...patch, version: existing.version + 1, updated_at: tick() } as RemoteRow;
      tables[table].set(id, next);
      return { ...next };
    },
    async get(table, id) {
      guard();
      const row = tables[table].get(id);
      return row ? { ...row } : null;
    },
    async pull(table, cursor) {
      guard();
      return [...tables[table].values()]
        .filter((r) => !cursor || r.updated_at >= cursor)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at))
        .map((r) => ({ ...r }));
    },
  };

  return {
    gateway,
    tables,
    state,
    /** Simulates an edit made by another device. */
    editOnServer(table: SyncTable, id: string, patch: Record<string, unknown>) {
      const existing = tables[table].get(id);
      if (!existing) throw new Error('no such row');
      tables[table].set(id, { ...existing, ...patch, version: existing.version + 1, updated_at: tick() } as RemoteRow);
    },
  };
}
