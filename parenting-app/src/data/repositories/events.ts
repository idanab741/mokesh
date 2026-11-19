import {
  type ActivityDraft,
  type ActivityEvent,
  type ActivityType,
  type EventOf,
  type SyncStatus,
  ValidationError,
  payloadSchemas,
  validateDraft,
} from '@/domain/activity';
import { newId } from '@/lib/id';
import type { SqlDriver, SqlRow } from '../db/driver';

interface EventRow extends SqlRow {
  id: string;
  child_id: string;
  created_by: string | null;
  activity_type: string;
  occurred_at: string;
  started_at: string | null;
  ended_at: string | null;
  payload: string;
  notes: string | null;
  client_event_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: string;
  conflict_remote: string | null;
}

function toEvent(row: EventRow): ActivityEvent | null {
  const type = row.activity_type as ActivityType;
  const schema = payloadSchemas[type];
  if (!schema) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(row.payload);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(raw);
  // A row written by a newer app version may not validate here; skip it rather than crash the timeline.
  if (!parsed.success) return null;
  return {
    id: row.id,
    childId: row.child_id,
    createdBy: row.created_by,
    type,
    occurredAt: row.occurred_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    payload: parsed.data,
    notes: row.notes,
    clientEventId: row.client_event_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    version: Number(row.version),
    syncStatus: row.sync_status as SyncStatus,
  } as ActivityEvent;
}

const mapRows = (rows: EventRow[]) => rows.map(toEvent).filter((e): e is ActivityEvent => e !== null);

export interface CreateOptions {
  /** Supplying the id makes the write idempotent: retrying with the same id never duplicates. */
  id?: string;
  createdBy?: string | null;
  now?: Date;
}

