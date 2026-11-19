import { addDays, dayKey, overlapMs, startOfDay } from '@/lib/time';
import type { ActivityEvent } from './activity';

/**
 * Product definition (not a clinical one): "night" is 19:00–07:00 local time.
 * It is shown next to the day/night split so the numbers are never ambiguous.
 */
export const NIGHT_START_HOUR = 19;
export const NIGHT_END_HOUR = 7;

export interface DayBucket {
  key: string;
  date: Date;
  feedCount: number;
  bottleCount: number;
  nursingCount: number;
  bottleMl: number;
  nursingMin: number;
  sleepMin: number;
  nightSleepMin: number;
  daySleepMin: number;
  sleepEpisodes: number;
  /** Minutes after midnight of the first night-time fall-asleep (>= 18:00) on this date, if any. */
  bedtimeMin: number | null;
  diaperCount: number;
  diaperWet: number;
  diaperDirty: number;
  diaperBoth: number;
  solidsCount: number;
  hasData: boolean;
}

export interface RangeStats {
  days: DayBucket[];
  /** Number of days in the range that contain at least one record. */
  daysWithData: number;
  totals: {
    feedCount: number;
    bottleCount: number;
    nursingCount: number;
    bottleMl: number;
    nursingMin: number;
    sleepMin: number;
    nightSleepMin: number;
    daySleepMin: number;
    sleepEpisodes: number;
    diaperCount: number;
    diaperWet: number;
    diaperDirty: number;
    diaperBoth: number;
    solidsCount: number;
  };
  /** Averages are per day *with data*, so an unlogged day does not drag them down. */
  averages: {
    feedsPerDay: number | null;
    bottleMlPerDay: number | null;
    mlPerBottle: number | null;
    sleepMinPerDay: number | null;
    diapersPerDay: number | null;
    solidsPerDay: number | null;
    bedtimeMin: number | null;
  };
  foods: { name: string; count: number; isAllergen: boolean }[];
}

function nightOverlapMs(start: number, end: number, day: Date): number {
  // Night windows touching this calendar day: [00:00–07:00) and [19:00–24:00).
  const d0 = startOfDay(day);
  const morningEnd = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), NIGHT_END_HOUR).getTime();
  const eveningStart = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), NIGHT_START_HOUR).getTime();
  const dayEnd = startOfDay(addDays(d0, 1)).getTime();
  return overlapMs(start, end, d0.getTime(), morningEnd) + overlapMs(start, end, eveningStart, dayEnd);
}

/**
 * Buckets events into local calendar days for [from, to] inclusive.
 * Pure function of its inputs: only recorded events are counted, nothing is estimated.
 */
