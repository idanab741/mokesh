import { learnRoutine, predictNext, samplesUntilLearned } from '@/domain/routine';
import { makeEvent } from './helpers/factories';

const d = (day: number, time: string) => `2026-11-${String(day).padStart(2, '0')}T${time}:00`;
const bottle = (day: number, time: string, ml = 120) => makeEvent('bottle', d(day, time), { milkType: 'formula', amountMl: ml });
const sleep = (day: number, from: string, to: string) => makeEvent('sleep', d(day, from), {}, { endedAt: d(day, to) });
const now = new Date(d(19, '10:00'));

describe('routine learning', () => {
  it('learns nothing from too few records and says how many are missing', () => {
    const r = learnRoutine([bottle(19, '07:00'), bottle(19, '09:30')], now);
    expect(r.feed.gapMin).toBeNull();
    expect(predictNext(r, now)).toEqual([]);
    expect(samplesUntilLearned(r)).toBe(4);
  });

  it('learns the usual feeding gap and the usual bottle, and predicts the next feeding', () => {
    const events = [16, 17, 18].flatMap((day) => ['07:00', '10:00', '13:00', '16:00', '19:00'].map((h) => bottle(day, h, 150)));
    events.push(bottle(19, '08:00', 150));
    const r = learnRoutine(events, now);
    expect(r.feed).toMatchObject({ gapMin: 180, usual: 'bottle', bottleMl: 150, milkType: 'formula' });
    const [next] = predictNext(r, now);
    expect(next).toMatchObject({ kind: 'feed', minutesUntil: 60, usualMin: 180 });
    expect(next.at.getHours()).toBe(11);
  });

  it('offers a bottle amount the family really gave: the most common, or the latest on a tie', () => {
    expect(learnRoutine([bottle(19, '06:00', 90), bottle(19, '09:00', 120)], now).feed.bottleMl).toBe(120);
    expect(learnRoutine([bottle(18, '06:00', 90), bottle(18, '09:00', 90), bottle(19, '09:00', 120)], now).feed.bottleMl).toBe(90);
  });

  it('ignores overnight gaps and gaps that are really a missing record', () => {
    const events = [16, 17, 18].flatMap((day) => ['07:00', '10:00', '13:00'].map((h) => bottle(day, h)));
    // 13:00 -> 07:00 next day is 18 hours: not part of the routine
    expect(learnRoutine(events, now).feed.gapMin).toBe(180);
  });

  it('learns the awake window and the nap length, and predicts the next sleep after a wake-up', () => {
    const events = [15, 16, 17, 18].flatMap((day) => [sleep(day, '09:00', '10:00'), sleep(day, '12:00', '13:00'), sleep(day, '15:00', '16:00')]);
    events.push(sleep(19, '08:30', '09:30'));
    const r = learnRoutine(events, now);
    expect(r.sleep).toMatchObject({ awakeMin: 120, napMin: 60 });
    expect(predictNext(r, now).find((p) => p.kind === 'sleep')).toMatchObject({ minutesUntil: 90, usualMin: 120 });
  });

  it('while a sleep is running, predicts the usual wake-up instead of the next sleep', () => {
    const events = [15, 16, 17, 18].flatMap((day) => [sleep(day, '09:00', '10:00'), sleep(day, '12:00', '13:00'), sleep(day, '15:00', '16:00')]);
    const r = learnRoutine(events, now);
    const next = predictNext(r, now, new Date(d(19, '09:40')));
    expect(next.map((p) => p.kind)).toEqual(['wake']);
    expect(next[0].minutesUntil).toBe(40);
  });

  it('drops a prediction that is long past and offers nursing when that is what the family logs', () => {
    const events = [16, 17, 18].flatMap((day) => ['07:00', '10:00', '13:00', '16:00'].map((h) => makeEvent('nursing', d(day, h), { leftSec: 300, rightSec: 300, lastSide: 'left' })));
    const r = learnRoutine(events, now);
    expect(r.feed.usual).toBe('nursing');
    expect(r.feed.bottleMl).toBeNull();
    // the last feeding was yesterday 16:00, usual gap 3 hours: long past, so no prediction
    expect(predictNext(r, now).filter((p) => p.kind === 'feed')).toEqual([]);
  });
});
