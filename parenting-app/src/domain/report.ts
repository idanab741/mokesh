import { formatAgeWithSex } from './age';
import type { Child, Measurement } from './child';
import type { Milestone } from './milestones';
import type { RangeStats } from './stats';
import { dayKey, formatDateFull, formatDuration, parseDayKey } from '@/lib/time';

export interface ReportSection { title: string; lines: string[] }
export interface Report { title: string; subtitle: string[]; sections: ReportSection[]; footer: string }

const one = (n: number) => (Math.round(n * 10) / 10).toString();
const kg = (g: number) => `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} ק״ג`;
const cm = (mm: number) => `${(mm / 10).toFixed(1).replace(/\.0$/, '')} ס״מ`;
const count = (n: number, single: string, many: string) => (n === 1 ? single : `${n} ${many}`);
const day = (key: string) => { const d = parseDayKey(key); return d ? formatDateFull(d) : key; };

/**
 * A one-page summary a parent can hand to a doctor or a nurse. It only restates what the family
 * logged in the period: counts, averages over the days that have records, measurements and
 * moments. It draws no conclusions and compares with nothing.
 */
export function buildReport({ child, stats, measurements, milestones, from, to, now }: {
  child: Child; stats: RangeStats; measurements: readonly Measurement[]; milestones: readonly Milestone[]; from: Date; to: Date; now: Date;
}): Report {
  const totalDays = stats.days.length;
  const n = stats.daysWithData;
  const t = stats.totals;
  const a = stats.averages;
  const sections: ReportSection[] = [];

  const feeding: string[] = [];
  if (t.feedCount === 0) feeding.push('לא תועדו האכלות בתקופה.');
  else {
    if (a.feedsPerDay !== null) feeding.push(`בממוצע ${one(a.feedsPerDay)} האכלות ביום (${t.feedCount} בתקופה).`);
    if (t.bottleCount > 0) feeding.push(`בקבוק: ${count(t.bottleCount, 'בקבוק אחד', 'בקבוקים')}${a.bottleMlPerDay !== null ? `, בממוצע ${Math.round(a.bottleMlPerDay)} מ״ל ביום` : ''}${a.mlPerBottle !== null ? `, ${Math.round(a.mlPerBottle)} מ״ל לבקבוק` : ''}.`);
    if (t.nursingCount > 0) feeding.push(`הנקה: ${count(t.nursingCount, 'הנקה אחת', 'הנקות')}${t.nursingMin > 0 ? `, סה״כ ${formatDuration(t.nursingMin)}` : ''}.`);
  }
  sections.push({ title: 'האכלה', lines: feeding });

  const sleep: string[] = [];
  if (t.sleepMin === 0) sleep.push('לא תועדה שינה בתקופה.');
  else {
    if (a.sleepMinPerDay !== null) sleep.push(`בממוצע ${formatDuration(a.sleepMinPerDay)} ביממה.`);
    if (n > 0) sleep.push(`מתוכן בלילה (19:00–07:00) ${formatDuration(t.nightSleepMin / n)}, וביום ${formatDuration(t.daySleepMin / n)}.`);
    if (n > 0) sleep.push(`בממוצע ${one(t.sleepEpisodes / n)} פרקי שינה ביממה.`);
  }
  sections.push({ title: 'שינה', lines: sleep });

  const diaper: string[] = [];
  if (t.diaperCount === 0) diaper.push('לא תועדו החלפות בתקופה.');
  else {
    if (a.diapersPerDay !== null) diaper.push(`בממוצע ${one(a.diapersPerDay)} החלפות ביום (${t.diaperCount} בתקופה).`);
    diaper.push(`רטוב: ${t.diaperWet} · יציאה: ${t.diaperDirty} · רטוב ויציאה: ${t.diaperBoth}.`);
  }
  sections.push({ title: 'חיתולים', lines: diaper });

  if (t.solidsCount > 0) {
    const foods = stats.foods.map((f) => `${f.name} (${f.count}${f.isAllergen ? ', סומן כאלרגני' : ''})`).join(', ');
    sections.push({ title: 'מוצקים', lines: [`${count(t.solidsCount, 'ארוחה אחת', 'ארוחות')} בתקופה.`, ...(foods ? [`מזונות: ${foods}.`] : [])] });
  }

  const fromKey = dayKey(from); const toKey = dayKey(to);
  const inRange = measurements.filter((m) => m.measuredAt >= fromKey && m.measuredAt <= toKey);
  const shown = inRange.length > 0 ? inRange : measurements.slice(0, 1);
  if (shown.length > 0) {
    sections.push({
      title: inRange.length > 0 ? 'מדידות בתקופה' : 'מדידה אחרונה',
      lines: shown.map((m) => `${day(m.measuredAt)}: ${[m.weightG !== null ? kg(m.weightG) : null, m.lengthMm !== null ? cm(m.lengthMm) : null,
        m.headCircumferenceMm !== null ? `היקף ראש ${cm(m.headCircumferenceMm)}` : null].filter(Boolean).join(' · ')}`),
    });
  }

  const moments = milestones.filter((m) => m.achievedOn && m.achievedOn >= fromKey && m.achievedOn <= toKey);
  if (moments.length > 0) sections.push({ title: 'רגעים שסומנו בתקופה', lines: moments.map((m) => `${day(m.achievedOn as string)}: ${m.title}`) });

  const birth = parseDayKey(child.birthDate);
  return {
    title: `סיכום תיעוד – ${child.name}`,
    subtitle: [
      [birth ? `תאריך לידה: ${formatDateFull(birth)}` : null, formatAgeWithSex(child.birthDate, child.sex, now)].filter(Boolean).join(' · '),
      `התקופה: ${formatDateFull(from)} – ${formatDateFull(to)} (${totalDays} ימים, מהם ${n} עם תיעוד)`,
    ],
    sections,
    footer: 'הסיכום מציג רק את מה שתועד באפליקציה. הממוצעים מחושבים על ימים שיש בהם תיעוד. זה אינו מסמך רפואי ואינו כולל הערכה או המלצה.',
  };
}

export function reportText(r: Report): string {
  return [r.title, ...r.subtitle, '', ...r.sections.flatMap((s) => [s.title, ...s.lines.map((l) => `• ${l}`), '']), r.footer].join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** A plain right-to-left page for printing or saving as PDF. */
export function reportHtml(r: Report): string {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${esc(r.title)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#1c1a1f;margin:32px;line-height:1.5}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:20px 0 4px;border-bottom:1px solid #ddd;padding-bottom:4px}
p{margin:2px 0;font-size:13px;color:#444}ul{margin:4px 0;padding-inline-start:20px}li{font-size:14px;margin:2px 0}footer{margin-top:28px;font-size:11px;color:#666}</style></head><body>
<h1>${esc(r.title)}</h1>${r.subtitle.map((s) => `<p>${esc(s)}</p>`).join('')}
${r.sections.map((s) => `<h2>${esc(s.title)}</h2><ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`).join('')}
<footer>${esc(r.footer)}</footer></body></html>`;
}
