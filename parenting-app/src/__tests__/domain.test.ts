import { validateDraft, type ActivityDraft } from '@/domain/activity';
import { ageParts, formatAge, formatAgeWithSex } from '@/domain/age';
import { compare, computeRangeStats, previousRange } from '@/domain/stats';
import { eventsForDay, summarizeDay } from '@/domain/summary';
import { formatDuration, formatRelative, greetingForHour } from '@/lib/time';
import { makeEvent } from './helpers/factories';

const at = (s: string) => new Date(s); // local time (TZ is pinned to Asia/Jerusalem by the test script)

describe('age', () => {
  const now = at('2026-11-19T10:00:00');
  it('counts calendar months and days', () => {
    expect(ageParts('2026-05-19', now)).toMatchObject({ years: 0, months: 6, days: 0, totalMonths: 6 });
    expect(ageParts('2026-05-25', now)).toMatchObject({ months: 5, days: 25 });
    expect(ageParts('2024-02-29', now)).toMatchObject({ years: 2, months: 8, days: 21 });
  });
  it('formats by life stage', () => {
    expect(formatAge('2026-11-19', now)).toBe('נולד/ה היום');
    expect(formatAge('2026-11-16', now)).toBe('3 ימים');
    expect(formatAge('2026-11-01', now)).toBe('שבועיים ו-4 ימים');
    expect(formatAge('2026-05-19', now)).toBe('6 חודשים');
    expect(formatAge('2026-05-16', now)).toBe('6 חודשים ו-3 ימים');
    expect(formatAge('2025-08-19', now)).toBe('שנה ו-3 חודשים');
    expect(formatAge('2024-11-19', now)).toBe('שנתיים');
    expect(formatAge('2024-01-19', now)).toBe('שנתיים ו-10 חודשים');
  });
  it('uses the grammatical gender only when it is known', () => {
    expect(formatAgeWithSex('2026-05-19', 'female', now)).toBe('בת 6 חודשים');
    expect(formatAgeWithSex('2026-05-19', 'male', now)).toBe('בן 6 חודשים');
    expect(formatAgeWithSex('2026-05-19', 'unspecified', now)).toBe('גיל: 6 חודשים');
  });
  it('rejects a birth date in the future', () => {
    expect(ageParts('2027-01-01', now)).toBeNull();
  });
});

describe('time formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 ד׳');
    expect(formatDuration(120)).toBe('2 ש׳');
    expect(formatDuration(135)).toBe('2 ש׳ 15 ד׳');
  });
  it('formats relative times', () => {
    const now = at('2026-11-19T10:00:00');
    expect(formatRelative(at('2026-11-19T09:40:00'), now)).toBe('לפני 20 ד׳');
    expect(formatRelative(at('2026-11-18T21:30:00'), now)).toBe('אתמול 21:30');
  });
  it('greets by hour', () => {
    expect(greetingForHour(7)).toBe('בוקר טוב');
    expect(greetingForHour(14)).toBe('צהריים טובים');
    expect(greetingForHour(19)).toBe('ערב טוב');
    expect(greetingForHour(2)).toBe('לילה טוב');
  });
});

describe('draft validation', () => {
  const now = at('2026-11-19T10:00:00');
  const bottle = (amountMl: number): ActivityDraft => ({ type: 'bottle', occurredAt: now.toISOString(), payload: { milkType: 'formula', amountMl } });
  it('rejects negative, zero and absurd amounts', () => {
    expect(() => validateDraft(bottle(-10), now)).toThrow(/invalid_payload:bottle/);
    expect(() => validateDraft(bottle(0), now)).toThrow(/invalid_payload:bottle/);
    expect(() => validateDraft(bottle(5000), now)).toThrow(/invalid_payload:bottle/);
    expect(validateDraft(bottle(120), now).payload).toEqual({ milkType: 'formula', amountMl: 120 });
  });
  it('rejects future events and inverted ranges', () => {
    expect(() => validateDraft({ ...bottle(120), occurredAt: at('2026-11-19T12:00:00').toISOString() }, now)).toThrow('future_time');
    expect(() =>
      validateDraft({ type: 'sleep', occurredAt: at('2026-11-19T08:00:00').toISOString(), startedAt: at('2026-11-19T08:00:00').toISOString(), endedAt: at('2026-11-19T07:00:00').toISOString(), payload: {} }, now),
    ).toThrow('end_before_start');
  });
  it('requires at least one food and a non-empty pumping amount', () => {
    expect(() => validateDraft({ type: 'solids', occurredAt: now.toISOString(), payload: { foods: [] } }, now)).toThrow(/invalid_payload:solids/);
    expect(() => validateDraft({ type: 'pumping', occurredAt: now.toISOString(), payload: { leftMl: 0, rightMl: 0 } }, now)).toThrow(/invalid_payload:pumping/);
  });
});

