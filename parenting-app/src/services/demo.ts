import type { SqlDriver } from '@/data/db/driver';
import { createChildrenRepository, createMeasurementsRepository } from '@/data/repositories/children';
import { createEventsRepository } from '@/data/repositories/events';
import type { KvStore } from '@/data/repositories/kv';
import { createMilestonesRepository } from '@/data/repositories/milestones';
import { dayKey } from '@/lib/time';

const KEY = 'demo_child_id';
const TABLES = ['activity_events', 'measurements', 'milestones', 'health_records', 'medication_administrations', 'medications', 'appointments', 'photos'];

/**
 * The example child a visitor without an account looks at: a baby girl with two weeks of an
 * ordinary diary. It lives only on this device, is never uploaded, and is removed the moment
 * someone signs in.
 */
export async function seedDemo(db: SqlDriver, kv: KvStore, now: Date = new Date()): Promise<string> {
  const existing = await kv.get(KEY);
  if (existing && (await db.all('SELECT id FROM children WHERE id = ? AND deleted_at IS NULL', [existing])).length > 0) return existing;
  const children = createChildrenRepository(db);
  const events = createEventsRepository(db);
  const birth = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate() - 3);
  const child = await children.create({ name: 'עלמה', birthDate: dayKey(birth), sex: 'female', gestationalWeeks: null, photoUri: null, notes: null });
  await kv.set(KEY, child.id);
  const at = (daysAgo: number, h: number, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m);
  for (let d = 13; d >= 0; d -= 1) {
    const add = async (h: number, m: number, make: (t: Date) => Parameters<typeof events.create>[1]) => {
      const t = at(d, h, m);
      if (t.getTime() < now.getTime() - 60_000) await events.create(child.id, make(t));
    };
    const night = at(d, 20, 15);
    if (d > 0) await events.create(child.id, { type: 'sleep', occurredAt: night.toISOString(), startedAt: night.toISOString(), endedAt: at(d - 1, 6, 10 + (d % 3) * 10).toISOString(), payload: {} });
    for (const [h, m, ml] of [[6, 30, 150], [9, 40, 120], [12, 50, 150], [16, 5, 120], [19, 30, 180]] as const) {
      await add(h, m + (d % 2) * 5, (t) => ({ type: 'bottle', occurredAt: t.toISOString(), payload: { amountMl: ml, milkType: 'formula' } }));
    }
    for (const [h, len] of [[10, 55], [14, 80]] as const) {
      const s = at(d, h, 20); const e = new Date(s.getTime() + len * 60_000);
      if (e.getTime() < now.getTime() - 60_000) await events.create(child.id, { type: 'sleep', occurredAt: s.toISOString(), startedAt: s.toISOString(), endedAt: e.toISOString(), payload: {} });
    }
    for (const [h, m, kind] of [[6, 45, 'wet'], [10, 0, 'dirty'], [13, 10, 'wet'], [16, 30, 'both'], [19, 45, 'wet']] as const) {
      await add(h, m, (t) => ({ type: 'diaper', occurredAt: t.toISOString(), payload: { kind } }));
    }
    if (d % 2 === 0) await add(12, 15, (t) => ({ type: 'solids', occurredAt: t.toISOString(), payload: { foods: [{ name: d % 4 === 0 ? 'בטטה' : 'אבוקדו', isAllergen: false }], amount: 'little' } }));
  }
  const measurements = createMeasurementsRepository(db);
  await measurements.create(child.id, { measuredAt: dayKey(at(60, 12)), weightG: 6400, lengthMm: 620, headCircumferenceMm: null, notes: null });
  await measurements.create(child.id, { measuredAt: dayKey(at(5, 12)), weightG: 7300, lengthMm: 660, headCircumferenceMm: null, notes: null });
  const milestones = createMilestonesRepository(db);
  for (const [key, title, days] of [['holds_head', 'מרימה את הראש', 120], ['rolls_over', 'מתהפכת', 40]] as const) {
    await milestones.markCatalog(child.id, key, { title, achievedOn: dayKey(at(days, 12)) }).catch(() => undefined);
  }
  return child.id;
}

export async function demoChildId(kv: KvStore): Promise<string | null> { return kv.get(KEY); }

/** Removes the example child and everything that belongs to it. True when there was one. */
export async function wipeDemo(db: SqlDriver, kv: KvStore): Promise<boolean> {
  const id = await kv.get(KEY);
  if (!id) return false;
  await db.transaction(async () => {
    for (const t of TABLES) await db.run(`DELETE FROM ${t} WHERE child_id = ?`, [id]);
    await db.run('DELETE FROM photo_files WHERE photo_id NOT IN (SELECT id FROM photos)');
    await db.run('DELETE FROM children WHERE id = ?', [id]);
  });
  await kv.remove(KEY);
  return true;
}
