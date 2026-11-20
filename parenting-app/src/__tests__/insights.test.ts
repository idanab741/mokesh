import { defaultStageForAge, parseAvatar, resolveStage } from '@/domain/avatar';
import { buildInsights, daysUntilInsights } from '@/domain/insights';
import { makeEvent } from './helpers/factories';

const now = new Date('2026-11-19T10:00:00');
const d = (day: number, time: string) => `2026-11-${String(day).padStart(2, '0')}T${time}:00`;

describe('insights', () => {
  it('says nothing when there is not enough data, and reports how much is missing', () => {
    expect(buildInsights([], now)).toEqual([]);
    expect(daysUntilInsights([], now)).toBe(3);
    const one = [makeEvent('bottle', d(18, '08:00'), { milkType: 'formula', amountMl: 120 })];
    expect(buildInsights(one, now).find((i) => i.id === 'bottle-yesterday')).toBeUndefined();
    expect(daysUntilInsights(one, now)).toBe(2);
  });

  it('compares yesterday with the family\'s own average and states the basis', () => {
    const events = [];
    for (const [day, ml] of [[15, 600], [16, 600], [17, 600], [18, 720]] as const) {
      for (let i = 0; i < 4; i += 1) events.push(makeEvent('bottle', d(day, `${String(7 + i * 4).padStart(2, '0')}:00`), { milkType: 'formula', amountMl: ml / 4 }));
    }
    const insight = buildInsights(events, now).find((i) => i.id === 'bottle-yesterday')!;
    expect(insight.title).toBe('אתמול: 720 מ״ל בבקבוק');
    expect(insight.body).toBe('90 מ״ל יותר מהממוצע היומי שלכם (630 מ״ל).');
    expect(insight.basis).toContain('4 ימים');
  });

  it('derives the feeding rhythm from the median gap', () => {
    const events = [];
    for (const day of [16, 17, 18]) for (const h of ['07', '10', '13', '16', '19']) events.push(makeEvent('bottle', d(day, `${h}:00`), { milkType: 'formula', amountMl: 120 }));
    events.push(makeEvent('bottle', d(19, '08:30'), { milkType: 'formula', amountMl: 120 }));
    const insight = buildInsights(events, now).find((i) => i.id === 'feed-rhythm')!;
    expect(insight.title).toBe('בין האכלות עוברות בדרך כלל כ-3 ש׳');
    expect(insight.body).toBe('ההאכלה האחרונה תועדה לפני 1 ש׳ 30 ד׳.');
  });

  it('reports the longest sleep stretch of the last 24 hours', () => {
    const events = [
      makeEvent('sleep', d(18, '20:00'), {}, { endedAt: d(19, '05:30') }),
      makeEvent('sleep', d(18, '13:00'), {}, { endedAt: d(18, '14:00') }),
    ];
    expect(buildInsights(events, now).find((i) => i.id === 'sleep-longest')!.title).toBe('רצף השינה הארוך ביממה האחרונה: 9 ש׳ 30 ד׳');
  });

  it('never contains advice or medical wording', () => {
    const events = [];
    for (const day of [15, 16, 17, 18]) {
      events.push(makeEvent('sleep', d(day, '20:00'), {}, { endedAt: d(day + 1, '06:00') }));
      for (const h of ['07', '11', '15', '19']) events.push(makeEvent('bottle', d(day, `${h}:00`), { milkType: 'formula', amountMl: 150 }));
      events.push(makeEvent('diaper', d(day, '09:00'), { kind: 'wet' }));
    }
    events.push(makeEvent('diaper', d(19, '08:00'), { kind: 'wet' }));
    const all = buildInsights(events, now);
    expect(all.length).toBeGreaterThanOrEqual(4);
    const text = all.map((i) => `${i.title} ${i.body}`).join(' ');
    for (const word of ['מומלץ', 'כדאי', 'צריך', 'תקין', 'נורמלי', 'חריג', 'רופא']) expect(text).not.toContain(word);
    for (const i of all) expect(i.basis.length).toBeGreaterThan(0);
  });
});

describe('avatar', () => {
  it('uses the age only as a default the parent can override', () => {
    expect(defaultStageForAge(2)).toBe('tummy');
    expect(defaultStageForAge(8)).toBe('crawl');
    expect(defaultStageForAge(14)).toBe('stand');
    expect(resolveStage({ ...parseAvatar(null), stage: 'stand' }, 2)).toBe('stand');
  });
  it('falls back to defaults for missing or corrupt data', () => {
    expect(parseAvatar('not json').stage).toBe('auto');
    expect(parseAvatar('{"hair":null,"stage":"crawl"}')).toMatchObject({ hair: null, stage: 'crawl' });
  });
});