describe('day summary', () => {
  const day = at('2026-11-19T00:00:00');
  const now = at('2026-11-19T20:00:00');
  it('is empty for an empty day', () => {
    const s = summarizeDay([], day, now);
    expect(s.feeding).toMatchObject({ count: 0, totalMl: 0, last: null });
    expect(s.sleep).toMatchObject({ minutes: 0, active: null });
  });
  it('sums bottles and counts nursing as a feeding', () => {
    const events = [
      makeEvent('bottle', '2026-11-19T07:00:00', { milkType: 'formula', amountMl: 120 }),
      makeEvent('bottle', '2026-11-19T11:00:00', { milkType: 'breast_milk', amountMl: 90 }),
      makeEvent('nursing', '2026-11-19T15:00:00', { leftSec: 300, rightSec: 420 }),
      makeEvent('bottle', '2026-11-18T23:00:00', { milkType: 'formula', amountMl: 150 }), // yesterday
    ];
    const s = summarizeDay(events, day, now);
    expect(s.feeding.count).toBe(3);
    expect(s.feeding.totalMl).toBe(210);
    expect(s.feeding.nursingMinutes).toBe(12);
    expect(s.feeding.last?.type).toBe('nursing');
  });
  it('ignores deleted events', () => {
    const e = makeEvent('bottle', '2026-11-19T07:00:00', { milkType: 'formula', amountMl: 120 });
    expect(summarizeDay([{ ...e, deletedAt: now.toISOString() }], day, now).feeding.count).toBe(0);
  });
  it('splits a sleep that crosses midnight between the two days', () => {
    const night = makeEvent('sleep', '2026-11-18T22:00:00', {}, { endedAt: '2026-11-19T06:30:00' });
    expect(summarizeDay([night], at('2026-11-18T00:00:00'), now).sleep.minutes).toBe(120);
    expect(summarizeDay([night], day, now).sleep.minutes).toBe(390);
    expect(eventsForDay([night], day, now)).toHaveLength(1);
    expect(eventsForDay([night], at('2026-11-18T00:00:00'), now)).toHaveLength(1);
    expect(eventsForDay([night], at('2026-11-17T00:00:00'), now)).toHaveLength(0);
  });
  it('measures a running sleep up to now, from timestamps only', () => {
    const running = makeEvent('sleep', '2026-11-19T19:15:00', {}, { endedAt: null });
    const s = summarizeDay([running], day, now);
    expect(s.sleep.active?.id).toBe(running.id);
    expect(s.sleep.minutes).toBe(45);
  });
  it('counts diapers by kind', () => {
    const s = summarizeDay([
      makeEvent('diaper', '2026-11-19T08:00:00', { kind: 'wet' }),
      makeEvent('diaper', '2026-11-19T12:00:00', { kind: 'both' }),
      makeEvent('diaper', '2026-11-19T16:00:00', { kind: 'dirty' }),
    ], day, now);
    expect(s.diaper).toMatchObject({ count: 3, wet: 2, dirty: 2 });
    expect(s.diaper.last?.payload.kind).toBe('dirty');
  });
});

describe('range statistics', () => {
  const now = at('2026-11-19T20:00:00');
  const from = at('2026-11-13T00:00:00');
  const to = at('2026-11-19T00:00:00');
  it('creates one bucket per day and reports days with data', () => {
    const stats = computeRangeStats([makeEvent('bottle', '2026-11-15T09:00:00', { milkType: 'formula', amountMl: 100 })], from, to, now);
    expect(stats.days).toHaveLength(7);
    expect(stats.daysWithData).toBe(1);
    expect(stats.totals.bottleMl).toBe(100);
    expect(stats.averages.sleepMinPerDay).toBeNull();
  });
  it('averages over days that have data, not over empty days', () => {
    const stats = computeRangeStats([
      makeEvent('bottle', '2026-11-15T09:00:00', { milkType: 'formula', amountMl: 100 }),
      makeEvent('bottle', '2026-11-15T13:00:00', { milkType: 'formula', amountMl: 140 }),
      makeEvent('bottle', '2026-11-16T09:00:00', { milkType: 'formula', amountMl: 120 }),
    ], from, to, now);
    expect(stats.averages.bottleMlPerDay).toBe(180);
    expect(stats.averages.mlPerBottle).toBe(120);
    expect(stats.averages.feedsPerDay).toBe(1.5);
  });
  it('splits overnight sleep per day and into night/day parts', () => {
    const stats = computeRangeStats([
      makeEvent('sleep', '2026-11-17T20:00:00', {}, { endedAt: '2026-11-18T06:00:00' }),
      makeEvent('sleep', '2026-11-18T12:00:00', {}, { endedAt: '2026-11-18T13:30:00' }),
    ], from, to, now);
    const d17 = stats.days.find((d) => d.key === '2026-11-17')!;
    const d18 = stats.days.find((d) => d.key === '2026-11-18')!;
    expect(d17).toMatchObject({ sleepMin: 240, nightSleepMin: 240, daySleepMin: 0, sleepEpisodes: 1, bedtimeMin: 20 * 60 });
    expect(d18).toMatchObject({ sleepMin: 450, nightSleepMin: 360, daySleepMin: 90, sleepEpisodes: 1 });
    expect(stats.totals.sleepMin).toBe(690);
    expect(stats.averages.bedtimeMin).toBe(1200);
  });
  it('lists recorded foods and keeps the allergen flag the parent set', () => {
    const stats = computeRangeStats([
      makeEvent('solids', '2026-11-18T12:00:00', { foods: [{ name: 'בטטה', isAllergen: false }, { name: 'טחינה', isAllergen: true }] }),
      makeEvent('solids', '2026-11-19T12:00:00', { foods: [{ name: 'בטטה', isAllergen: false }] }),
    ], from, to, now);
    expect(stats.foods).toEqual([
      { name: 'בטטה', count: 2, isAllergen: false },
      { name: 'טחינה', count: 1, isAllergen: true },
    ]);
  });
  it('compares with the previous period and refuses to compare against nothing', () => {
    expect(previousRange(from, to).from.getDate()).toBe(6);
    expect(previousRange(from, to).to.getDate()).toBe(12);
    expect(compare(120, 100)).toEqual({ percent: 20, direction: 'up' });
    expect(compare(80, 100)).toEqual({ percent: -20, direction: 'down' });
    expect(compare(80, 0)).toEqual({ percent: null, direction: 'none' });
    expect(compare(null, 100).direction).toBe('none');
  });
});
