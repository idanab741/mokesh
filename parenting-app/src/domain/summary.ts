import { addDays, overlapMs, startOfDay } from '@/lib/time';
import type { ActivityEvent, EventOf } from './activity';

export interface DaySummary {
  feeding: {
    count: number;
    bottleCount: number;
    nursingCount: number;
    totalMl: number;
    nursingMinutes: number;
    last: EventOf<'bottle'> | EventOf<'nursing'> | null;
  };
  sleep: {
    /** Minutes of sleep that fall inside this calendar day (sleeps crossing midnight are split). */
    minutes: number;
    episodes: number;
    last: EventOf<'sleep'> | null;
    active: EventOf<'sleep'> | null;
  };
  diaper: {
    count: number;
    wet: number;
    dirty: number;
    last: EventOf<'diaper'> | null;
  };
  solids: {
    count: number;
    last: EventOf<'solids'> | null;
  };
}

const byTimeDesc = (a: ActivityEvent, b: ActivityEvent) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt);

/**
 * Summarises one local calendar day.
 * `events` may contain more than the day (e.g. a sleep that started yesterday); anything
 * outside the day is ignored, and sleep is clipped to the day's boundaries.
 */
export function summarizeDay(events: readonly ActivityEvent[], day: Date, now: Date = new Date()): DaySummary {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = startOfDay(addDays(day, 1)).getTime();
  const live = events.filter((e) => e.deletedAt === null).sort(byTimeDesc);
  const inDay = (e: ActivityEvent) => {
    const t = Date.parse(e.occurredAt);
    return t >= dayStart && t < dayEnd;
  };

  const summary: DaySummary = {
    feeding: { count: 0, bottleCount: 0, nursingCount: 0, totalMl: 0, nursingMinutes: 0, last: null },
    sleep: { minutes: 0, episodes: 0, last: null, active: null },
    diaper: { count: 0, wet: 0, dirty: 0, last: null },
    solids: { count: 0, last: null },
  };

  let sleepMs = 0;
  for (const e of live) {
    if (e.type === 'sleep') {
      const start = Date.parse(e.startedAt ?? e.occurredAt);
      const end = e.endedAt ? Date.parse(e.endedAt) : now.getTime();
      const inside = overlapMs(start, end, dayStart, dayEnd);
      if (e.endedAt === null && !summary.sleep.active) summary.sleep.active = e;
      if (inside > 0 || inDay(e)) {
        sleepMs += inside;
        summary.sleep.episodes += 1;
        if (!summary.sleep.last) summary.sleep.last = e;
      }
      continue;
    }
    if (!inDay(e)) continue;
    switch (e.type) {
      case 'bottle':
        summary.feeding.count += 1;
        summary.feeding.bottleCount += 1;
        summary.feeding.totalMl += e.payload.amountMl;
        if (!summary.feeding.last) summary.feeding.last = e;
        break;
      case 'nursing':
        summary.feeding.count += 1;
        summary.feeding.nursingCount += 1;
        summary.feeding.nursingMinutes += Math.round((e.payload.leftSec + e.payload.rightSec) / 60);
        if (!summary.feeding.last) summary.feeding.last = e;
        break;
      case 'diaper':
        summary.diaper.count += 1;
        if (e.payload.kind !== 'dirty') summary.diaper.wet += 1;
        if (e.payload.kind !== 'wet') summary.diaper.dirty += 1;
        if (!summary.diaper.last) summary.diaper.last = e;
        break;
      case 'solids':
        summary.solids.count += 1;
        if (!summary.solids.last) summary.solids.last = e;
        break;
      default:
        break;
    }
  }
  summary.sleep.minutes = Math.round(sleepMs / 60_000);
  return summary;
}

/** Events to show on a given day's timeline: those that occurred in it, plus sleeps overlapping it. */
export function eventsForDay(events: readonly ActivityEvent[], day: Date, now: Date = new Date()): ActivityEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = startOfDay(addDays(day, 1)).getTime();
  return events
    .filter((e) => {
      if (e.deletedAt !== null) return false;
      const t = Date.parse(e.occurredAt);
      if (t >= dayStart && t < dayEnd) return true;
      if (e.type !== 'sleep') return false;
      const start = Date.parse(e.startedAt ?? e.occurredAt);
      const end = e.endedAt ? Date.parse(e.endedAt) : now.getTime();
      return overlapMs(start, end, dayStart, dayEnd) > 0;
    })
    .sort(byTimeDesc);
}
