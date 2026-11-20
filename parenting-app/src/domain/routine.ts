import { type ActivityEvent, type EventOf, isFeeding } from './activity';

/**
 * What the app has learned about this family's own routine, from what they logged in the last
 * two weeks: how far apart feedings usually are, the usual bottle, how long the child is usually
 * awake before the next sleep, how long a daytime sleep usually lasts, and how far apart diaper
 * changes are. Everything is a median of the family's own records. There are no norms, no
 * recommendations and no medical statements here; a value is only given once enough records exist.
 */
export interface Routine {
  /** Days in the window that have at least one record. */
  daysLogged: number;
  feed: {
    /** Usual minutes between feedings; null until there are enough records. */
    gapMin: number | null;
    samples: number;
    lastAt: Date | null;
    /** What the family logs most: decides what the one-tap feeding button offers. */
    usual: 'bottle' | 'nursing' | null;
    /** Usual bottle, when bottles are logged. */
    bottleMl: number | null;
    milkType: EventOf<'bottle'>['payload']['milkType'] | null;
  };
  sleep: {
    /** Usual minutes awake before the next sleep starts. */
    awakeMin: number | null;
    awakeSamples: number;
    /** Usual length of a daytime sleep, minutes. */
    napMin: number | null;
    napSamples: number;
    lastWakeAt: Date | null;
  };
  diaper: { gapMin: number | null; samples: number; lastAt: Date | null };
}

export interface Prediction {
  kind: 'feed' | 'sleep' | 'diaper' | 'wake';
  /** When it usually comes next, by the family's own routine. */
  at: Date;
  /** Negative once that time has passed. */
  minutesUntil: number;
  /** The usual figure the prediction rests on, in minutes. */
  usualMin: number;
  samples: number;
}

const WINDOW_DAYS = 14;
/** A usual value needs at least this many measured gaps. */
export const MIN_SAMPLES = 5;
const MIN = 60_000;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
/** The value that appears most; on a tie, the one logged most recently (the list is newest first). An amount the family really gave, never an average. */
function mostCommon(xs: number[]): number | null {
  let best: number | null = null; let bestN = 0;
  const counts = new Map<number, number>();
  xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  xs.forEach((x) => { const n = counts.get(x) as number; if (n > bestN) { best = x; bestN = n; } });
  return best;
}
const round5 = (min: number) => Math.round(min / 5) * 5;
const usual = (xs: number[]) => (xs.length >= MIN_SAMPLES ? round5(median(xs)) : null);
/** Gaps between sorted times, in minutes, keeping only those inside [lo, hi]. */
function gaps(times: number[], lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < times.length; i += 1) {
    const g = (times[i] - times[i - 1]) / MIN;
    if (g >= lo && g <= hi) out.push(g);
  }
  return out;
}

