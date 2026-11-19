import initSqlJs from 'sql.js';
import { migrate } from '@/data/db/schema';
import { createSqlJsDriver } from '@/data/db/sqljsDriver';
import { createChildrenRepository, createMeasurementsRepository } from '@/data/repositories/children';
import { createEventsRepository } from '@/data/repositories/events';
import { summarizeDay } from '@/domain/summary';
import { createTestDb } from './helpers/testDb';

const local = (s: string) => new Date(s);
const NOW = local('2026-11-19T20:00:00');
const DAY_FROM = local('2026-11-19T00:00:00').toISOString();
const DAY_TO = local('2026-11-20T00:00:00').toISOString();

async function setup() {
  const db = await createTestDb();
  const children = createChildrenRepository(db);
  const events = createEventsRepository(db);
  const alma = await children.create({ name: 'עלמה', birthDate: '2026-05-19', sex: 'female', gestationalWeeks: null, photoUri: null, notes: null }, NOW);
  return { db, children, events, alma };
}

const bottle = (time: string, amountMl: number) =>
  ({ type: 'bottle', occurredAt: local(time).toISOString(), payload: { milkType: 'formula', amountMl } }) as const;

describe('tracking flow (local database)', () => {
  it('a saved bottle appears in the journal and is added to the daily total', async () => {
    const { events, alma } = await setup();
    await events.create(alma.id, bottle('2026-11-19T07:00:00', 120), { now: NOW });
    await events.create(alma.id, bottle('2026-11-19T11:00:00', 90), { now: NOW });

    const today = await events.listInRange(alma.id, DAY_FROM, DAY_TO);
    expect(today.map((e) => e.type)).toEqual(['bottle', 'bottle']);
    const summary = summarizeDay(today, NOW, NOW);
    expect(summary.feeding.count).toBe(2);
    expect(summary.feeding.totalMl).toBe(210);
  });

  it('editing a bottle updates the total; deleting removes it', async () => {
    const { events, alma } = await setup();
    const first = await events.create(alma.id, bottle('2026-11-19T07:00:00', 120), { now: NOW });
    await events.create(alma.id, bottle('2026-11-19T11:00:00', 90), { now: NOW });

    await events.update(first.id, bottle('2026-11-19T07:00:00', 150), NOW);
    let summary = summarizeDay(await events.listInRange(alma.id, DAY_FROM, DAY_TO), NOW, NOW);
    expect(summary.feeding.totalMl).toBe(240);

    await events.remove(first.id, NOW);
    const after = await events.listInRange(alma.id, DAY_FROM, DAY_TO);
    summary = summarizeDay(after, NOW, NOW);
    expect(after).toHaveLength(1);
    expect(summary.feeding).toMatchObject({ count: 1, totalMl: 90 });
    // The row still exists as a tombstone so the deletion can sync.
    expect((await events.getById(first.id))?.deletedAt).not.toBeNull();
  });

  it('refuses invalid input before anything is written', async () => {
    const { events, alma } = await setup();
    await expect(events.create(alma.id, bottle('2026-11-19T07:00:00', -30), { now: NOW })).rejects.toThrow(/invalid_payload:bottle/);
    expect(await events.listRecent(alma.id, 10)).toHaveLength(0);
  });

  it('retrying the same save never creates a duplicate', async () => {
    const { events, alma } = await setup();
    const id = '11111111-1111-4111-8111-111111111111';
    await events.create(alma.id, bottle('2026-11-19T07:00:00', 120), { id, now: NOW });
    await events.create(alma.id, bottle('2026-11-19T07:00:00', 120), { id, now: NOW });
    expect(await events.listRecent(alma.id, 10)).toHaveLength(1);
  });

  it('runs a sleep timer from timestamps and handles sleep across midnight', async () => {
    const { events, alma } = await setup();
    const start = local('2026-11-18T22:00:00');
    const sleep = await events.create(alma.id, { type: 'sleep', occurredAt: start.toISOString(), startedAt: start.toISOString(), endedAt: null, payload: {} }, { now: start });
    expect((await events.getActiveSleep(alma.id))?.id).toBe(sleep.id);

    // Only one running sleep per child.
    await expect(
      events.create(alma.id, { type: 'sleep', occurredAt: start.toISOString(), endedAt: null, payload: {} }, { now: start }),
    ).rejects.toThrow('sleep_already_active');

    // "App closed" for the whole night: nothing ticks, the duration still comes out right.
    const wake = local('2026-11-19T06:30:00');
    await events.endSleep(sleep.id, wake);
    expect(await events.getActiveSleep(alma.id)).toBeNull();

    const today = await events.listInRange(alma.id, DAY_FROM, DAY_TO);
    expect(today).toHaveLength(1); // started yesterday, still listed today
    expect(summarizeDay(today, NOW, NOW).sleep.minutes).toBe(390);
    const yesterday = await events.listInRange(alma.id, local('2026-11-18T00:00:00').toISOString(), DAY_FROM);
    expect(summarizeDay(yesterday, local('2026-11-18T12:00:00'), NOW).sleep.minutes).toBe(120);
  });

  it('keeps each child\'s data separate', async () => {
    const { children, events, alma } = await setup();
    const noam = await children.create({ name: 'נועם', birthDate: '2024-08-01', sex: 'male', gestationalWeeks: null, photoUri: null, notes: null }, NOW);
    await events.create(alma.id, bottle('2026-11-19T07:00:00', 120), { now: NOW });
    await events.create(noam.id, { type: 'diaper', occurredAt: local('2026-11-19T08:00:00').toISOString(), payload: { kind: 'wet' } }, { now: NOW });

    const almaToday = await events.listInRange(alma.id, DAY_FROM, DAY_TO);
    const noamToday = await events.listInRange(noam.id, DAY_FROM, DAY_TO);
    expect(almaToday.map((e) => e.type)).toEqual(['bottle']);
    expect(noamToday.map((e) => e.type)).toEqual(['diaper']);
    expect(almaToday.every((e) => e.childId === alma.id)).toBe(true);
  });

  it('remembers the last bottle amount and the family\'s own food list', async () => {
    const { events, alma } = await setup();
    expect(await events.lastOfType(alma.id, 'bottle')).toBeNull();
    await events.create(alma.id, bottle('2026-11-19T07:00:00', 120), { now: NOW });
    await events.create(alma.id, bottle('2026-11-19T11:00:00', 135), { now: NOW });
    expect((await events.lastOfType(alma.id, 'bottle'))?.payload.amountMl).toBe(135);

    expect(await events.foodHistory(alma.id)).toEqual([]);
    await events.create(alma.id, { type: 'solids', occurredAt: local('2026-11-19T12:00:00').toISOString(), payload: { foods: [{ name: 'אבוקדו', isAllergen: false }] } }, { now: NOW });
    expect((await events.foodHistory(alma.id)).map((f) => f.name)).toEqual(['אבוקדו']);
  });

  it('data survives closing and reopening the database', async () => {
    const SQL = await initSqlJs();
    const raw = new SQL.Database();
    const db = createSqlJsDriver(raw);
    await migrate(db);
    const child = await createChildrenRepository(db).create({ name: 'עלמה', birthDate: '2026-05-19', sex: 'female', gestationalWeeks: 38, photoUri: null, notes: null }, NOW);
    await createEventsRepository(db).create(child.id, bottle('2026-11-19T07:00:00', 120), { now: NOW });
    const file = raw.export();
    raw.close();

    const reopened = createSqlJsDriver(new SQL.Database(file));
    await migrate(reopened); // no-op, must not wipe anything
    const kids = await createChildrenRepository(reopened).list();
    expect(kids).toHaveLength(1);
    expect(kids[0]).toMatchObject({ name: 'עלמה', gestationalWeeks: 38 });
    expect(await createEventsRepository(reopened).listRecent(child.id, 10)).toHaveLength(1);
  });

  it('validates children and measurements', async () => {
    const { db, children, alma } = await setup();
    await expect(children.create({ name: ' ', birthDate: '2026-05-19', sex: 'female', gestationalWeeks: null, photoUri: null, notes: null }, NOW)).rejects.toThrow('name_required');
    await expect(children.create({ name: 'x', birthDate: '2027-05-19', sex: 'female', gestationalWeeks: null, photoUri: null, notes: null }, NOW)).rejects.toThrow('birth_date_future');
    const measurements = createMeasurementsRepository(db);
    await expect(measurements.create(alma.id, { measuredAt: '2026-11-19', weightG: null, lengthMm: null, headCircumferenceMm: null, notes: null }, NOW)).rejects.toThrow('measurement_empty');
    await measurements.create(alma.id, { measuredAt: '2026-11-19', weightG: 7200, lengthMm: 660, headCircumferenceMm: null, notes: null }, NOW);
    expect(await measurements.list(alma.id)).toHaveLength(1);
  });
});
