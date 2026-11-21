import type { ActivityEvent } from './activity';

/**
 * The steriliser: bottles and gear. It is logged as an "other" activity with a fixed title, so it
 * syncs and shows in the journal like everything else; the note says what was sterilised.
 */
export const STERILIZE_TITLE = 'סטריליזטור';
/** The title used before the rename; records saved under it still count. */
const OLD_TITLE = 'עיקור ציוד';
export const STERILIZE_ITEMS = ['פטמות', 'מוצצים', 'חלקי משאבה'] as const;
export type SterilizeItem = (typeof STERILIZE_ITEMS)[number];

export function sterilizeNotes(bottles: number, items: readonly SterilizeItem[]): string {
  const parts = [bottles === 1 ? 'בקבוק אחד' : bottles > 1 ? `${bottles} בקבוקים` : null, ...items].filter(Boolean);
  return parts.join(' · ');
}

export interface SterilizeState {
  /** When the gear was last sterilised. */
  at: Date;
  /** Bottles sterilised that time. */
  bottles: number;
  items: SterilizeItem[];
  /** Bottles from that batch not yet used: one is taken off for every bottle feeding logged since. */
  cleanBottles: number;
}

export function isSterilize(e: ActivityEvent): boolean {
  return e.type === 'other' && e.deletedAt === null && (e.payload.title === STERILIZE_TITLE || e.payload.title === OLD_TITLE);
}

/** The latest sterilisation and how many of its bottles are still clean; null when none was logged. */
export function sterilizeState(events: readonly ActivityEvent[]): SterilizeState | null {
  const last = events.filter(isSterilize).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  if (!last) return null;
  const notes = last.notes ?? '';
  const many = /(\d+) בקבוקים/.exec(notes);
  const bottles = many ? Number(many[1]) : notes.includes('בקבוק אחד') ? 1 : 0;
  const used = events.filter((e) => e.type === 'bottle' && e.deletedAt === null && e.occurredAt > last.occurredAt).length;
  return {
    at: new Date(last.occurredAt), bottles,
    items: STERILIZE_ITEMS.filter((i) => notes.includes(i)),
    cleanBottles: Math.max(0, bottles - used),
  };
}
