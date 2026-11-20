import { babyMood } from '@/domain/mood';
import { makeEvent } from './helpers/factories';

const d = (day: number, time: string) => `2026-11-${String(day).padStart(2, '0')}T${time}:00`;
const bottle = (day: number, time: string) => makeEvent('bottle', d(day, time), { milkType: 'formula', amountMl: 120 });
/** Three days of feedings every three hours: the family's usual gap is 3 hours. */
const routine = () => [16, 17, 18].flatMap((day) => ['07:00', '10:00', '13:00', '16:00', '19:00'].map((h) => bottle(day, h)));

describe('baby mood', () => {
  it('smiles by default and gives no reason when nothing says otherwise', () => {
    expect(babyMood([], new Date(d(19, '10:00')))).toEqual({ mood: 'happy', reason: null });
  });

  it('sleeps while a sleep timer is running, whatever else was logged', () => {
    const events = [...routine(), bottle(19, '09:50'), makeEvent('sleep', d(19, '09:55'), {})];
    expect(babyMood(events, new Date(d(19, '10:00')), 'female')).toEqual({ mood: 'asleep', reason: 'ישנה עכשיו' });
  });

  it('laughs for half an hour after a logged feeding', () => {
    const events = [...routine(), bottle(19, '09:48')];
    expect(babyMood(events, new Date(d(19, '10:00')), 'male')).toEqual({ mood: 'laughing', reason: 'אכל לפני 12 ד׳' });
    expect(babyMood(events, new Date(d(19, '10:30'))).mood).toBe('happy');
  });

  it('laughs after waking up', () => {
    const events = [makeEvent('sleep', d(19, '08:00'), {}, { endedAt: d(19, '09:50') })];
    expect(babyMood(events, new Date(d(19, '10:00')), 'female')).toEqual({ mood: 'laughing', reason: 'התעוררה לפני 10 ד׳' });
  });

  it('is sad only when the gap is clearly longer than the family\'s own usual gap', () => {
    const events = [...routine(), bottle(19, '07:00')];
    expect(babyMood(events, new Date(d(19, '10:15'))).mood).toBe('happy');
    const late = babyMood(events, new Date(d(19, '11:10')));
    expect(late.mood).toBe('sad');
    expect(late.reason).toBe('4 ש׳ 10 ד׳ מההאכלה האחרונה, אצלכם בדרך כלל כ-3 ש׳');
  });

  it('does not guess a usual gap from too little data, and ignores very long gaps', () => {
    expect(babyMood([bottle(19, '05:00')], new Date(d(19, '10:00'))).mood).toBe('happy');
    expect(babyMood(routine(), new Date(d(19, '10:00'))).mood).toBe('happy');
  });
});
