import { SKIN_TONES, defaultStageForAge, lookFromPixels, parseAvatar, resolveOutfit, resolveStage } from '@/domain/avatar';
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
    expect(defaultStageForAge(6)).toBe('sit');
    expect(defaultStageForAge(8)).toBe('crawl');
    expect(defaultStageForAge(14)).toBe('stand');
    expect(resolveStage({ ...parseAvatar(null), stage: 'stand' }, 2)).toBe('stand');
  });
  it('falls back to defaults for missing or corrupt data, and ignores unknown outfit colours', () => {
    expect(parseAvatar('not json').stage).toBe('auto');
    expect(parseAvatar('{"hair":null,"stage":"crawl","outfit":"#123456"}')).toMatchObject({ hair: null, stage: 'crawl', outfit: 'auto' });
    expect(resolveOutfit(parseAvatar(null), 'male')).toBe('#A9D8DC');
    expect(resolveOutfit(parseAvatar(null), 'female')).toBe('#F5A9BF');
    expect(resolveOutfit(parseAvatar('{"outfit":"#C9B8F2"}'), 'male')).toBe('#C9B8F2');
  });
});

/** Paints a square "portrait": background, a face ellipse, and optionally hair above it. */
function portrait(skin: [number, number, number], hair: [number, number, number] | null, bg: [number, number, number] = [120, 170, 220]) {
  const n = 64;
  const px = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
    const i = (y * n + x) * 4;
    const dx = (x - n / 2) / (n * 0.34), dy = (y - n * 0.55) / (n * 0.4);
    const inFace = dx * dx + dy * dy <= 1;
    const hx = (x - n / 2) / (n * 0.36), hy = (y - n * 0.24) / (n * 0.2);
    const inHair = hair !== null && hx * hx + hy * hy <= 1 && y < n * 0.3;
    const c = inHair ? hair! : inFace ? skin : bg;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return { px, n };
}

describe('look from a photo', () => {
  it('matches fair, medium and dark skin to different tones', () => {
    const fair = portrait([246, 214, 196], [70, 45, 28]);
    const medium = portrait([205, 150, 110], [40, 28, 20]);
    const dark = portrait([120, 78, 52], [30, 22, 18]);
    const tones = [fair, medium, dark].map((p) => lookFromPixels(p.px, p.n, p.n)!.skin);
    const order = tones.map((t) => (SKIN_TONES as readonly string[]).indexOf(t));
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });
  it('tells dark hair, blond hair and no hair apart', () => {
    const dark = portrait([240, 205, 185], [42, 28, 20]);
    const blond = portrait([240, 205, 185], [226, 196, 120]);
    const none = portrait([240, 205, 185], [240, 205, 185]);
    expect(lookFromPixels(dark.px, dark.n, dark.n)!.hair).toBe('#2A1C14');
    expect(['#EACB7C', '#C79A4E']).toContain(lookFromPixels(blond.px, blond.n, blond.n)!.hair);
    expect(lookFromPixels(none.px, none.n, none.n)!.hair).toBeNull();
  });
  it('does not mistake a coloured background above the head for hair', () => {
    const p = portrait([240, 205, 185], null, [60, 120, 230]);
    expect(lookFromPixels(p.px, p.n, p.n)!.hair).toBeNull();
  });
  it('refuses to guess when no face is visible', () => {
    const n = 64;
    const px = new Uint8ClampedArray(n * n * 4).fill(90);
    expect(lookFromPixels(px, n, n)).toBeNull();
  });
});
