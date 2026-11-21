import { catalogRowId } from '@/data/repositories/milestones';
import { CATALOG, catalogTitle, stageFromMilestones } from '@/domain/milestones';

describe('milestones', () => {
  it('derives one stable uuid-shaped id per child and moment, and different ids for different ones', () => {
    const a = catalogRowId('11111111-1111-4111-8111-111111111111', 'crawls');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(catalogRowId('11111111-1111-4111-8111-111111111111', 'crawls')).toBe(a);
    const ids = new Set(CATALOG.flatMap((c) => ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'].map((child) => catalogRowId(child, c.key))));
    expect(ids.size).toBe(CATALOG.length * 2);
  });

  it('takes the furthest pose the family marked, and none when no pose moment is marked', () => {
    expect(stageFromMilestones([{ catalogKey: 'first_smile' }, { catalogKey: null }])).toBeNull();
    expect(stageFromMilestones([{ catalogKey: 'sits' }])).toBe('sit');
    expect(stageFromMilestones([{ catalogKey: 'stands' }, { catalogKey: 'crawls' }])).toBe('stand');
  });

  it('words a moment for a boy, a girl, and a child whose sex was not given', () => {
    const crawls = CATALOG.find((c) => c.key === 'crawls')!;
    expect(catalogTitle(crawls, 'male')).toBe('זוחל');
    expect(catalogTitle(crawls, 'female')).toBe('זוחלת');
    expect(catalogTitle(crawls, 'unspecified')).toBe('זוחל / זוחלת');
  });

  it('has unique keys', () => {
    expect(new Set(CATALOG.map((c) => c.key)).size).toBe(CATALOG.length);
  });
});
