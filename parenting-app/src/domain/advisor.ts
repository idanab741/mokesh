import type { ChildSex } from './age';
import type { Prediction, Routine } from './routine';
import type { SterilizeState } from './sterilize';
import { formatDuration, formatTime } from '@/lib/time';

/**
 * What the companion says at the top of Home. It only restates what the family logged and how
 * that compares with this family's own routine, and suggests what to log next. It never gives
 * medical or care advice, and it always has something to say, also on an empty day.
 */
export type MascotPose = 'wave' | 'point' | 'think' | 'cheer' | 'sleep' | 'heart';
export type AdviceAction = 'feed' | 'sleep' | 'diaper' | 'sterilize' | 'moments';
export interface Advice { id: string; pose: MascotPose; text: string; action?: { label: string; kind: AdviceAction } }

export interface AdviceInput {
  childName: string; sex: ChildSex; now: Date;
  eventsToday: number; totalEvents: number;
  asleepMin: number | null;
  awakeMin: number | null;
  routine: Routine; predictions: Prediction[];
  sterilize: SterilizeState | null; usesBottles: boolean;
  moments: { count: number; latestTitle: string | null; latestDaysAgo: number | null };
  sleepTodayMin: number; usualSleepMin: number | null;
}

const her = (sex: ChildSex, f: string, m: string, n: string) => (sex === 'female' ? f : sex === 'male' ? m : n);

export function buildAdvice(i: AdviceInput): Advice {
  const { childName: name, sex, now } = i;
  const next = (kind: Prediction['kind']) => i.predictions.find((p) => p.kind === kind);

  if (i.totalEvents === 0) {
    return { id: 'welcome', pose: 'wave', text: `נעים מאוד, אני לילי. אני אלווה אתכם ואת ${name}. נתחיל מהדבר האחרון שקרה: האכלה, שינה או חיתול?`, action: { label: 'תיעוד ראשון', kind: 'feed' } };
  }
  if (i.asleepMin !== null) {
    const wake = next('wake');
    return { id: 'asleep', pose: 'sleep', text: `ששש… ${name} ${her(sex, 'ישנה', 'ישן', 'בשינה')} כבר ${formatDuration(i.asleepMin)}.${wake ? ` שנת יום אצלכם נמשכת בדרך כלל ${formatDuration(wake.usualMin)}.` : ''}`, action: { label: 'סיום שינה', kind: 'sleep' } };
  }
  if (i.eventsToday === 0) {
    return { id: 'empty-day', pose: 'wave', text: `${now.getHours() < 12 ? 'בוקר טוב' : 'שלום'}! עוד לא תיעדנו כלום היום. נתחיל מההאכלה האחרונה?`, action: { label: 'תיעוד האכלה', kind: 'feed' } };
  }
  // Something the family's own routine expects about now, the closest first.
  const due = i.predictions.filter((p) => p.kind !== 'wake' && p.minutesUntil <= 20).sort((a, b) => a.minutesUntil - b.minutesUntil)[0];
  if (due?.kind === 'sleep' && i.awakeMin !== null) {
    return { id: 'due-sleep', pose: 'point', text: `${name} ${her(sex, 'ערה', 'ער', 'בערות')} כבר ${formatDuration(i.awakeMin)}. אצלכם ${her(sex, 'היא נרדמת', 'הוא נרדם', 'נרדמים')} בדרך כלל אחרי ${formatDuration(due.usualMin)}.`, action: { label: 'התחלת שינה', kind: 'sleep' } };
  }
  if (due?.kind === 'feed') {
    return { id: 'due-feed', pose: 'point', text: `ההאכלה הבאה אצלכם מגיעה בדרך כלל בסביבות ${formatTime(due.at)}, כל ${formatDuration(due.usualMin)} בערך.`, action: { label: 'תיעוד האכלה', kind: 'feed' } };
  }
  if (due?.kind === 'diaper') {
    return { id: 'due-diaper', pose: 'point', text: `עבר כבר הזמן הרגיל שלכם בין החלפות (${formatDuration(due.usualMin)}). אולי הוחלף ולא תועד?`, action: { label: 'תיעוד חיתול', kind: 'diaper' } };
  }
  if (i.usesBottles && i.sterilize && i.sterilize.bottles > 0 && i.sterilize.cleanBottles <= 1) {
    return { id: 'sterilize-low', pose: 'think', text: i.sterilize.cleanBottles === 0 ? 'לפי התיעוד, כל הבקבוקים מהעיקור האחרון כבר בשימוש.' : 'לפי התיעוד נשאר בקבוק נקי אחד מהעיקור האחרון.', action: { label: 'עיקרתי', kind: 'sterilize' } };
  }
  if (i.usesBottles && !i.sterilize) {
    return { id: 'sterilize-start', pose: 'think', text: 'רוצים שאזכור בשבילכם מתי עוקרו הבקבוקים וכמה נקיים נשארו?', action: { label: 'תיעוד עיקור', kind: 'sterilize' } };
  }
  if (i.moments.latestTitle && i.moments.latestDaysAgo !== null && i.moments.latestDaysAgo <= 3) {
    return { id: 'moment-new', pose: 'cheer', text: `${i.moments.latestTitle}${i.moments.latestDaysAgo === 0 ? ' היום' : i.moments.latestDaysAgo === 1 ? ' אתמול' : ` לפני ${i.moments.latestDaysAgo} ימים`}! איזה רגע. יש עוד משהו חדש לאלבום?`, action: { label: 'הוספת רגע', kind: 'moments' } };
  }
  if (i.moments.count === 0) {
    return { id: 'moment-first', pose: 'heart', text: `האלבום של ${name} עוד ריק. מה היה הרגע האחרון שהתרגשתם ממנו?`, action: { label: 'הוספת רגע', kind: 'moments' } };
  }
  if (now.getHours() >= 17 && i.usualSleepMin !== null && Math.abs(i.sleepTodayMin - i.usualSleepMin) >= 45) {
    const less = i.sleepTodayMin < i.usualSleepMin;
    return { id: 'sleep-diff', pose: 'think', text: `היום ${name} ${her(sex, 'ישנה', 'ישן', 'בשינה')} ${less ? 'פחות' : 'יותר'} מהרגיל שלכם: ${formatDuration(i.sleepTodayMin)} מול ${formatDuration(i.usualSleepMin)} בדרך כלל.` };
  }
  const learned = [i.routine.feed.gapMin, i.routine.sleep.awakeMin, i.routine.diaper.gapMin].filter((v) => v !== null).length;
  if (learned < 3) {
    return { id: 'learning', pose: 'think', text: 'אני עדיין לומדת את השגרה שלכם. עוד כמה ימים של תיעוד ואדע לומר מתי בדרך כלל מגיעים האוכל, השינה והחיתול הבאים.' };
  }
  const soon = [...i.predictions].sort((a, b) => a.minutesUntil - b.minutesUntil)[0];
  if (soon) {
    const what = soon.kind === 'feed' ? 'ההאכלה הבאה' : soon.kind === 'sleep' ? 'השינה הבאה' : soon.kind === 'diaper' ? 'ההחלפה הבאה' : 'ההתעוררות';
    return { id: 'next', pose: 'heart', text: `הכול מתועד, כל הכבוד. ${what} אצלכם בדרך כלל בסביבות ${formatTime(soon.at)}.` };
  }
  return { id: 'all-good', pose: 'cheer', text: `הכול מתועד, כל הכבוד. ${name} בידיים טובות.` };
}
