import { createChildrenRepository } from '@/data/repositories/children';
import { createEventsRepository } from '@/data/repositories/events';
import { createKvStore } from '@/data/repositories/kv';
import { createSyncEngine } from '@/data/sync/engine';
import { createFakeRemote } from './helpers/fakeRemote';
import { createTestDb } from './helpers/testDb';

const NOW = new Date('2026-11-19T20:00:00');
const bottle = (amountMl: number) =>
  ({ type: 'bottle', occurredAt: new Date('2026-11-19T07:00:00').toISOString(), payload: { milkType: 'formula', amountMl } }) as const;

async function device(remote: ReturnType<typeof createFakeRemote>) {
  const db = await createTestDb();
  const children = createChildrenRepository(db);
  const events = createEventsRepository(db);
  const engine = createSyncEngine({ db, kv: createKvStore(db), remote: remote.gateway });
  return { db, children, events, engine };
}

async function deviceWithChild(remote: ReturnType<typeof createFakeRemote>) {
  const d = await device(remote);
  const child = await d.children.create({ name: 'עלמה', birthDate: '2026-05-19', sex: 'female', gestationalWeeks: null, photoUri: null, notes: null }, NOW);
  return { ...d, child };
}

describe('offline-first sync', () => {
  it('keeps writes while offline and uploads them when the connection returns', async () => {
    const remote = createFakeRemote();
    const a = await deviceWithChild(remote);
    remote.state.offline = true;
    await a.events.create(a.child.id, bottle(120), { now: NOW });
    await a.events.create(a.child.id, { type: 'diaper', occurredAt: NOW.toISOString(), payload: { kind: 'wet' } }, { now: NOW });

    const offline = await a.engine.sync();
    expect(offline.failed).toBeGreaterThan(0);
    expect(await a.events.countUnsynced()).toEqual({ pending: 2, conflicts: 0 });
    expect(await a.events.listRecent(a.child.id, 10)).toHaveLength(2); // nothing lost locally

    remote.state.offline = false;
    const online = await a.engine.sync();
    expect(online.failed).toBe(0);
    expect(remote.tables.activity_events.size).toBe(2);
    expect(remote.tables.children.size).toBe(1);
    expect(await a.events.countUnsynced()).toEqual({ pending: 0, conflicts: 0 });
  });

  it('does not duplicate an event when the response to the upload is lost', async () => {
    const remote = createFakeRemote();
    const a = await deviceWithChild(remote);
    await a.engine.sync(); // child is uploaded
    await a.events.create(a.child.id, bottle(120), { now: NOW });
    remote.state.dropNextResponse = true; // server stores the row, device never hears back
    await a.engine.sync();
    expect((await a.events.countUnsynced()).pending).toBe(1);
    await a.engine.sync();
    await a.engine.sync();
    expect(remote.tables.activity_events.size).toBe(1);
    expect((await a.events.countUnsynced()).pending).toBe(0);
  });

  it('a second device receives events, edits and deletions', async () => {
    const remote = createFakeRemote();
    const a = await deviceWithChild(remote);
    const event = await a.events.create(a.child.id, bottle(120), { now: NOW });
    await a.engine.sync();

    const b = await device(remote);
    await b.engine.sync();
    expect((await b.children.list()).map((c) => c.name)).toEqual(['עלמה']);
    expect(await b.events.listRecent(a.child.id, 10)).toHaveLength(1);

    await b.events.update(event.id, bottle(150), NOW);
    await b.engine.sync();
    await a.engine.sync();
    const onA = await a.events.getById(event.id);
    expect(onA?.type === 'bottle' && onA.payload.amountMl).toBe(150);

    await a.events.remove(event.id, NOW);
    await a.engine.sync();
    await b.engine.sync();
    expect(await b.events.listRecent(a.child.id, 10)).toHaveLength(0);
  });

  it('never overwrites silently when two devices edit the same record', async () => {
    const remote = createFakeRemote();
    const a = await deviceWithChild(remote);
    const event = await a.events.create(a.child.id, bottle(120), { now: NOW });
    await a.engine.sync();
    const b = await device(remote);
    await b.engine.sync();

    await a.events.update(event.id, bottle(100), NOW); // parent A fixes the amount offline
    await b.events.update(event.id, bottle(180), NOW); // parent B fixes it differently
    await b.engine.sync(); // B reaches the server first
    const result = await a.engine.sync();

    expect(result.conflicts).toBe(1);
    expect(await a.events.countUnsynced()).toEqual({ pending: 0, conflicts: 1 });
    // A still shows its own value, and the server still has B's: nothing was lost on either side.
    const local = await a.events.getById(event.id);
    expect(local?.type === 'bottle' && local.payload.amountMl).toBe(100);
    expect((remote.tables.activity_events.get(event.id)!.payload as { amountMl: number }).amountMl).toBe(180);
    const theirs = await a.engine.getConflictRemote('activity_events', event.id);
    expect((theirs!.payload as { amountMl: number }).amountMl).toBe(180);

    // The parent chooses to keep their own value.
    await a.engine.resolveConflict('activity_events', event.id, 'mine');
    await a.engine.sync();
    expect((remote.tables.activity_events.get(event.id)!.payload as { amountMl: number }).amountMl).toBe(100);
    expect(await a.events.countUnsynced()).toEqual({ pending: 0, conflicts: 0 });
  });

  it('can resolve a conflict by taking the other device\'s version', async () => {
    const remote = createFakeRemote();
    const a = await deviceWithChild(remote);
    const event = await a.events.create(a.child.id, bottle(120), { now: NOW });
    await a.engine.sync();
    remote.editOnServer('activity_events', event.id, { payload: { milkType: 'formula', amountMl: 200 } });
    await a.events.update(event.id, bottle(90), NOW);
    await a.engine.sync();
    await a.engine.resolveConflict('activity_events', event.id, 'theirs');
    const local = await a.events.getById(event.id);
    expect(local?.type === 'bottle' && local.payload.amountMl).toBe(200);
    expect(local?.syncStatus).toBe('synced');
  });

  it('treats identical edits and double deletes as agreement, not conflict', async () => {
    const remote = createFakeRemote();
    const a = await deviceWithChild(remote);
    const event = await a.events.create(a.child.id, bottle(120), { now: NOW });
    await a.engine.sync();
    remote.editOnServer('activity_events', event.id, { deleted_at: NOW.toISOString() });
    await a.events.remove(event.id, NOW);
    const result = await a.engine.sync();
    expect(result.conflicts).toBe(0);
    expect(await a.events.countUnsynced()).toEqual({ pending: 0, conflicts: 0 });
  });

  it('does not delete a record that another device edited in the meantime', async () => {
    const remote = createFakeRemote();
    const a = await deviceWithChild(remote);
    const event = await a.events.create(a.child.id, bottle(120), { now: NOW });
    await a.engine.sync();
    remote.editOnServer('activity_events', event.id, { payload: { milkType: 'formula', amountMl: 200 } });
    await a.events.remove(event.id, NOW);
    const result = await a.engine.sync();
    expect(result.conflicts).toBe(1);
    expect(remote.tables.activity_events.get(event.id)!.deleted_at).toBeNull();
  });
});
