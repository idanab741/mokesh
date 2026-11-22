import { type Photo, groupByMonth, monthOfLife, monthTitle, objectKey } from '@/domain/photos';

const photo = (id: string, takenOn: string, createdAt = `${takenOn}T10:00:00.000Z`): Photo => ({ id, childId: 'c', takenOn, caption: null, storagePath: `general/${id}.jpg`, thumb: null, createdAt });

describe('photo album', () => {
  it('counts the month of life from the birth date', () => {
    expect(monthOfLife('2026-05-19', '2026-05-19')).toBe(1);
    expect(monthOfLife('2026-05-19', '2026-06-18')).toBe(1);
    expect(monthOfLife('2026-05-19', '2026-06-19')).toBe(2);
    expect(monthOfLife('2026-05-19', '2026-11-21')).toBe(7);
    expect(monthOfLife('2026-05-19', '2026-05-01')).toBe(0);
    expect(monthOfLife('2025-01-31', '2025-02-28')).toBe(1);
  });

  it('names the months', () => {
    expect(monthTitle(1)).toBe('החודש הראשון');
    expect(monthTitle(12)).toBe('החודש השנים־עשר');
    expect(monthTitle(13)).toBe('שנה, החודש הראשון');
    expect(monthTitle(26)).toBe('שנתיים, החודש השני');
    expect(monthTitle(0)).toBe('לפני הלידה');
  });

  it('groups newest month first and newest photo first inside it', () => {
    const groups = groupByMonth([photo('a', '2026-05-20'), photo('b', '2026-11-01'), photo('c', '2026-11-20'), photo('d', '2026-11-20', '2026-11-20T18:00:00.000Z')], '2026-05-19');
    expect(groups.map((g) => g.month)).toEqual([7, 6, 1]);
    expect(groups[0]?.photos.map((p) => p.id)).toEqual(['d', 'c']);
    expect(groups[1]?.photos.map((p) => p.id)).toEqual(['b']);
  });

  it('keeps every file inside its family folder', () => {
    expect(objectKey('fam', 'general/p1.jpg')).toBe('fam/general/p1.jpg');
  });
});
