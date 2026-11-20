import { formatDuration } from '@/lib/time';
import { type ActivityEvent, isActiveSleep, isFeeding } from './activity';
import type { ChildSex } from './age';

export type BabyMood = 'asleep' | 'laughing' | 'happy' | 'sad';

export interface BabyMoodState {
  mood: BabyMood;
  /** The logged fact behind the mood, shown next to the baby. Null for the everyday smile. */
  reason: string | null;
}

/** How long after a feeding or a wake-up the baby keeps laughing. */
const FRESH_MIN = 30;
/** The usual gap is only trusted with this many measured gaps. */
const MIN_GAPS = 6;
/** "Longer than usual" starts this far past the family's own median gap. */
const OVERDUE_FACTOR = 1.3;
/** Past this, the gap is almost always an unlogged feeding rather than the routine. */
const MAX_GAP_MIN = 8 * 60;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const bySex = (sex: ChildSex, female: string, male: string, neutral: string) => (sex === 'female' ? female : sex === 'male' ? male : neutral);

/**
 * The expression of the baby character, decided only by what was logged. It mirrors the
 * diary (a sleep timer is running, a feeding was just logged, the gap since the last
 * feeding is longer than this family's own usual gap). It is not an assessment of the
 * real child and makes no recommendation.
 */
export function babyMood(events: readonly ActivityEvent[], now: Date, sex: ChildSex = 'unspecified'): BabyMoodState {
  const live = events.filter((e) => e.deletedAt === null);
  if (live.some(isActiveSleep)) {
    return { mood: 'asleep', reason: bySex(sex, 'ישנה עכשיו', 'ישן עכשיו', 'בשינה עכשיו') };
  }
  const t = now.getTime();
  const minutesAgo = (iso: string) => (t - Date.parse(iso)) / 60_000;

  const feeds = live.filter(isFeeding).map((e) => Date.parse(e.occurredAt)).filter((x) => x <= t).sort((a, b) => a - b);
  const sinceFeed = feeds.length ? (t - feeds[feeds.length - 1]) / 60_000 : null;
  if (sinceFeed !== null && sinceFeed <= FRESH_MIN) {
    const ago = sinceFeed < 1 ? 'ממש עכשיו' : `לפני ${formatDuration(sinceFeed)}`;
    return { mood: 'laughing', reason: `${bySex(sex, 'אכלה', 'אכל', 'האכלה')} ${ago}` };
  }

  const wakes = live.filter((e) => e.type === 'sleep' && e.endedAt !== null).map((e) => minutesAgo(e.endedAt as string)).filter((m) => m >= 0);
  const sinceWake = wakes.length ? Math.min(...wakes) : null;
  if (sinceWake !== null && sinceWake <= FRESH_MIN) {
    const ago = sinceWake < 1 ? 'ממש עכשיו' : `לפני ${formatDuration(sinceWake)}`;
    return { mood: 'laughing', reason: `${bySex(sex, 'התעוררה', 'התעורר', 'התעוררות')} ${ago}` };
  }

  if (sinceFeed !== null && sinceFeed <= MAX_GAP_MIN) {
    const weekAgo = t - 7 * 24 * 60 * 60_000;
    const recent = feeds.filter((x) => x >= weekAgo);
    const gaps: number[] = [];
    for (let i = 1; i < recent.length; i += 1) {
      const gap = (recent[i] - recent[i - 1]) / 60_000;
      if (gap >= 20 && gap <= MAX_GAP_MIN) gaps.push(gap);
    }
    if (gaps.length >= MIN_GAPS) {
      const typical = Math.round(median(gaps) / 5) * 5;
      if (sinceFeed > typical * OVERDUE_FACTOR) {
        return { mood: 'sad', reason: `${formatDuration(sinceFeed)} מההאכלה האחרונה, אצלכם בדרך כלל כ-${formatDuration(typical)}` };
      }
    }
  }
  return { mood: 'happy', reason: null };
}
