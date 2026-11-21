import { type AdviceInput, buildAdvice } from '@/domain/advisor';
import { learnRoutine } from '@/domain/routine';
import { sterilizeNotes, sterilizeState } from '@/domain/sterilize';
import { makeEvent } from './helpers/factories';

const now = new Date('2026-11-19T10:00:00');
const base: AdviceInput = {
  childName: 'עלמה', sex: 'female', now, eventsToday: 3, totalEvents: 40, asleepMin: null, awakeMin: 60,
  routine: learnRoutine([], now), predictions: [], sterilize: null, usesBottles: false,
  moments: { count: 2, latestTitle: 'שן ראשונה', latestDaysAgo: 30 }, sleepTodayMin: 120, usualSleepMin: null,
};

describe('companion', () => {
  it('always has something to say, with something to do, on an empty app and on an empty day', () => {
    expect(buildAdvice({ ...base, totalEvents: 0, eventsToday: 0 })).toMatchObject({ id: 'welcome', pose: 'wave', action: { kind: 'feed' } });
    expect(buildAdvice({ ...base, eventsToday: 0 })).toMatchObject({ id: 'empty-day', action: { kind: 'feed' } });
  });

  it('speaks of the running sleep first, then of what the routine expects about now', () => {
    expect(buildAdvice({ ...base, asleepMin: 40 })).toMatchObject({ id: 'asleep', pose: 'sleep', action: { kind: 'sleep' } });
    const due = { kind: 'sleep' as const, at: new Date('2026-11-19T10:10:00'), minutesUntil: 10, usualMin: 120, samples: 8 };
    const advice = buildAdvice({ ...base, awakeMin: 110, predictions: [due] });
    expect(advice).toMatchObject({ id: 'due-sleep', action: { kind: 'sleep' } });
    expect(advice.text).toContain('אצלכם');
  });

  it('offers to remember sterilising for a bottle family, and says when clean bottles run low', () => {
    expect(buildAdvice({ ...base, usesBottles: true })).toMatchObject({ id: 'sterilize-start', action: { kind: 'sterilize' } });
    const state = { at: now, bottles: 6, items: [], cleanBottles: 1 };
    expect(buildAdvice({ ...base, usesBottles: true, sterilize: state })).toMatchObject({ id: 'sterilize-low' });
  });

  it('celebrates a fresh moment and invites the first one', () => {
    expect(buildAdvice({ ...base, moments: { count: 3, latestTitle: 'זוחלת', latestDaysAgo: 1 } })).toMatchObject({ id: 'moment-new', pose: 'cheer' });
    expect(buildAdvice({ ...base, moments: { count: 0, latestTitle: null, latestDaysAgo: null } })).toMatchObject({ id: 'moment-first', action: { kind: 'moments' } });
  });
});

describe('sterilising', () => {
  it('counts clean bottles: the batch minus every bottle feeding logged since', () => {
    const batch = { ...makeEvent('other', '2026-11-19T07:00:00', { title: 'סטריליזטור' }), notes: sterilizeNotes(6, ['פטמות']) };
    const events = [batch, makeEvent('bottle', '2026-11-19T06:00:00', { milkType: 'formula', amountMl: 120 }),
      makeEvent('bottle', '2026-11-19T08:00:00', { milkType: 'formula', amountMl: 120 }), makeEvent('bottle', '2026-11-19T09:30:00', { milkType: 'formula', amountMl: 120 })];
    expect(sterilizeState(events)).toMatchObject({ bottles: 6, cleanBottles: 4, items: ['פטמות'] });
    expect(sterilizeState(events.slice(1))).toBeNull();
  });
});
