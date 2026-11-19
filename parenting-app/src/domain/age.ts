export type ChildSex = 'female' | 'male' | 'unspecified';

export interface AgeParts {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalDays: number;
}

/** Calendar age between a birth date (YYYY-MM-DD) and `now`, in local time. */
export function ageParts(birthDate: string, now: Date = new Date()): AgeParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (today < birth) return null;

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    // Borrow the length of the month preceding "today".
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const totalDays = Math.round((today.getTime() - birth.getTime()) / 86_400_000);
  return { years, months, days, totalMonths: years * 12 + months, totalDays };
}

const daysHe = (n: number) => (n === 1 ? 'יום' : n === 2 ? 'יומיים' : `${n} ימים`);
const weeksHe = (n: number) => (n === 1 ? 'שבוע' : n === 2 ? 'שבועיים' : `${n} שבועות`);
const monthsHe = (n: number) => (n === 1 ? 'חודש' : n === 2 ? 'חודשיים' : `${n} חודשים`);
const yearsHe = (n: number) => (n === 1 ? 'שנה' : n === 2 ? 'שנתיים' : `${n} שנים`);
const join = (a: string, b: string | null) => (b ? `${a} ו${/^\d/.test(b) ? '-' : ''}${b}` : a);

/**
 * Human age, with the precision parents actually use at each stage:
 * days in the first weeks, weeks+days up to a month, months+days up to two years, then years+months.
 */
export function formatAge(birthDate: string, now: Date = new Date()): string | null {
  const a = ageParts(birthDate, now);
  if (!a) return null;
  if (a.totalDays === 0) return 'נולד/ה היום';
  if (a.totalMonths < 1) {
    if (a.totalDays < 14) return daysHe(a.totalDays);
    const w = Math.floor(a.totalDays / 7);
    const d = a.totalDays % 7;
    return join(weeksHe(w), d ? daysHe(d) : null);
  }
  if (a.totalMonths < 24) {
    if (a.years === 1) return join(yearsHe(1), a.months ? monthsHe(a.months) : null);
    return join(monthsHe(a.totalMonths), a.days ? daysHe(a.days) : null);
  }
  return join(yearsHe(a.years), a.months ? monthsHe(a.months) : null);
}

/** "בת 6 חודשים" / "בן שנה ו-3 חודשים" / "גיל: 6 חודשים" when sex was not specified. */
export function formatAgeWithSex(birthDate: string, sex: ChildSex, now: Date = new Date()): string | null {
  const age = formatAge(birthDate, now);
  if (!age) return null;
  if (age === 'נולד/ה היום') return sex === 'female' ? 'נולדה היום' : sex === 'male' ? 'נולד היום' : age;
  if (sex === 'female') return `בת ${age}`;
  if (sex === 'male') return `בן ${age}`;
  return `גיל: ${age}`;
}
