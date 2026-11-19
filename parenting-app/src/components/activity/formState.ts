import type { ActivityDraft, ActivityEvent, ActivityType, DiaperPayload, SolidsPayload } from '@/domain/activity';

/** In-memory state of an activity form. Converted to a validated draft only on save. */
export type FormState =
  | { type: 'bottle'; at: Date; milkType: 'formula' | 'breast_milk'; amountMl: number; notes: string }
  | { type: 'nursing'; at: Date; leftSec: number; rightSec: number; lastSide?: 'left' | 'right'; running: { side: 'left' | 'right'; since: number } | null; notes: string }
  | { type: 'pumping'; at: Date; leftMl: number; rightMl: number; durationMin: number; notes: string }
  | { type: 'sleep'; start: Date; end: Date | null; notes: string }
  | { type: 'diaper'; at: Date; kind: DiaperPayload['kind']; color?: DiaperPayload['color']; texture?: DiaperPayload['texture']; amount?: DiaperPayload['amount']; notes: string }
  | { type: 'solids'; at: Date; foods: { name: string; isAllergen: boolean }[]; amount?: SolidsPayload['amount']; texture?: SolidsPayload['texture']; reaction: string; notes: string }
  | { type: 'other'; at: Date; title: string; notes: string };

export type StateOf<T extends ActivityType> = Extract<FormState, { type: T }>;

export function initialState(type: ActivityType, defaults: { bottleMl?: number; milkType?: 'formula' | 'breast_milk' } = {}): FormState {
  const at = new Date();
  switch (type) {
    case 'bottle':
      return { type, at, milkType: defaults.milkType ?? 'formula', amountMl: defaults.bottleMl ?? 120, notes: '' };
    case 'nursing':
      return { type, at, leftSec: 0, rightSec: 0, running: null, notes: '' };
    case 'pumping':
      return { type, at, leftMl: 0, rightMl: 0, durationMin: 0, notes: '' };
    case 'sleep':
      return { type, start: at, end: null, notes: '' };
    case 'diaper':
      return { type, at, kind: 'wet', notes: '' };
    case 'solids':
      return { type, at, foods: [], reaction: '', notes: '' };
    case 'other':
      return { type, at, title: '', notes: '' };
  }
}

export function stateFromEvent(e: ActivityEvent): FormState {
  const at = new Date(e.occurredAt);
  const notes = e.notes ?? '';
  switch (e.type) {
    case 'bottle':
      return { type: 'bottle', at, milkType: e.payload.milkType, amountMl: e.payload.amountMl, notes };
    case 'nursing':
      return { type: 'nursing', at, leftSec: e.payload.leftSec, rightSec: e.payload.rightSec, lastSide: e.payload.lastSide, running: null, notes };
    case 'pumping':
      return { type: 'pumping', at, leftMl: e.payload.leftMl, rightMl: e.payload.rightMl, durationMin: e.payload.durationMin ?? 0, notes };
    case 'sleep':
      return { type: 'sleep', start: new Date(e.startedAt ?? e.occurredAt), end: e.endedAt ? new Date(e.endedAt) : null, notes };
    case 'diaper':
      return { type: 'diaper', at, kind: e.payload.kind, color: e.payload.color, texture: e.payload.texture, amount: e.payload.amount, notes };
    case 'solids':
      return { type: 'solids', at, foods: e.payload.foods.map((f) => ({ ...f })), amount: e.payload.amount, texture: e.payload.texture, reaction: e.payload.reaction ?? '', notes };
    case 'other':
      return { type: 'other', at, title: e.payload.title, notes };
  }
}

/** Seconds on each side including the side that is currently running. */
export function nursingTotals(s: StateOf<'nursing'>, nowMs: number): { left: number; right: number } {
  const extra = s.running ? Math.max(0, Math.floor((nowMs - s.running.since) / 1000)) : 0;
  return {
    left: s.leftSec + (s.running?.side === 'left' ? extra : 0),
    right: s.rightSec + (s.running?.side === 'right' ? extra : 0),
  };
}

export function toDraft(s: FormState, now: Date = new Date()): ActivityDraft {
  const notes = s.notes.trim() || null;
  switch (s.type) {
    case 'bottle':
      return { type: 'bottle', occurredAt: s.at.toISOString(), notes, payload: { milkType: s.milkType, amountMl: s.amountMl } };
    case 'nursing': {
      const t = nursingTotals(s, now.getTime());
      return { type: 'nursing', occurredAt: s.at.toISOString(), notes, payload: { leftSec: t.left, rightSec: t.right, lastSide: s.running?.side ?? s.lastSide } };
    }
    case 'pumping':
      return { type: 'pumping', occurredAt: s.at.toISOString(), notes, payload: { leftMl: s.leftMl, rightMl: s.rightMl, durationMin: s.durationMin > 0 ? s.durationMin : undefined } };
    case 'sleep':
      return { type: 'sleep', occurredAt: s.start.toISOString(), startedAt: s.start.toISOString(), endedAt: s.end ? s.end.toISOString() : null, notes, payload: {} };
    case 'diaper': {
      const hasStool = s.kind !== 'wet';
      return { type: 'diaper', occurredAt: s.at.toISOString(), notes, payload: { kind: s.kind, color: hasStool ? s.color : undefined, texture: hasStool ? s.texture : undefined, amount: s.amount } };
    }
    case 'solids':
      return { type: 'solids', occurredAt: s.at.toISOString(), notes, payload: { foods: s.foods, amount: s.amount, texture: s.texture, reaction: s.reaction.trim() || undefined } };
    case 'other':
      return { type: 'other', occurredAt: s.at.toISOString(), notes, payload: { title: s.title.trim() } };
  }
}
