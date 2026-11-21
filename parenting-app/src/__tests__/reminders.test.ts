import { DEFAULT_REMINDERS, type ReminderFacts, isDue, listReminders, parseReminders, pruneDismissed } from '@/domain/reminders';

const now = new Date(2026, 10, 21, 10, 0);
const facts = (over: Partial<ReminderFacts> = {}): ReminderFacts => ({ lastFeedAt: null, lastDiaperAt: null, asleep: false, visits: [], dismissed: new Set(), ...over });

describe('reminders', () => {
  it('reminds the chosen gap after the last logged feeding, and not while asleep', () => {
    const s = { ...DEFAULT_REMINDERS, feedAfterHours: 3 };
    const [r] = listReminders(s, facts({ lastFeedAt: new Date(2026, 10, 21, 8, 0) }), now);
    expect(r?.kind).toBe('feed');
    expect(r?.at).toEqual(new Date(2026, 10, 21, 11, 0));
    expect(isDue(r!, now)).toBe(false);
    expect(isDue(r!, new Date(2026, 10, 21, 11, 0))).toBe(true);
    expect(listReminders(s, facts({ lastFeedAt: new Date(2026, 10, 21, 8, 0), asleep: true }), now)).toEqual([]);
  });

  it('is silent when nothing is switched on or nothing was logged', () => {
    expect(listReminders(DEFAULT_REMINDERS, facts({ lastFeedAt: now }), now)).toEqual([]);
    expect(listReminders({ ...DEFAULT_REMINDERS, feedAfterHours: 3 }, facts(), now)).toEqual([]);
  });

  it('reminds the evening before a visit and the morning of it', () => {
    const visit = { id: 'v1', title: 'טיפת חלב', at: new Date(2026, 10, 22, 9, 30) };
    const list = listReminders(DEFAULT_REMINDERS, facts({ visits: [visit] }), now);
    expect(list.map((r) => r.at)).toEqual([new Date(2026, 10, 21, 19, 0), new Date(2026, 10, 22, 7, 0)]);
    expect(list[0]?.body).toBe('מחר ב-09:30');
    expect(listReminders({ ...DEFAULT_REMINDERS, visits: false }, facts({ visits: [visit] }), now)).toEqual([]);
  });

  it('lists a daily reminder for today and tomorrow, and drops a dismissed one', () => {
    const s = { ...DEFAULT_REMINDERS, daily: [{ id: 'd1', title: 'ויטמין D', hour: 8, minute: 0 }] };
    const list = listReminders(s, facts(), now);
    expect(list.map((r) => r.key)).toEqual(['daily:d1:2026-11-21', 'daily:d1:2026-11-22']);
    expect(isDue(list[0]!, now)).toBe(true);
    const after = listReminders(s, facts({ dismissed: new Set(['daily:d1:2026-11-21']) }), now);
    expect(after.map((r) => r.key)).toEqual(['daily:d1:2026-11-22']);
  });

  it('reads saved settings defensively', () => {
    expect(parseReminders(null)).toEqual(DEFAULT_REMINDERS);
    expect(parseReminders('{bad')).toEqual(DEFAULT_REMINDERS);
    const s = parseReminders(JSON.stringify({ feedAfterHours: 99, diaperAfterHours: 3, daily: [{ id: 'a', title: ' ', hour: 8, minute: 0 }, { id: 'b', title: 'ברזל', hour: 20, minute: 30 }] }));
    expect(s.feedAfterHours).toBeNull();
    expect(s.diaperAfterHours).toBe(3);
    expect(s.daily).toEqual([{ id: 'b', title: 'ברזל', hour: 20, minute: 30 }]);
  });

  it('forgets dismissed keys after two days', () => {
    expect(pruneDismissed({ old: now.getTime() - 3 * 86_400_000, fresh: now.getTime() - 3_600_000 }, now)).toEqual({ fresh: now.getTime() - 3_600_000 });
  });
});
