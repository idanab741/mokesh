import type { ActivityEvent, ActivityType, DiaperPayload, FilterKey, SolidsPayload } from '@/domain/activity';
import { sleepMinutes } from '@/domain/activity';
import { formatDuration } from '@/lib/time';

/**
 * All user-facing copy lives behind this module, so adding English later means adding
 * a sibling dictionary, not hunting for strings in components.
 */
export const activityLabel: Record<ActivityType, string> = {
  bottle: 'בקבוק',
  nursing: 'הנקה',
  pumping: 'שאיבה',
  sleep: 'שינה',
  diaper: 'חיתול',
  solids: 'מוצקים',
  other: 'פעילות נוספת',
};

export const filterLabel: Record<FilterKey, string> = {
  all: 'הכול',
  feeding: 'האכלות',
  sleep: 'שינה',
  diaper: 'חיתולים',
  solids: 'מוצקים',
  other: 'אחר',
};

export const milkTypeLabel = { formula: 'תמ״ל', breast_milk: 'חלב שאוב' } as const;
export const diaperKindLabel: Record<DiaperPayload['kind'], string> = { wet: 'רטוב', dirty: 'יציאה', both: 'רטוב ויציאה' };
export const diaperColorLabel: Record<NonNullable<DiaperPayload['color']>, string> = {
  yellow: 'צהוב', brown: 'חום', green: 'ירוק', black: 'שחור', red: 'אדום', white: 'לבן',
};
export const diaperTextureLabel: Record<NonNullable<DiaperPayload['texture']>, string> = {
  liquid: 'נוזלי', soft: 'רך', formed: 'מוצק', hard: 'קשה',
};
export const amountLabel: Record<NonNullable<DiaperPayload['amount']>, string> = { small: 'מעט', medium: 'בינוני', large: 'הרבה' };
export const solidsAmountLabel: Record<NonNullable<SolidsPayload['amount']>, string> = {
  taste: 'טעימה', little: 'מעט', medium: 'בינוני', lot: 'הרבה',
};
export const solidsTextureLabel: Record<NonNullable<SolidsPayload['texture']>, string> = {
  puree: 'מחית חלקה', mashed: 'מעוך', soft_pieces: 'חתיכות רכות', finger_food: 'אוכל אצבעות',
};
export const sideLabel = { left: 'שמאל', right: 'ימין' } as const;

export function eventTitle(e: ActivityEvent): string {
  return e.type === 'other' ? e.payload.title : activityLabel[e.type];
}

/** One-line description of an event for timelines. */
export function eventDetail(e: ActivityEvent, now: Date = new Date()): string {
  switch (e.type) {
    case 'bottle':
      return `${e.payload.amountMl} מ״ל · ${milkTypeLabel[e.payload.milkType]}`;
    case 'nursing': {
      const total = e.payload.leftSec + e.payload.rightSec;
      if (total === 0) return 'ללא משך מתועד';
      const parts: string[] = [];
      const side = (sec: number) => (sec < 60 ? `${sec} שנ׳` : formatDuration(sec / 60));
      if (e.payload.rightSec > 0) parts.push(`ימין ${side(e.payload.rightSec)}`);
      if (e.payload.leftSec > 0) parts.push(`שמאל ${side(e.payload.leftSec)}`);
      return parts.join(' · ');
    }
    case 'pumping': {
      const total = e.payload.leftMl + e.payload.rightMl;
      const duration = e.payload.durationMin ? ` · ${formatDuration(e.payload.durationMin)}` : '';
      return `${total} מ״ל${duration}`;
    }
    case 'sleep':
      return e.endedAt === null ? `בשינה כבר ${formatDuration(sleepMinutes(e, now))}` : formatDuration(sleepMinutes(e, now));
    case 'diaper': {
      const extra = [e.payload.color && diaperColorLabel[e.payload.color], e.payload.texture && diaperTextureLabel[e.payload.texture]].filter(Boolean);
      return [diaperKindLabel[e.payload.kind], ...extra].join(' · ');
    }
    case 'solids':
      return e.payload.foods.map((f) => f.name).join(', ');
    case 'other':
      return e.notes ?? '';
  }
}

const ERROR_COPY: Record<string, string> = {
  future_time: 'אי אפשר לתעד פעילות בזמן עתידי.',
  end_before_start: 'שעת הסיום חייבת להיות אחרי שעת ההתחלה.',
  sleep_too_long: 'משך השינה ארוך מ-24 שעות. כדאי לבדוק את השעות.',
  invalid_time: 'השעה או התאריך אינם תקינים.',
  guest_read_only: 'כדי לשמור צריך חשבון. בלי חשבון אפשר רק להציץ.',
  sleep_already_active: 'כבר יש שינה פעילה. אפשר לסיים אותה לפני שמתחילים חדשה.',
  not_found: 'הרשומה לא נמצאה. ייתכן שנמחקה ממכשיר אחר.',
};

export function errorMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  if (ERROR_COPY[code]) return ERROR_COPY[code];
  if (code.startsWith('invalid_payload:bottle')) return 'הכמות צריכה להיות בין 1 ל-500 מ״ל.';
  if (code.startsWith('invalid_payload:pumping')) return 'יש להזין כמות שאיבה גדולה מאפס.';
  if (code.startsWith('invalid_payload:solids')) return 'יש לבחור לפחות מזון אחד.';
  if (code.startsWith('invalid_payload:other')) return 'יש לתת שם לפעילות.';
  if (code.startsWith('invalid_payload')) return 'חלק מהפרטים אינם תקינים.';
  return 'משהו השתבש. הנתונים לא נשמרו, אפשר לנסות שוב.';
}

export function sleepingWord(sex: 'female' | 'male' | 'unspecified'): string {
  return sex === 'female' ? 'ישנה' : sex === 'male' ? 'ישן' : 'בשינה';
}
