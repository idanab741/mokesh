import { ValidationError, type SyncStatus } from '@/domain/activity';
import type { ChildSex } from '@/domain/age';
import { type Child, type ChildDraft, type Measurement, type MeasurementDraft, childDraftSchema, measurementDraftSchema } from '@/domain/child';
import { newId } from '@/lib/id';
import { dayKey } from '@/lib/time';
import type { SqlDriver, SqlRow } from '../db/driver';

interface ChildRow extends SqlRow {
  id: string; family_id: string | null; name: string; birth_date: string; sex: string;
  gestational_weeks: number | null; photo_uri: string | null; notes: string | null;
  created_at: string; updated_at: string; deleted_at: string | null; version: number; sync_status: string;
}

const toChild = (r: ChildRow): Child => ({
  id: r.id,
  familyId: r.family_id,
  name: r.name,
  birthDate: r.birth_date,
  sex: r.sex as ChildSex,
  gestationalWeeks: r.gestational_weeks === null ? null : Number(r.gestational_weeks),
  photoUri: r.photo_uri,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
  version: Number(r.version),
  syncStatus: r.sync_status as SyncStatus,
});

function parseChildDraft(draft: ChildDraft, now: Date): ChildDraft {
  const parsed = childDraftSchema.safeParse(draft);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'invalid_child');
  if (parsed.data.birthDate > dayKey(now)) throw new ValidationError('birth_date_future');
  return { ...parsed.data, notes: parsed.data.notes || null };
}

export function createChildrenRepository(db: SqlDriver) {
  async function getById(id: string): Promise<Child | null> {
    const rows = await db.all<ChildRow>('SELECT * FROM children WHERE id = ?', [id]);
    return rows[0] ? toChild(rows[0]) : null;
  }
  return {
    getById,
    async list(): Promise<Child[]> {
      const rows = await db.all<ChildRow>('SELECT * FROM children WHERE deleted_at IS NULL ORDER BY birth_date DESC, created_at ASC');
      return rows.map(toChild);
    },
    async create(draft: ChildDraft, now: Date = new Date()): Promise<Child> {
      const clean = parseChildDraft(draft, now);
      const id = newId();
      const stamp = now.toISOString();
      await db.run(
        `INSERT INTO children (id, family_id, name, birth_date, sex, gestational_weeks, photo_uri, notes, created_at, updated_at, version, sync_status)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
        [id, clean.name, clean.birthDate, clean.sex, clean.gestationalWeeks, clean.photoUri, clean.notes, stamp, stamp],
      );
      return (await getById(id))!;
    },
    async update(id: string, draft: ChildDraft, now: Date = new Date()): Promise<Child> {
      const clean = parseChildDraft(draft, now);
      await db.run(
        `UPDATE children SET name = ?, birth_date = ?, sex = ?, gestational_weeks = ?, photo_uri = ?, notes = ?, updated_at = ?,
           sync_status = CASE WHEN sync_status = 'conflict' THEN 'conflict' ELSE 'pending' END
         WHERE id = ? AND deleted_at IS NULL`,
        [clean.name, clean.birthDate, clean.sex, clean.gestationalWeeks, clean.photoUri, clean.notes, now.toISOString(), id],
      );
      const saved = await getById(id);
      if (!saved) throw new ValidationError('not_found');
      return saved;
    },
    async remove(id: string, now: Date = new Date()): Promise<void> {
      const stamp = now.toISOString();
      await db.run(`UPDATE children SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [stamp, stamp, id]);
    },
  };
}
export type ChildrenRepository = ReturnType<typeof createChildrenRepository>;

interface MeasurementRow extends SqlRow {
  id: string; child_id: string; measured_at: string; weight_g: number | null; length_mm: number | null;
  head_circumference_mm: number | null; notes: string | null; created_at: string; updated_at: string;
  deleted_at: string | null; version: number; sync_status: string;
}
const num = (v: number | null) => (v === null ? null : Number(v));
const toMeasurement = (r: MeasurementRow): Measurement => ({
  id: r.id, childId: r.child_id, measuredAt: r.measured_at, weightG: num(r.weight_g), lengthMm: num(r.length_mm),
  headCircumferenceMm: num(r.head_circumference_mm), notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
  deletedAt: r.deleted_at, version: Number(r.version), syncStatus: r.sync_status as SyncStatus,
});

export function createMeasurementsRepository(db: SqlDriver) {
  const parse = (draft: MeasurementDraft, now: Date) => {
    const parsed = measurementDraftSchema.safeParse(draft);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'invalid_measurement');
    if (parsed.data.measuredAt > dayKey(now)) throw new ValidationError('future_time');
    return parsed.data;
  };
  return {
    async list(childId: string): Promise<Measurement[]> {
      const rows = await db.all<MeasurementRow>(
        'SELECT * FROM measurements WHERE child_id = ? AND deleted_at IS NULL ORDER BY measured_at DESC, created_at DESC', [childId]);
      return rows.map(toMeasurement);
    },
    async create(childId: string, draft: MeasurementDraft, now: Date = new Date()): Promise<void> {
      const m = parse(draft, now);
      const stamp = now.toISOString();
      await db.run(
        `INSERT INTO measurements (id, child_id, measured_at, weight_g, length_mm, head_circumference_mm, notes, created_at, updated_at, version, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
        [newId(), childId, m.measuredAt, m.weightG, m.lengthMm, m.headCircumferenceMm, m.notes || null, stamp, stamp]);
    },
    async remove(id: string, now: Date = new Date()): Promise<void> {
      const stamp = now.toISOString();
      await db.run(`UPDATE measurements SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [stamp, stamp, id]);
    },
  };
}
export type MeasurementsRepository = ReturnType<typeof createMeasurementsRepository>;