export function learnRoutine(events: readonly ActivityEvent[], now: Date = new Date()): Routine {
  const t = now.getTime();
  const from = t - WINDOW_DAYS * 24 * 60 * MIN;
  const live = events.filter((e) => e.deletedAt === null && Date.parse(e.occurredAt) >= from && Date.parse(e.occurredAt) <= t + 2 * MIN);
  const at = (e: ActivityEvent) => Date.parse(e.occurredAt);
  const sorted = (list: ActivityEvent[]) => list.map(at).sort((a, b) => a - b);
  const days = new Set(live.map((e) => new Date(at(e)).toDateString()));

  // --- feeding: a gap over 8 hours is almost always an unlogged feeding, not the routine
  const feeds = live.filter(isFeeding);
  const feedTimes = sorted(feeds);
  const feedGaps = gaps(feedTimes, 20, 8 * 60);
  const bottles = feeds.filter((e): e is EventOf<'bottle'> => e.type === 'bottle').sort((a, b) => at(b) - at(a));
  const recentBottles = bottles.slice(0, 10);
  const milkCounts = new Map<string, number>();
  recentBottles.forEach((b) => milkCounts.set(b.payload.milkType, (milkCounts.get(b.payload.milkType) ?? 0) + 1));
  const milkType = [...milkCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as Routine['feed']['milkType'] | undefined;
  const nursingCount = feeds.length - bottles.length;

  // --- sleep: awake windows run from the end of one sleep to the start of the next
  const sleeps = live.filter((e): e is EventOf<'sleep'> => e.type === 'sleep')
    .map((e) => ({ start: Date.parse(e.startedAt ?? e.occurredAt), end: e.endedAt ? Date.parse(e.endedAt) : null }))
    .sort((a, b) => a.start - b.start);
  const awake: number[] = [];
  for (let i = 1; i < sleeps.length; i += 1) {
    const prevEnd = sleeps[i - 1].end;
    if (prevEnd === null) continue;
    const g = (sleeps[i].start - prevEnd) / MIN;
    if (g >= 20 && g <= 8 * 60) awake.push(g);
  }
  // A daytime sleep: it starts between 07:00 and 19:00 and lasts under four hours.
  const naps = sleeps.filter((s) => s.end !== null).map((s) => ({ hour: new Date(s.start).getHours(), min: ((s.end as number) - s.start) / MIN }))
    .filter((s) => s.hour >= 7 && s.hour < 19 && s.min >= 10 && s.min <= 240).map((s) => s.min);
  const ended = sleeps.filter((s) => s.end !== null && (s.end as number) <= t + 2 * MIN);
  const lastWake = ended.length ? Math.max(...ended.map((s) => s.end as number)) : null;

  // --- diapers
  const diaperTimes = sorted(live.filter((e) => e.type === 'diaper'));
  const diaperGaps = gaps(diaperTimes, 15, 8 * 60);

  return {
    daysLogged: days.size,
    feed: {
      gapMin: usual(feedGaps), samples: feedGaps.length,
      lastAt: feedTimes.length ? new Date(feedTimes[feedTimes.length - 1]) : null,
      usual: feeds.length === 0 ? null : nursingCount > bottles.length ? 'nursing' : 'bottle',
      bottleMl: mostCommon(recentBottles.map((b) => b.payload.amountMl)),
      milkType: milkType ?? null,
    },
    sleep: {
      awakeMin: usual(awake), awakeSamples: awake.length,
      napMin: usual(naps), napSamples: naps.length,
      lastWakeAt: lastWake === null ? null : new Date(lastWake),
    },
    diaper: { gapMin: usual(diaperGaps), samples: diaperGaps.length, lastAt: diaperTimes.length ? new Date(diaperTimes[diaperTimes.length - 1]) : null },
  };
}

/**
 * What usually comes next, soonest first. While a sleep is running the only prediction is when
 * the child usually wakes; a prediction that is long past (more than three hours) is dropped,
 * because by then the record is more likely missing than late.
 */
export function predictNext(routine: Routine, now: Date, activeSleepStart: Date | null = null): Prediction[] {
  const t = now.getTime();
  const out: Prediction[] = [];
  const add = (kind: Prediction['kind'], from: Date | null, usualMin: number | null, samples: number) => {
    if (!from || usualMin === null) return;
    const at = new Date(from.getTime() + usualMin * MIN);
    const minutesUntil = Math.round((at.getTime() - t) / MIN);
    if (minutesUntil < -180) return;
    out.push({ kind, at, minutesUntil, usualMin, samples });
  };
  if (activeSleepStart) {
    const hour = activeSleepStart.getHours();
    if (hour >= 7 && hour < 19) add('wake', activeSleepStart, routine.sleep.napMin, routine.sleep.napSamples);
    add('feed', routine.feed.lastAt, routine.feed.gapMin, routine.feed.samples);
    return out.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  add('feed', routine.feed.lastAt, routine.feed.gapMin, routine.feed.samples);
  add('sleep', routine.sleep.lastWakeAt, routine.sleep.awakeMin, routine.sleep.awakeSamples);
  add('diaper', routine.diaper.lastAt, routine.diaper.gapMin, routine.diaper.samples);
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** How many more measured gaps are needed before the first prediction can be made. */
export function samplesUntilLearned(routine: Routine): number {
  const need = [routine.feed.samples, routine.sleep.awakeSamples, routine.diaper.samples].map((n) => Math.max(0, MIN_SAMPLES - n));
  return Math.min(...need);
}