export function computeRangeStats(events: readonly ActivityEvent[], from: Date, to: Date, now: Date = new Date()): RangeStats {
  const first = startOfDay(from);
  const last = startOfDay(to);
  const days: DayBucket[] = [];
  const index = new Map<string, DayBucket>();
  for (let d = first; d.getTime() <= last.getTime(); d = addDays(d, 1)) {
    const bucket: DayBucket = {
      key: dayKey(d), date: d,
      feedCount: 0, bottleCount: 0, nursingCount: 0, bottleMl: 0, nursingMin: 0,
      sleepMin: 0, nightSleepMin: 0, daySleepMin: 0, sleepEpisodes: 0, bedtimeMin: null,
      diaperCount: 0, diaperWet: 0, diaperDirty: 0, diaperBoth: 0, solidsCount: 0, hasData: false,
    };
    days.push(bucket);
    index.set(bucket.key, bucket);
  }

  const foods = new Map<string, { name: string; count: number; isAllergen: boolean }>();
  const sleepMs = new Map<string, { total: number; night: number }>();

  for (const e of events) {
    if (e.deletedAt !== null) continue;
    const occurred = new Date(e.occurredAt);

    if (e.type === 'sleep') {
      const start = Date.parse(e.startedAt ?? e.occurredAt);
      const end = e.endedAt ? Date.parse(e.endedAt) : now.getTime();
      const startBucket = index.get(dayKey(new Date(start)));
      if (startBucket) {
        startBucket.sleepEpisodes += 1;
        startBucket.hasData = true;
        const startDate = new Date(start);
        const minutes = startDate.getHours() * 60 + startDate.getMinutes();
        if (startDate.getHours() >= 18 && (startBucket.bedtimeMin === null || minutes < startBucket.bedtimeMin)) {
          startBucket.bedtimeMin = minutes;
        }
      }
      // Split the sleep across every calendar day it touches.
      for (let d = startOfDay(new Date(start)); d.getTime() < end; d = addDays(d, 1)) {
        const bucket = index.get(dayKey(d));
        if (!bucket) continue;
        const total = overlapMs(start, end, d.getTime(), startOfDay(addDays(d, 1)).getTime());
        if (total <= 0) continue;
        const acc = sleepMs.get(bucket.key) ?? { total: 0, night: 0 };
        acc.total += total;
        acc.night += nightOverlapMs(start, end, d);
        sleepMs.set(bucket.key, acc);
        bucket.hasData = true;
      }
      continue;
    }

    const bucket = index.get(dayKey(occurred));
    if (!bucket) continue;
    bucket.hasData = true;
    switch (e.type) {
      case 'bottle':
        bucket.feedCount += 1;
        bucket.bottleCount += 1;
        bucket.bottleMl += e.payload.amountMl;
        break;
      case 'nursing':
        bucket.feedCount += 1;
        bucket.nursingCount += 1;
        bucket.nursingMin += Math.round((e.payload.leftSec + e.payload.rightSec) / 60);
        break;
      case 'diaper':
        bucket.diaperCount += 1;
        if (e.payload.kind === 'wet') bucket.diaperWet += 1;
        else if (e.payload.kind === 'dirty') bucket.diaperDirty += 1;
        else bucket.diaperBoth += 1;
        break;
      case 'solids':
        bucket.solidsCount += 1;
        for (const f of e.payload.foods) {
          const k = f.name.trim().toLowerCase();
          const prev = foods.get(k);
          if (prev) {
            prev.count += 1;
            prev.isAllergen = prev.isAllergen || f.isAllergen;
          } else {
            foods.set(k, { name: f.name.trim(), count: 1, isAllergen: f.isAllergen });
          }
        }
        break;
      default:
        break;
    }
  }

  for (const bucket of days) {
    const acc = sleepMs.get(bucket.key);
    if (!acc) continue;
    bucket.sleepMin = Math.round(acc.total / 60_000);
    bucket.nightSleepMin = Math.round(acc.night / 60_000);
    bucket.daySleepMin = Math.max(0, bucket.sleepMin - bucket.nightSleepMin);
  }

  const sum = (pick: (b: DayBucket) => number) => days.reduce((acc, b) => acc + pick(b), 0);
  const totals = {
    feedCount: sum((b) => b.feedCount),
    bottleCount: sum((b) => b.bottleCount),
    nursingCount: sum((b) => b.nursingCount),
    bottleMl: sum((b) => b.bottleMl),
    nursingMin: sum((b) => b.nursingMin),
    sleepMin: sum((b) => b.sleepMin),
    nightSleepMin: sum((b) => b.nightSleepMin),
    daySleepMin: sum((b) => b.daySleepMin),
    sleepEpisodes: sum((b) => b.sleepEpisodes),
    diaperCount: sum((b) => b.diaperCount),
    diaperWet: sum((b) => b.diaperWet),
    diaperDirty: sum((b) => b.diaperDirty),
    diaperBoth: sum((b) => b.diaperBoth),
    solidsCount: sum((b) => b.solidsCount),
  };

  const avgOver = (value: number, dayFilter: (b: DayBucket) => boolean): number | null => {
    const n = days.filter(dayFilter).length;
    return n > 0 ? value / n : null;
  };
  const bedtimes = days.map((b) => b.bedtimeMin).filter((v): v is number => v !== null);

  return {
    days,
    daysWithData: days.filter((b) => b.hasData).length,
    totals,
    averages: {
      feedsPerDay: avgOver(totals.feedCount, (b) => b.feedCount > 0),
      bottleMlPerDay: avgOver(totals.bottleMl, (b) => b.bottleMl > 0),
      mlPerBottle: totals.bottleCount > 0 ? totals.bottleMl / totals.bottleCount : null,
      sleepMinPerDay: avgOver(totals.sleepMin, (b) => b.sleepMin > 0),
      diapersPerDay: avgOver(totals.diaperCount, (b) => b.diaperCount > 0),
      solidsPerDay: avgOver(totals.solidsCount, (b) => b.solidsCount > 0),
      bedtimeMin: bedtimes.length > 0 ? Math.round(bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length) : null,
    },
    foods: [...foods.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'he')),
  };
}

export interface Comparison {
  /** Relative change in percent, or null when the previous period has nothing to compare against. */
  percent: number | null;
  direction: 'up' | 'down' | 'same' | 'none';
}

export function compare(current: number | null, previous: number | null): Comparison {
  if (current === null || previous === null || previous === 0) return { percent: null, direction: 'none' };
  const percent = Math.round(((current - previous) / previous) * 100);
  return { percent, direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'same' };
}

/** The equally long period immediately before [from, to]. */
export function previousRange(from: Date, to: Date): { from: Date; to: Date } {
  const length = Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1;
  return { from: addDays(startOfDay(from), -length), to: addDays(startOfDay(from), -1) };
}

export function formatMinutesOfDay(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