export function createEventsRepository(db: SqlDriver) {
  async function getById(id: string): Promise<ActivityEvent | null> {
    const rows = await db.all<EventRow>('SELECT * FROM activity_events WHERE id = ?', [id]);
    return rows[0] ? toEvent(rows[0]) : null;
  }

  async function getActiveSleep(childId: string): Promise<EventOf<'sleep'> | null> {
    const rows = await db.all<EventRow>(
      `SELECT * FROM activity_events
       WHERE child_id = ? AND activity_type = 'sleep' AND ended_at IS NULL AND deleted_at IS NULL
       ORDER BY occurred_at DESC LIMIT 1`,
      [childId],
    );
    const event = rows[0] ? toEvent(rows[0]) : null;
    return event && event.type === 'sleep' ? event : null;
  }

  return {
    getById,
    getActiveSleep,

    async create(childId: string, draft: ActivityDraft, options: CreateOptions = {}): Promise<ActivityEvent> {
      const now = options.now ?? new Date();
      const clean = validateDraft(draft, now);
      const id = options.id ?? newId();
      const stamp = now.toISOString();

      return db.transaction(async () => {
        const existing = await getById(id);
        if (existing) return existing; // idempotent retry
        if (clean.type === 'sleep' && !clean.endedAt && (await getActiveSleep(childId))) {
          throw new ValidationError('sleep_already_active');
        }
        await db.run(
          `INSERT INTO activity_events
             (id, child_id, created_by, activity_type, occurred_at, started_at, ended_at, payload, notes,
              client_event_id, created_at, updated_at, deleted_at, version, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 'pending')`,
          [id, childId, options.createdBy ?? null, clean.type, clean.occurredAt, clean.startedAt ?? null, clean.endedAt ?? null,
           JSON.stringify(clean.payload), clean.notes ?? null, id, stamp, stamp],
        );
        const saved = await getById(id);
        if (!saved) throw new Error('write_failed');
        return saved;
      });
    },

    async update(id: string, draft: ActivityDraft, now: Date = new Date()): Promise<ActivityEvent> {
      const clean = validateDraft(draft, now);
      return db.transaction(async () => {
        const current = await getById(id);
        if (!current || current.deletedAt) throw new ValidationError('not_found');
        if (current.type !== clean.type) throw new ValidationError('invalid_payload:type');
        if (clean.type === 'sleep' && !clean.endedAt) {
          const active = await getActiveSleep(current.childId);
          if (active && active.id !== id) throw new ValidationError('sleep_already_active');
        }
        await db.run(
          `UPDATE activity_events
             SET occurred_at = ?, started_at = ?, ended_at = ?, payload = ?, notes = ?, updated_at = ?,
                 sync_status = CASE WHEN sync_status = 'conflict' THEN 'conflict' ELSE 'pending' END
           WHERE id = ?`,
          [clean.occurredAt, clean.startedAt ?? null, clean.endedAt ?? null, JSON.stringify(clean.payload), clean.notes ?? null,
           now.toISOString(), id],
        );
        const saved = await getById(id);
        if (!saved) throw new Error('write_failed');
        return saved;
      });
    },

    /** Soft delete so the deletion itself can be synced to other devices. */
    async remove(id: string, now: Date = new Date()): Promise<void> {
      const stamp = now.toISOString();
      await db.run(
        `UPDATE activity_events
           SET deleted_at = ?, updated_at = ?,
               sync_status = CASE WHEN sync_status = 'conflict' THEN 'conflict' ELSE 'pending' END
         WHERE id = ? AND deleted_at IS NULL`,
        [stamp, stamp, id],
      );
    },

    async endSleep(id: string, endedAt: Date = new Date()): Promise<ActivityEvent> {
      const current = await getById(id);
      if (!current || current.type !== 'sleep' || current.deletedAt) throw new ValidationError('not_found');
      return this.update(id, {
        type: 'sleep',
        occurredAt: current.occurredAt,
        startedAt: current.startedAt,
        endedAt: endedAt.toISOString(),
        notes: current.notes,
        payload: {},
      }, endedAt);
    },

    /**
     * Events whose occurred_at is in [fromIso, toIso), plus any sleep overlapping the range
     * (started before it and still running or ending inside it).
     */
    async listInRange(childId: string, fromIso: string, toIso: string): Promise<ActivityEvent[]> {
      const rows = await db.all<EventRow>(
        `SELECT * FROM activity_events
         WHERE child_id = ? AND deleted_at IS NULL
           AND (
             (occurred_at >= ? AND occurred_at < ?)
             OR (activity_type = 'sleep' AND occurred_at < ? AND (ended_at IS NULL OR ended_at > ?))
           )
         ORDER BY occurred_at DESC`,
        [childId, fromIso, toIso, fromIso, fromIso],
      );
      return mapRows(rows);
    },

    async listRecent(childId: string, limit: number): Promise<ActivityEvent[]> {
      const rows = await db.all<EventRow>(
        'SELECT * FROM activity_events WHERE child_id = ? AND deleted_at IS NULL ORDER BY occurred_at DESC LIMIT ?',
        [childId, limit],
      );
      return mapRows(rows);
    },

    async lastOfType<T extends ActivityType>(childId: string, type: T): Promise<EventOf<T> | null> {
      const rows = await db.all<EventRow>(
        `SELECT * FROM activity_events WHERE child_id = ? AND activity_type = ? AND deleted_at IS NULL
         ORDER BY occurred_at DESC LIMIT 1`,
        [childId, type],
      );
      const event = rows[0] ? toEvent(rows[0]) : null;
      return event && event.type === type ? (event as EventOf<T>) : null;
    },

    /** Foods this family has logged before, most used first. Comes only from the user's own records. */
    async foodHistory(childId: string, beforeIso?: string): Promise<{ name: string; isAllergen: boolean; count: number }[]> {
      const rows = await db.all<EventRow>(
        `SELECT * FROM activity_events
         WHERE child_id = ? AND activity_type = 'solids' AND deleted_at IS NULL ${beforeIso ? 'AND occurred_at < ?' : ''}
         ORDER BY occurred_at DESC LIMIT 500`,
        beforeIso ? [childId, beforeIso] : [childId],
      );
      const foods = new Map<string, { name: string; isAllergen: boolean; count: number }>();
      for (const e of mapRows(rows)) {
        if (e.type !== 'solids') continue;
        for (const f of e.payload.foods) {
          const key = f.name.trim().toLowerCase();
          const prev = foods.get(key);
          if (prev) prev.count += 1;
          else foods.set(key, { name: f.name.trim(), isAllergen: f.isAllergen, count: 1 });
        }
      }
      return [...foods.values()].sort((a, b) => b.count - a.count);
    },

    async countUnsynced(): Promise<{ pending: number; conflicts: number }> {
      const rows = await db.all<{ sync_status: string; n: number }>(
        `SELECT sync_status, COUNT(*) AS n FROM activity_events WHERE sync_status <> 'synced' GROUP BY sync_status`,
      );
      const get = (s: string) => Number(rows.find((r) => r.sync_status === s)?.n ?? 0);
      return { pending: get('pending'), conflicts: get('conflict') };
    },

    async listConflicts(childId: string): Promise<ActivityEvent[]> {
      const rows = await db.all<EventRow>(
        `SELECT * FROM activity_events WHERE child_id = ? AND sync_status = 'conflict' ORDER BY occurred_at DESC`,
        [childId],
      );
      return mapRows(rows);
    },
  };
}

export type EventsRepository = ReturnType<typeof createEventsRepository>;
