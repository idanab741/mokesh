import { ValidationError } from '@/domain/activity';
import { CATALOG, type Milestone, type MilestoneDomain } from '@/domain/milestones';
import { newId } from '@/lib/id';
import { dayKey } from '@/lib/time';
import type { SqlDriver, SqlRow } from '../db/driver';

interface Row extends SqlRow {
  id: string; child_id: string; catalog_key: string | null; domain: string; title: string;
  achieved_on: string | null; notes: string | null; created_at: string; deleted_at: string | null;
}
const toMilestone = (r: Row): Milestone => ({
  id: r.id, childId: r.child_id, catalogKey: r.catalog_key, domain: r.domain as MilestoneDomain, title: r.title,
  achievedOn: r.achieved_on, notes: r.notes, createdAt: r.created_at,
});

export interface MilestoneDraft { title: string; achievedOn: string | null; notes?: string | null }

/**
 * One catalog moment per child lives in one row, whichever device marks it: the id is derived
 * from the child and the key, so two parents marking "crawls" on two phones meet in the same row
 * instead of colliding on the server's unique index.
 */
export function catalogRowId(childId: string, key: string): string {
  const text = `${childId}:${key}`;
  const h = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    for (let k = 0; k < 4; k += 1) h[k] = Math.imul(h[k] ^ (c + k * 31), 0x01000193 + k * 2) >>> 0;
    h.push(h.shift() as number);
  }
  const hex = h.map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
  // Shaped as a version-4, variant-1 UUID so the server accepts it as a uuid.
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function createMilestonesRepository(db: SqlDriver) {
  const clean = (draft: MilestoneDraft, now: Date) => {
    const title = draft.title.trim().slice(0, 160);
    if (!title) throw new ValidationError('missing_title');
    if (draft.achievedOn && !/^\d{4}-\d{2}-\d{2}$/.test(draft.achievedOn)) throw new ValidationError('invalid_time');
    if (draft.achievedOn && draft.achievedOn > dayKey(now)) throw new ValidationError('future_time');
    return { title, achievedOn: draft.achievedOn, notes: draft.notes?.trim() ? draft.notes.trim().slice(0, 2000) : null };
  };
  return {
    async list(childId: string): Promise<Milestone[]> {
      const rows = await db.all<Row>(
        `SELECT * FROM milestones WHERE child_id = ? AND deleted_at IS NULL ORDER BY COALESCE(achieved_on, substr(created_at, 1, 10)) DESC, created_at DESC`, [childId]);
      return rows.map(toMilestone);
    },
    /** Marks a moment from the catalog, or updates its date and note if it is already marked. */
    async markCatalog(childId: string, key: string, draft: MilestoneDraft, now: Date = new Date()): Promise<void> {
      const item = CATALOG.find((c) => c.key === key);
      if (!item) throw new ValidationError('unknown_milestone');
      const m = clean(draft, now);
      const id = catalogRowId(childId, key);
      const stamp = now.toISOString();
      const existing = await db.all<Row>('SELECT id FROM milestones WHERE id = ?', [id]);
      if (existing.length > 0) {
        await db.run(
          `UPDATE milestones SET title = ?, achieved_on = ?, notes = ?, deleted_at = NULL, updated_at = ?,
             sync_status = CASE WHEN sync_status = 'conflict' THEN 'conflict' ELSE 'pending' END WHERE id = ?`,
          [m.title, m.achievedOn, m.notes, stamp, id]);
      } else {
        await db.run(
          `INSERT INTO milestones (id, child_id, catalog_key, domain, title, achieved_on, notes, created_at, updated_at, version, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
          [id, childId, key, item.domain, m.title, m.achievedOn, m.notes, stamp, stamp]);
      }
    },
    /** A moment in the family's own words. */
    async addCustom(childId: string, draft: MilestoneDraft, now: Date = new Date()): Promise<void> {
      const m = clean(draft, now);
      const stamp = now.toISOString();
      await db.run(
        `INSERT INTO milestones (id, child_id, catalog_key, domain, title, achieved_on, notes, created_at, updated_at, version, sync_status)
         VALUES (?, ?, NULL, 'social', ?, ?, ?, ?, ?, 0, 'pending')`,
        [newId(), childId, m.title, m.achievedOn, m.notes, stamp, stamp]);
    },
    async update(id: string, draft: MilestoneDraft, now: Date = new Date()): Promise<void> {
      const m = clean(draft, now);
      await db.run(
        `UPDATE milestones SET title = ?, achieved_on = ?, notes = ?, updated_at = ?,
           sync_status = CASE WHEN sync_status = 'conflict' THEN 'conflict' ELSE 'pending' END WHERE id = ? AND deleted_at IS NULL`,
        [m.title, m.achievedOn, m.notes, now.toISOString(), id]);
    },
    async remove(id: string, now: Date = new Date()): Promise<void> {
      const stamp = now.toISOString();
      await db.run(`UPDATE milestones SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [stamp, stamp, id]);
    },
  };
}
export type MilestonesRepository = ReturnType<typeof createMilestonesRepository>;
