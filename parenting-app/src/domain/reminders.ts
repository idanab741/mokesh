/**
 * Reminders a parent sets for themselves. The app only keeps time: it reminds at the hour the
 * parent chose, after the gap the parent chose since the last thing they logged, or before a
 * visit they entered. It never decides when a feeding, a medicine or anything else is due.
 */
export interface DailyReminder { id: string; title: string; hour: number; minute: number }
export interface ReminderSettings {
  /** Hours after the last logged feeding; null when off. */
  feedAfterHours: number | null;
  /** Hours after the last logged diaper; null when off. */
  diaperAfterHours: number | null;
  /** The evening before a visit and the morning of it. */
  visits: boolean;
  daily: DailyReminder[];
}
export const DEFAULT_REMINDERS: ReminderSettings = { feedAfterHours: null, diaperAfterHours: null, visits: true, daily: [] };

export const GAP_CHOICES = [2, 2.5, 3, 3.5, 4, 5, 6] as const;
export const EVENING_BEFORE_HOUR = 19;
export const MORNING_OF_HOUR = 7;

export function parseReminders(raw: string | null | undefined): ReminderSettings {
  if (!raw) return DEFAULT_REMINDERS;
  try {
    const v = JSON.parse(raw) as Partial<ReminderSettings>;
    const gap = (n: unknown) => (typeof n === 'number' && n >= 0.5 && n <= 12 ? n : null);
    const daily = Array.isArray(v.daily) ? v.daily.filter((d): d is DailyReminder =>
      !!d && typeof d.id === 'string' && typeof d.title === 'string' && d.title.trim() !== ''
      && Number.isInteger(d.hour) && d.hour >= 0 && d.hour <= 23 && Number.isInteger(d.minute) && d.minute >= 0 && d.minute <= 59) : [];
    return { feedAfterHours: gap(v.feedAfterHours), diaperAfterHours: gap(v.diaperAfterHours), visits: v.visits !== false, daily: daily.slice(0, 12) };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export type ReminderKind = 'feed' | 'diaper' | 'visit' | 'daily';
export interface Reminder {
  /** Stable for one occurrence, so "done" and "seen" can be remembered for it. */
  key: string;
  kind: ReminderKind;
  title: string;
  body: string;
  at: Date;
}

export interface ReminderFacts {
  lastFeedAt: Date | null;
  lastDiaperAt: Date | null;
  /** True while a sleep is running: nobody wants "time to feed" over a sleeping baby. */
  asleep: boolean;
  visits: readonly { id: string; title: string; at: Date }[];
  /** Keys the parent marked as done or dismissed. */
  dismissed: ReadonlySet<string>;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const clockText = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
const hoursText = (h: number) => (h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${String(h).replace('.5', ' וחצי')} שעות`);
const atClock = (day: Date, h: number, m = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);

/**
 * Every reminder from the start of today to `horizonHours` ahead, soonest first, without the
 * ones the parent dismissed. A reminder whose time has come is "due"; the rest are upcoming.
 */
export function listReminders(settings: ReminderSettings, facts: ReminderFacts, now: Date, horizonHours = 36): Reminder[] {
  const out: Reminder[] = [];
  const end = now.getTime() + horizonHours * 3_600_000;
  const startOfToday = atClock(now, 0).getTime();
  const add = (r: Reminder) => { if (!facts.dismissed.has(r.key) && r.at.getTime() <= end && r.at.getTime() >= startOfToday) out.push(r); };

  if (settings.feedAfterHours && facts.lastFeedAt && !facts.asleep) {
    const at = new Date(facts.lastFeedAt.getTime() + settings.feedAfterHours * 3_600_000);
    add({ key: `feed:${facts.lastFeedAt.getTime()}`, kind: 'feed', title: 'האכלה', body: `עברו ${hoursText(settings.feedAfterHours)} מההאכלה האחרונה שתועדה`, at });
  }
  if (settings.diaperAfterHours && facts.lastDiaperAt && !facts.asleep) {
    const at = new Date(facts.lastDiaperAt.getTime() + settings.diaperAfterHours * 3_600_000);
    add({ key: `diaper:${facts.lastDiaperAt.getTime()}`, kind: 'diaper', title: 'חיתול', body: `עברו ${hoursText(settings.diaperAfterHours)} מהחיתול האחרון שתועד`, at });
  }
  if (settings.visits) {
    for (const v of facts.visits) {
      if (v.at.getTime() < now.getTime()) continue;
      const eve = atClock(new Date(v.at.getTime() - 86_400_000), EVENING_BEFORE_HOUR);
      const morning = atClock(v.at, MORNING_OF_HOUR);
      const time = clockText(v.at.getHours(), v.at.getMinutes());
      add({ key: `visit-eve:${v.id}:${dayKey(v.at)}`, kind: 'visit', title: v.title, body: `מחר ב-${time}`, at: eve });
      if (morning.getTime() < v.at.getTime()) add({ key: `visit-day:${v.id}:${dayKey(v.at)}`, kind: 'visit', title: v.title, body: `היום ב-${time}`, at: morning });
    }
  }
  for (const d of settings.daily) {
    for (const day of [now, new Date(now.getTime() + 86_400_000)]) {
      add({ key: `daily:${d.id}:${dayKey(day)}`, kind: 'daily', title: d.title, body: `כל יום ב-${clockText(d.hour, d.minute)}`, at: atClock(day, d.hour, d.minute) });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export const isDue = (r: Reminder, now: Date) => r.at.getTime() <= now.getTime();

/** Dismissed keys are kept for two days, then forgotten. */
export function pruneDismissed(entries: Record<string, number>, now: Date): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, t] of Object.entries(entries)) if (now.getTime() - t < 2 * 86_400_000) out[k] = t;
  return out;
}
