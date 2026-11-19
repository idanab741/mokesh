/**
 * Time helpers. Storage is always UTC ISO-8601; everything here works in the
 * device's local timezone, which is what a parent means by "today".
 */
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function nowIso(): string {
  return new Date().toISOString();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar-safe (DST-safe) day arithmetic. */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day key, e.g. 2026-11-19. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dayKey(d) === key ? d : null;
}

export function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const WEEKDAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export function weekdayShort(d: Date): string {
  return WEEKDAYS_SHORT[d.getDay()];
}

/** "יום חמישי, 19 בנובמבר" */
export function formatDateLong(d: Date): string {
  return `יום ${WEEKDAYS[d.getDay()]}, ${d.getDate()} ב${MONTHS[d.getMonth()]}`;
}

/** "19 בנובמבר 2026" */
export function formatDateFull(d: Date): string {
  return `${d.getDate()} ב${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "19.11" */
export function formatDateShort(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

/** "היום" / "אתמול" / long date. */
export function formatDayLabel(d: Date, now: Date = new Date()): string {
  if (isSameDay(d, now)) return 'היום';
  if (isSameDay(d, addDays(now, -1))) return 'אתמול';
  return formatDateLong(d);
}

/** Duration in whole minutes → "2 ש׳ 15 ד׳" / "45 ד׳". */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} ד׳`;
  if (m === 0) return `${h} ש׳`;
  return `${h} ש׳ ${m} ד׳`;
}

/** Stopwatch format for live timers: 1:02:03 or 02:03. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** "עכשיו" / "לפני 20 ד׳" / "לפני 3 ש׳" / "אתמול 21:30" / "19.11 21:30". */
export function formatRelative(d: Date, now: Date = new Date()): string {
  const diffMin = Math.floor((now.getTime() - d.getTime()) / MINUTE);
  if (diffMin < 0) return formatTime(d);
  if (diffMin < 1) return 'עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} ד׳`;
  if (diffMin < 6 * 60) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m >= 5 ? `לפני ${h} ש׳ ${m} ד׳` : `לפני ${h} ש׳`;
  }
  if (isSameDay(d, now)) return `היום ${formatTime(d)}`;
  if (isSameDay(d, addDays(now, -1))) return `אתמול ${formatTime(d)}`;
  return `${formatDateShort(d)} ${formatTime(d)}`;
}

/**
 * Wraps numerals/ranges in a left-to-right isolate so "21:00–05:30" keeps its order
 * inside right-to-left text (Unicode LRI … PDI).
 */
export function ltr(text: string): string {
  return `\u2066${text}\u2069`;
}

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  if (hour >= 17 && hour < 21) return 'ערב טוב';
  return 'לילה טוב';
}

/** Milliseconds of [aStart, aEnd) that fall inside [bStart, bEnd). */
export function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}
