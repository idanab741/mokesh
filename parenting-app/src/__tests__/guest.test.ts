import { GuestError, guardDriver } from '@/data/db/guest';
import type { SqlDriver } from '@/data/db/driver';

function fake() {
  const ran: string[] = [];
  const raw: SqlDriver = {
    exec: async (sql) => { ran.push(sql); },
    run: async (sql) => { ran.push(sql); },
    all: async () => [],
    transaction: (fn) => fn(),
  };
  return { raw, ran };
}

describe('a visitor without an account', () => {
  it('can read and can keep the app\'s own settings, and cannot change anything else', async () => {
    const { raw, ran } = fake();
    let asked = 0;
    const db = guardDriver(raw, () => true, () => { asked += 1; });
    await db.all('SELECT * FROM children');
    await db.run('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', ['tour_home_done', '1']);
    await expect(db.run('INSERT INTO activity_events (id) VALUES (?)', ['x'])).rejects.toBeInstanceOf(GuestError);
    await expect(db.run('UPDATE children SET name = ?', ['x'])).rejects.toBeInstanceOf(GuestError);
    await expect(db.transaction(() => db.run('DELETE FROM photos WHERE id = ?', ['x']))).rejects.toBeInstanceOf(GuestError);
    await expect(db.exec('DELETE FROM kv; DELETE FROM children')).rejects.toBeInstanceOf(GuestError);
    await expect(db.run('DELETE FROM kv; DELETE FROM children')).rejects.toBeInstanceOf(GuestError);
    expect(ran.filter((s) => !/kv/.test(s))).toEqual([]);
    expect(asked).toBeGreaterThanOrEqual(3);
  });

  it('a member writes as usual', async () => {
    const { raw, ran } = fake();
    const db = guardDriver(raw, () => false, () => { throw new Error('should not ask'); });
    await db.run('UPDATE children SET name = ?', ['x']);
    expect(ran).toHaveLength(1);
  });
});
