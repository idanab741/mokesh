import { ValidationError } from '@/domain/activity';
import type { Medication, MedicationGiven, TemperatureReading, Vaccination, Visit, VisitKind } from '@/domain/health';
import { TEMP_MAX, TEMP_MIN } from '@/domain/health';
import { newId } from '@/lib/id';
import type { SqlDriver, SqlRow } from '../db/driver';

const text = (v: string | null | undefined, max: number) => (v?.trim() ? v.trim().slice(0, max) : null);
function pastIso(at: Date, now: Date): string {
  if (Number.isNaN(at.getTime())) throw new ValidationError('invalid_time');
  if (at.getTime() > now.getTime() + 5 * 60_000) throw new ValidationError('future_time');
  return at.toISOString();
}
const softDelete = (db: SqlDriver, table: string) => async (id: string, now: Date = new Date()) => {
  const stamp = now.toISOString();
  await db.run(`UPDATE ${table} SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [stamp, stamp, id]);
};

export function createHealthRepository(db: SqlDriver) {
  const insertRecord = async (childId: string, type: 'symptom' | 'vaccination', at: string, title: string | null, temperature: number | null, notes: string | null, now: Date) => {
    const stamp = now.toISOString();
    await db.run(
      `INSERT INTO health_records (id, child_id, record_type, occurred_at, title, temperature_c, notes, created_at, updated_at, version, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
      [newId(), childId, type, at, title, temperature, notes, stamp, stamp]);
  };
  return {
    async temperatures(childId: string): Promise<TemperatureReading[]> {
      const rows = await db.all<SqlRow>(
        `SELECT id, child_id, occurred_at, temperature_c, notes FROM health_records
         WHERE child_id = ? AND record_type = 'symptom' AND temperature_c IS NOT NULL AND deleted_at IS NULL ORDER BY occurred_at DESC LIMIT 300`, [childId]);
      return rows.map((r) => ({ id: String(r.id), childId: String(r.child_id), at: String(r.occurred_at), temperatureC: Number(r.temperature_c), notes: (r.notes as string | null) ?? null }));
    },
    async addTemperature(childId: string, draft: { at: Date; temperatureC: number; notes?: string | null }, now: Date = new Date()): Promise<void> {
      if (!(draft.temperatureC >= TEMP_MIN && draft.temperatureC <= TEMP_MAX)) throw new ValidationError('invalid_temperature');
      await insertRecord(childId, 'symptom', pastIso(draft.at, now), null, Math.round(draft.temperatureC * 10) / 10, text(draft.notes, 4000), now);
    },
    async vaccinations(childId: string): Promise<Vaccination[]> {
      const rows = await db.all<SqlRow>(
        `SELECT id, child_id, occurred_at, title, notes FROM health_records
         WHERE child_id = ? AND record_type = 'vaccination' AND deleted_at IS NULL ORDER BY occurred_at DESC LIMIT 300`, [childId]);
      return rows.map((r) => ({ id: String(r.id), childId: String(r.child_id), at: String(r.occurred_at), title: String(r.title ?? ''), notes: (r.notes as string | null) ?? null }));
    },
    async addVaccination(childId: string, draft: { at: Date; title: string; notes?: string | null }, now: Date = new Date()): Promise<void> {
      const title = text(draft.title, 160);
      if (!title) throw new ValidationError('missing_title');
      await insertRecord(childId, 'vaccination', pastIso(draft.at, now), title, null, text(draft.notes, 4000), now);
    },
    removeRecord: softDelete(db, 'health_records'),

    async medications(childId: string): Promise<Medication[]> {
      const rows = await db.all<SqlRow>(`SELECT id, child_id, name, dose_text FROM medications WHERE child_id = ? AND deleted_at IS NULL ORDER BY created_at`, [childId]);
      return rows.map((r) => ({ id: String(r.id), childId: String(r.child_id), name: String(r.name), doseText: (r.dose_text as string | null) ?? null }));
    },
    async given(childId: string): Promise<MedicationGiven[]> {
      const rows = await db.all<SqlRow>(
        `SELECT a.id, a.child_id, a.medication_id, m.name, a.given_at, a.dose_text, a.notes
         FROM medication_administrations a JOIN medications m ON m.id = a.medication_id
         WHERE a.child_id = ? AND a.deleted_at IS NULL ORDER BY a.given_at DESC LIMIT 300`, [childId]);
      return rows.map((r) => ({ id: String(r.id), childId: String(r.child_id), medicationId: String(r.medication_id), name: String(r.name), at: String(r.given_at),
        doseText: (r.dose_text as string | null) ?? null, notes: (r.notes as string | null) ?? null }));
    },
    /** Records that a medicine was given. A name that is not on the child's list yet is added to it. */
    async give(childId: string, draft: { name: string; at: Date; doseText?: string | null; notes?: string | null }, now: Date = new Date()): Promise<void> {
      const name = text(draft.name, 120);
      if (!name) throw new ValidationError('missing_title');
      const at = pastIso(draft.at, now);
      const stamp = now.toISOString();
      const dose = text(draft.doseText, 120);
      await db.transaction(async () => {
        const known = await db.all<SqlRow>(`SELECT id FROM medications WHERE child_id = ? AND deleted_at IS NULL AND lower(name) = lower(?)`, [childId, name]);
        let medicationId = known[0] ? String(known[0].id) : null;
        if (!medicationId) {
          medicationId = newId();
          await db.run(
            `INSERT INTO medications (id, child_id, name, dose_text, created_at, updated_at, version, sync_status) VALUES (?, ?, ?, ?, ?, ?, 0, 'pending')`,
            [medicationId, childId, name, dose, stamp, stamp]);
        }
        await db.run(
          `INSERT INTO medication_administrations (id, medication_id, child_id, given_at, dose_text, notes, client_event_id, created_at, updated_at, version, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
          [newId(), medicationId, childId, at, dose, text(draft.notes, 1000), newId(), stamp, stamp]);
      });
    },
    removeGiven: softDelete(db, 'medication_administrations'),

    async visits(childId: string): Promise<Visit[]> {
      const rows = await db.all<SqlRow>(`SELECT id, child_id, kind, title, scheduled_at, location, summary FROM appointments WHERE child_id = ? AND deleted_at IS NULL ORDER BY scheduled_at DESC LIMIT 300`, [childId]);
      return rows.map((r) => ({ id: String(r.id), childId: String(r.child_id), kind: String(r.kind) as VisitKind, title: String(r.title), at: String(r.scheduled_at),
        location: (r.location as string | null) ?? null, summary: (r.summary as string | null) ?? null }));
    },
    /** A visit may be in the future (planned) or in the past (with a summary). */
    async saveVisit(childId: string, draft: { id?: string; kind: VisitKind; title: string; at: Date; location?: string | null; summary?: string | null }, now: Date = new Date()): Promise<void> {
      const title = text(draft.title, 160);
      if (!title) throw new ValidationError('missing_title');
      if (Number.isNaN(draft.at.getTime())) throw new ValidationError('invalid_time');
      const stamp = now.toISOString();
      if (draft.id) {
        await db.run(
          `UPDATE appointments SET kind = ?, title = ?, scheduled_at = ?, location = ?, summary = ?, updated_at = ?,
             sync_status = CASE WHEN sync_status = 'conflict' THEN 'conflict' ELSE 'pending' END WHERE id = ? AND deleted_at IS NULL`,
          [draft.kind, title, draft.at.toISOString(), text(draft.location, 200), text(draft.summary, 4000), stamp, draft.id]);
      } else {
        await db.run(
          `INSERT INTO appointments (id, child_id, kind, title, scheduled_at, location, summary, created_at, updated_at, version, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
          [newId(), childId, draft.kind, title, draft.at.toISOString(), text(draft.location, 200), text(draft.summary, 4000), stamp, stamp]);
      }
    },
    removeVisit: softDelete(db, 'appointments'),
  };
}
export type HealthRepository = ReturnType<typeof createHealthRepository>;
