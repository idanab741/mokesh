import type { ChildSex } from './age';
import type { BabyStage } from './avatar';

/**
 * Moments a family can mark for their child. This is a list of things to remember, not a
 * developmental checklist: there are no expected ages here and nothing is "late". The few
 * motor moments also tell the baby character which pose to show.
 */
export type MilestoneDomain = 'gross_motor' | 'fine_motor' | 'language' | 'social' | 'cognitive';
export type MilestoneGroup = 'motor' | 'hands' | 'talk' | 'social' | 'firsts';

export interface CatalogItem {
  key: string;
  group: MilestoneGroup;
  domain: MilestoneDomain;
  /** [boy, girl]; a child whose sex was not given gets both forms. */
  title: [string, string] | string;
  /** The pose the baby character takes once this is marked. */
  pose?: BabyStage;
}

export const groupLabel: Record<MilestoneGroup, string> = {
  motor: 'תנועה', hands: 'ידיים', talk: 'קולות ומילים', social: 'קשר', firsts: 'פעם ראשונה',
};
export const GROUPS: MilestoneGroup[] = ['motor', 'hands', 'talk', 'social', 'firsts'];

export const CATALOG: CatalogItem[] = [
  { key: 'holds_head', group: 'motor', domain: 'gross_motor', title: ['מרים את הראש', 'מרימה את הראש'] },
  { key: 'rolls_over', group: 'motor', domain: 'gross_motor', title: ['מתהפך', 'מתהפכת'] },
  { key: 'sits', group: 'motor', domain: 'gross_motor', title: ['יושב לבד', 'יושבת לבד'], pose: 'sit' },
  { key: 'crawls', group: 'motor', domain: 'gross_motor', title: ['זוחל', 'זוחלת'], pose: 'crawl' },
  { key: 'stands', group: 'motor', domain: 'gross_motor', title: ['עומד', 'עומדת'], pose: 'stand' },
  { key: 'first_steps', group: 'motor', domain: 'gross_motor', title: 'צעדים ראשונים', pose: 'stand' },
  { key: 'grasps_toy', group: 'hands', domain: 'fine_motor', title: ['אוחז בצעצוע', 'אוחזת בצעצוע'] },
  { key: 'claps', group: 'hands', domain: 'fine_motor', title: ['מוחא כפיים', 'מוחאת כפיים'] },
  { key: 'finger_food', group: 'hands', domain: 'fine_motor', title: ['אוכל לבד באצבעות', 'אוכלת לבד באצבעות'] },
  { key: 'coos', group: 'talk', domain: 'language', title: ['ממלמל', 'ממלמלת'] },
  { key: 'first_word', group: 'talk', domain: 'language', title: 'מילה ראשונה' },
  { key: 'first_smile', group: 'social', domain: 'social', title: 'חיוך ראשון' },
  { key: 'first_laugh', group: 'social', domain: 'social', title: 'צחוק ראשון' },
  { key: 'waves_bye', group: 'social', domain: 'social', title: ['מנפנף לשלום', 'מנפנפת לשלום'] },
  { key: 'first_tooth', group: 'firsts', domain: 'cognitive', title: 'שן ראשונה' },
  { key: 'first_solid', group: 'firsts', domain: 'cognitive', title: 'טעימה ראשונה' },
  { key: 'first_bath', group: 'firsts', domain: 'cognitive', title: 'אמבטיה ראשונה' },
  { key: 'first_trip', group: 'firsts', domain: 'cognitive', title: 'טיול ראשון' },
  { key: 'first_haircut', group: 'firsts', domain: 'cognitive', title: 'תספורת ראשונה' },
];

export function catalogTitle(item: CatalogItem, sex: ChildSex): string {
  if (typeof item.title === 'string') return item.title;
  if (sex === 'male') return item.title[0];
  if (sex === 'female') return item.title[1];
  return `${item.title[0]} / ${item.title[1]}`;
}

export interface Milestone {
  id: string;
  childId: string;
  catalogKey: string | null;
  domain: MilestoneDomain;
  title: string;
  /** YYYY-MM-DD, or null when the family did not give a date. */
  achievedOn: string | null;
  notes: string | null;
  createdAt: string;
}

const ORDER: BabyStage[] = ['tummy', 'sit', 'crawl', 'stand'];

/** The furthest pose among the moments the family marked; null when none of them is a pose. */
export function stageFromMilestones(milestones: readonly Pick<Milestone, 'catalogKey'>[]): BabyStage | null {
  let best = -1;
  for (const m of milestones) {
    const pose = CATALOG.find((c) => c.key === m.catalogKey)?.pose;
    if (pose) best = Math.max(best, ORDER.indexOf(pose));
  }
  return best < 0 ? null : ORDER[best];
}
