import type { SqlDriver, SqlRow, SqlValue } from '../db/driver';
import type { KvStore } from '../repositories/kv';
import type { RemoteGateway, RemoteRow, SyncResult, SyncTable } from './types';

/**
 * State-based, offline-first sync.
 *
 *  - Every local write marks its row `pending`. That flag IS the upload queue: it survives
 *    app restarts and there is nothing separate to lose.
 *  - Push: rows never seen by the server (version 0) are inserted idempotently by id.
 *    Known rows are updated only if the server is still at the version this device last saw.
 *  - Conflict policy: if both sides changed the same row and the content differs, nothing is
 *    overwritten. The row becomes `conflict`, keeps the local edit, stores the server copy
 *    next to it, and the UI asks the parent which one to keep. Identical edits and
 *    delete-vs-delete resolve silently.
 *  - Pull: rows changed on the server since the last cursor are applied, never over a local
 *    pending edit.
 */

interface TableSpec {
  table: SyncTable;
  /** Columns copied verbatim in both directions. */
  columns: string[];
  /** Stored as TEXT locally and as jsonb remotely. */
  json: string[];
  /** Timestamps the server may return in a different textual form. */
  timestamps: string[];
  /** Columns the client never sends (owned by the server). */
  serverOwned: string[];
}

const SPECS: TableSpec[] = [
  {
    table: 'children',
    columns: ['id', 'family_id', 'name', 'birth_date', 'sex', 'gestational_weeks', 'notes', 'created_at', 'deleted_at'],
    json: [],
    timestamps: ['created_at', 'deleted_at'],
    serverOwned: [],
  },
  {
    table: 'activity_events',
    columns: ['id', 'child_id', 'created_by', 'activity_type', 'occurred_at', 'started_at', 'ended_at', 'payload', 'notes',
              'client_event_id', 'created_at', 'deleted_at'],
    json: ['payload'],
    timestamps: ['occurred_at', 'started_at', 'ended_at', 'created_at', 'deleted_at'],
    serverOwned: ['created_by'],
  },
  {
    table: 'measurements',
    columns: ['id', 'child_id', 'created_by', 'measured_at', 'weight_g', 'length_mm', 'head_circumference_mm', 'notes',
              'created_at', 'deleted_at'],
    json: [],
    timestamps: ['created_at', 'deleted_at'],
    serverOwned: ['created_by'],
  },
];

/** Columns that never change after creation and therefore are not part of an update patch. */
const IMMUTABLE = new Set(['id', 'child_id', 'family_id', 'client_event_id', 'created_at', 'created_by']);
/** Columns ignored when deciding whether two versions of a row "say the same thing". */
const NOT_CONTENT = new Set(['created_at', 'created_by', 'family_id']);

const normTs = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

function localToRemote(spec: TableSpec, row: SqlRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of spec.columns) {
    if (spec.serverOwned.includes(col)) continue;
    out[col] = spec.json.includes(col) ? JSON.parse(String(row[col] ?? '{}')) : row[col] ?? null;
  }
  return out;
}

function remoteToLocal(spec: TableSpec, remote: RemoteRow): Record<string, SqlValue> {
  const out: Record<string, SqlValue> = {};
  for (const col of spec.columns) {
    const v = remote[col];
    if (spec.json.includes(col)) out[col] = stableJson(v ?? {});
    else if (spec.timestamps.includes(col)) out[col] = normTs(v);
    else out[col] = v === undefined || v === null ? null : (v as SqlValue);
  }
  return out;
}

function sameContent(spec: TableSpec, local: SqlRow, remote: RemoteRow): boolean {
  const mapped = remoteToLocal(spec, remote);
  return spec.columns.every((col) => {
    if (NOT_CONTENT.has(col)) return true;
    const a = spec.json.includes(col) ? stableJson(JSON.parse(String(local[col] ?? '{}'))) : spec.timestamps.includes(col) ? normTs(local[col]) : local[col] ?? null;
    return a === mapped[col];
  });
}

export interface SyncEngineDeps {
  db: SqlDriver;
  kv: KvStore;
  remote: RemoteGateway;
  defaultFamilyName?: string;
}

