import { addDays, dayKey, formatDuration, startOfDay } from '@/lib/time';
import type { ActivityEvent, ActivityType } from './activity';
import { computeRangeStats } from './stats';

export interface Insight {
  id: string;
  tone: ActivityType;
  title: string;
  body: string;
  /** What the statement is computed from, shown to the parent under every insight. */
  basis: string;
}

const MIN_DAYS = 3;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const daysHe = (n: number) => (n === 1 ? 'יום אחד' : `${n} ימים`);

/**
 * Observations about the child's own routine, computed only from what was logged in the
 * last week. Every insight is a measured fact compared with the family's own numbers.
 * There are deliberately no recommendations, no norms and no medical statements here.
 */
export function buildInsights(events: readonly ActivityEvent[], now: Date = new Date()): Insight[] {
  const live = events.filter((e) => e.deletedAt === null);
  const today = startOfDay(now);
  const weekFrom = addDays(today, -7);
  const yesterday = addDays(today, -1);
  // The seven full days before today: the family's own baseline.
  const week = computeRangeStats(live, weekFrom, yesterday, now);
  const todayStats = computeRangeStats(live, today, today, now).days[0];
  const out: Insight[] = [];

  // --- Feeding rhythm ---------------------------------------------------------
  const feeds = live.filter((e) => e.type === 'bottle' || e.type === 'nursing').map((e) => Date.parse(e.occurredAt))
    .filter((t) => t >= weekFrom.getTime() && t <= now.getTime()).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < feeds.length; i += 1) {
    const gap = (feeds[i] - feeds[i - 1]) / 60_000;
    // Gaps longer than 8 hours are almost always an unlogged feeding, not the routine.
    if (gap >= 20 && gap <= 8 * 60) gaps.push(gap);
  }
  if (feeds.length > 0 && gaps.length >= 6) {
    const typical = Math.round(median(gaps) / 5) * 5;
    const since = Math.round((now.getTime() - feeds[feeds.length - 1]) / 60_000);
    out.push({
      id: 'feed-rhythm', tone: 'bottle',
      title: `בין האכלות עוברות בדרך כלל כ-${formatDuration(typical)}`,
      body: `ההאכלה האחרונה תועדה לפני ${formatDuration(since)}.`,
      basis: `חציון של ${gaps.length} מרווחים בין האכלות בשבוע האחרון`,
    });
  }

  // --- Bottle volume: yesterday against the family's own average -----------------
  const bottleDays = week.days.filter((d) => d.bottleMl > 0);
  const y = week.days.find((d) => d.key === dayKey(yesterday));
  if (bottleDays.length >= MIN_DAYS && y && y.bottleMl > 0 && week.averages.bottleMlPerDay) {
    const avg = Math.round(week.averages.bottleMlPerDay);
    const diff = y.bottleMl - avg;
    const rel = Math.abs(diff) / avg;
    out.push({
      id: 'bottle-yesterday', tone: 'bottle',
      title: `אתמול: ${y.bottleMl} מ״ל בבקבוק`,
      body: rel < 0.08 ? `קרוב מאוד לממוצע היומי שלכם (${avg} מ״ל).`
        : `${Math.abs(diff)} מ״ל ${diff > 0 ? 'יותר' : 'פחות'} מהממוצע היומי שלכם (${avg} מ״ל).`,
      basis: `ממוצע של ${daysHe(bottleDays.length)} עם בקבוק בשבוע האחרון`,
    });
  }

  // --- Sleep: yesterday against the average, and the longest stretch -----------
  const sleepDays = week.days.filter((d) => d.sleepMin > 0);
  if (sleepDays.length >= MIN_DAYS && y && y.sleepMin > 0 && week.averages.sleepMinPerDay) {
    const avg = week.averages.sleepMinPerDay;
    const diff = Math.round(y.sleepMin - avg);
    out.push({
      id: 'sleep-yesterday', tone: 'sleep',
      title: `אתמול: ${formatDuration(y.sleepMin)} של שינה מתועדת`,
      body: Math.abs(diff) < 20 ? `כמעט זהה לממוצע היומי שלכם (${formatDuration(avg)}).`
        : `${formatDuration(Math.abs(diff))} ${diff > 0 ? 'יותר' : 'פחות'} מהממוצע היומי שלכם (${formatDuration(avg)}).`,
      basis: `ממוצע של ${daysHe(sleepDays.length)} עם שינה מתועדת בשבוע האחרון`,
    });
  }
  const dayAgo = now.getTime() - 24 * 60 * 60_000;
  let longest = 0;
  for (const e of live) {
    if (e.type !== 'sleep' || !e.endedAt) continue;
    const start = Date.parse(e.startedAt ?? e.occurredAt);
    const end = Date.parse(e.endedAt);
    if (end >= dayAgo && end <= now.getTime()) longest = Math.max(longest, (end - start) / 60_000);
  }
  if (longest >= 60) {
    out.push({
      id: 'sleep-longest', tone: 'sleep',
      title: `רצף השינה הארוך ביממה האחרונה: ${formatDuration(longest)}`,
      body: 'נמדד משעת ההירדמות ועד ההתעוררות שתועדו.',
      basis: 'פרקי שינה שהסתיימו ב-24 השעות האחרונות',
    });
  }
  if (week.averages.bedtimeMin !== null && week.days.filter((d) => d.bedtimeMin !== null).length >= MIN_DAYS) {
    const m = week.averages.bedtimeMin;
    out.push({
      id: 'bedtime', tone: 'sleep',
      title: `שעת ההירדמות בערב: בסביבות ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
      body: 'ממוצע ההירדמות הראשונה אחרי 18:00.',
      basis: `${daysHe(week.days.filter((d) => d.bedtimeMin !== null).length)} בשבוע האחרון`,
    });
  }

  // --- Diapers ------------------------------------------------------------------
  const diaperDays = week.days.filter((d) => d.diaperCount > 0);
  if (diaperDays.length >= MIN_DAYS && week.averages.diapersPerDay && todayStats.diaperCount > 0) {
    out.push({
      id: 'diapers-today', tone: 'diaper',
      title: `היום עד עכשיו: ${todayStats.diaperCount === 1 ? 'החלפה אחת' : `${todayStats.diaperCount} החלפות`}`,
      body: `ביום שלם אתם מתעדים בממוצע ${Math.round(week.averages.diapersPerDay * 10) / 10} החלפות.`,
      basis: `ממוצע של ${daysHe(diaperDays.length)} בשבוע האחרון`,
    });
  }

  // --- New foods this week --------------------------------------------------------
  const before = new Set<string>();
  const fresh = new Map<string, string>();
  for (const e of [...live].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))) {
    if (e.type !== 'solids') continue;
    for (const f of e.payload.foods) {
      const k = f.name.trim().toLowerCase();
      if (Date.parse(e.occurredAt) < weekFrom.getTime()) before.add(k);
      else if (!before.has(k) && !fresh.has(k)) fresh.set(k, f.name.trim());
    }
  }
  if (fresh.size > 0 && before.size > 0) {
    const names = [...fresh.values()];
    out.push({
      id: 'new-foods', tone: 'solids',
      title: names.length === 1 ? `מזון חדש השבוע: ${names[0]}` : `${names.length} מזונות חדשים השבוע`,
      body: names.length === 1 ? 'תועד לראשונה בשבעת הימים האחרונים.' : names.slice(0, 5).join(', '),
      basis: 'השוואה לכל המזונות שתועדו קודם',
    });
  }

  return out;
}

/** How many more days of logging are needed before patterns can be shown. */
export function daysUntilInsights(events: readonly ActivityEvent[], now: Date = new Date()): number {
  const today = startOfDay(now);
  const week = computeRangeStats(events.filter((e) => e.deletedAt === null), addDays(today, -7), addDays(today, -1), now);
  return Math.max(0, MIN_DAYS - week.daysWithData);
}