export function createSyncEngine({ db, kv, remote, defaultFamilyName = 'המשפחה שלנו' }: SyncEngineDeps) {
  let running: Promise<SyncResult> | null = null;

  async function writeRemoteRow(spec: TableSpec, remoteRow: RemoteRow, exists: boolean) {
    const values = remoteToLocal(spec, remoteRow);
    const updatedAt = normTs(remoteRow.updated_at) ?? new Date().toISOString();
    if (exists) {
      const cols = spec.columns.filter((c) => c !== 'id');
      await db.run(
        `UPDATE ${spec.table} SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ?, version = ?, sync_status = 'synced', conflict_remote = NULL WHERE id = ?`,
        [...cols.map((c) => values[c]), updatedAt, remoteRow.version, remoteRow.id],
      );
    } else {
      await db.run(
        `INSERT INTO ${spec.table} (${spec.columns.join(', ')}, updated_at, version, sync_status) VALUES (${spec.columns.map(() => '?').join(', ')}, ?, ?, 'synced')`,
        [...spec.columns.map((c) => values[c]), updatedAt, remoteRow.version],
      );
    }
  }

  async function markConflict(spec: TableSpec, id: string, remoteRow: RemoteRow) {
    await db.run(`UPDATE ${spec.table} SET sync_status = 'conflict', conflict_remote = ? WHERE id = ?`, [JSON.stringify(remoteRow), id]);
  }

  /** Mark as synced only if the row was not edited again while the request was in flight. */
  async function acknowledge(spec: TableSpec, local: SqlRow, serverVersion: number) {
    await db.run(
      `UPDATE ${spec.table}
         SET version = ?, conflict_remote = NULL,
             sync_status = CASE WHEN updated_at = ? THEN 'synced' ELSE 'pending' END
       WHERE id = ?`,
      [serverVersion, local.updated_at, local.id],
    );
  }

  async function settleMismatch(spec: TableSpec, local: SqlRow, server: RemoteRow | null, result: SyncResult) {
    if (!server) {
      // The row vanished on the server (hard-deleted with its family). Nothing left to reconcile.
      await db.run(`UPDATE ${spec.table} SET sync_status = 'synced', deleted_at = COALESCE(deleted_at, ?) WHERE id = ?`, [new Date().toISOString(), local.id]);
      return;
    }
    const bothDeleted = local.deleted_at !== null && server.deleted_at !== null;
    if (bothDeleted || sameContent(spec, local, server)) {
      await acknowledge(spec, local, server.version);
      result.pushed += 1;
      return;
    }
    await markConflict(spec, String(local.id), server);
    result.conflicts += 1;
  }

  async function pushTable(spec: TableSpec, result: SyncResult) {
    const pending = await db.all(`SELECT * FROM ${spec.table} WHERE sync_status = 'pending' ORDER BY updated_at ASC`);
    for (const local of pending) {
      try {
        const payload = localToRemote(spec, local);
        const baseVersion = Number(local.version);
        if (baseVersion === 0) {
          const { row, created } = await remote.insert(spec.table, payload);
          if (created || sameContent(spec, local, row)) {
            await acknowledge(spec, local, row.version);
            result.pushed += 1;
            continue;
          }
          // The insert reached the server earlier (lost response) and the row was edited since: send the edit.
          const patched = await remote.update(spec.table, row.id, row.version, patchOf(payload));
          if (patched) {
            await acknowledge(spec, local, patched.version);
            result.pushed += 1;
          } else {
            await settleMismatch(spec, local, await remote.get(spec.table, row.id), result);
          }
          continue;
        }
        const updated = await remote.update(spec.table, String(local.id), baseVersion, patchOf(payload));
        if (updated) {
          await acknowledge(spec, local, updated.version);
          result.pushed += 1;
        } else {
          await settleMismatch(spec, local, await remote.get(spec.table, String(local.id)), result);
        }
      } catch (err) {
        // Offline, timeout or a permission error: keep the row pending and move on.
        result.failed += 1;
        result.lastError = err instanceof Error ? err.message : String(err);
        if (isNetworkError(err)) return;
      }
    }
  }

  async function pullTable(spec: TableSpec, result: SyncResult) {
    const cursorKey = `sync_cursor:${spec.table}`;
    const cursor = await kv.get(cursorKey);
    const rows = await remote.pull(spec.table, cursor);
    let newest = cursor;
    for (const remoteRow of rows) {
      const found = await db.all(`SELECT * FROM ${spec.table} WHERE id = ?`, [remoteRow.id]);
      const local = found[0];
      if (!local) {
        await writeRemoteRow(spec, remoteRow, false);
        result.pulled += 1;
      } else if (local.sync_status === 'synced') {
        if (remoteRow.version > Number(local.version)) {
          await writeRemoteRow(spec, remoteRow, true);
          result.pulled += 1;
        }
      } else if (remoteRow.version > Number(local.version)) {
        // Local edit that the server has moved past.
        if (sameContent(spec, local, remoteRow) || (local.deleted_at !== null && remoteRow.deleted_at !== null)) {
          await writeRemoteRow(spec, remoteRow, true);
        } else if (local.sync_status !== 'conflict' || local.conflict_remote !== JSON.stringify(remoteRow)) {
          await markConflict(spec, remoteRow.id, remoteRow);
          result.conflicts += 1;
        }
      }
      const ts = normTs(remoteRow.updated_at);
      if (ts && (!newest || ts > newest)) newest = ts;
    }
    if (newest && newest !== cursor) await kv.set(cursorKey, newest);
  }

  async function attachFamily() {
    const orphans = await db.all(`SELECT id FROM children WHERE family_id IS NULL`);
    if (orphans.length === 0) return;
    let familyId = await kv.get('family_id');
    if (!familyId) {
      familyId = await remote.ensureFamily(defaultFamilyName);
      await kv.set('family_id', familyId);
    }
    await db.run(`UPDATE children SET family_id = ? WHERE family_id IS NULL`, [familyId]);
  }

  async function runOnce(): Promise<SyncResult> {
    const result: SyncResult = { pushed: 0, pulled: 0, conflicts: 0, failed: 0, lastError: null };
    try {
      await attachFamily();
      // Pull first so a brand-new device does not push before it knows what exists;
      // children before their events because of the foreign key.
      for (const spec of SPECS) await pullTable(spec, result);
      for (const spec of SPECS) await pushTable(spec, result);
    } catch (err) {
      result.failed += 1;
      result.lastError = err instanceof Error ? err.message : String(err);
    }
    return result;
  }

  return {
    /** Runs one sync round. Concurrent calls share the same round. */
    sync(): Promise<SyncResult> {
      if (!running) {
        running = runOnce().finally(() => {
          running = null;
        });
      }
      return running;
    },

    /**
     * After joining a family: its rows are older than the pull cursors of this device, so the next
     * round has to read everything again. Waits for a round that is already running to end first.
     */
    async pullEverything(): Promise<SyncResult> {
      if (running) await running.catch(() => undefined);
      for (const spec of SPECS) await kv.set(`sync_cursor:${spec.table}`, '');
      return this.sync();
    },

    /** Conflict resolution chosen by the parent. */
    async resolveConflict(table: SyncTable, id: string, choice: 'mine' | 'theirs'): Promise<void> {
      const spec = SPECS.find((s) => s.table === table)!;
      const rows = await db.all(`SELECT * FROM ${table} WHERE id = ? AND sync_status = 'conflict'`, [id]);
      const local = rows[0];
      if (!local || !local.conflict_remote) return;
      const server = JSON.parse(String(local.conflict_remote)) as RemoteRow;
      if (choice === 'theirs') {
        await writeRemoteRow(spec, server, true);
      } else {
        // Re-base the local edit on the server version; the next push then applies cleanly.
        await db.run(`UPDATE ${table} SET version = ?, sync_status = 'pending', conflict_remote = NULL WHERE id = ?`, [server.version, id]);
      }
    },

    async getConflictRemote(table: SyncTable, id: string): Promise<RemoteRow | null> {
      const rows = await db.all(`SELECT conflict_remote FROM ${table} WHERE id = ? AND sync_status = 'conflict'`, [id]);
      const raw = rows[0]?.conflict_remote;
      return raw ? (JSON.parse(String(raw)) as RemoteRow) : null;
    },
  };
}

function patchOf(payload: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) if (!IMMUTABLE.has(k)) patch[k] = v;
  return patch;
}

function isNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  return message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('offline') || message.includes('abort');
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
