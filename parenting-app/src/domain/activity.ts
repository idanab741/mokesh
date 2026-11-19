import { z } from 'zod';

export const ACTIVITY_TYPES = ['bottle', 'nursing', 'pumping', 'sleep', 'diaper', 'solids', 'other'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const LIMITS = {
  bottleMaxMl: 500,
  pumpMaxMl: 1000,
  nursingMaxSec: 4 * 60 * 60,
  notesMax: 2000,
  /** A single sleep longer than this is almost certainly a forgotten timer. */
  sleepMaxHours: 24,
} as const;

export const bottlePayload = z.object({
  milkType: z.enum(['formula', 'breast_milk']),
  amountMl: z.number().int().positive().max(LIMITS.bottleMaxMl),
});

export const nursingPayload = z
  .object({
    leftSec: z.number().int().min(0).max(LIMITS.nursingMaxSec),
    rightSec: z.number().int().min(0).max(LIMITS.nursingMaxSec),
    lastSide: z.enum(['left', 'right']).optional(),
  });

export const pumpingPayload = z
  .object({
    leftMl: z.number().int().min(0).max(LIMITS.pumpMaxMl),
    rightMl: z.number().int().min(0).max(LIMITS.pumpMaxMl),
    durationMin: z.number().int().min(0).max(240).optional(),
  })
  .refine((p) => p.leftMl + p.rightMl > 0, { message: 'pumping_empty' });

export const sleepPayload = z.object({});

export const diaperPayload = z.object({
  kind: z.enum(['wet', 'dirty', 'both']),
  color: z.enum(['yellow', 'brown', 'green', 'black', 'red', 'white']).optional(),
  texture: z.enum(['liquid', 'soft', 'formed', 'hard']).optional(),
  amount: z.enum(['small', 'medium', 'large']).optional(),
});

export const solidsFood = z.object({
  name: z.string().trim().min(1).max(40),
  /** Set by the parent. The app never infers an allergy from logged data. */
  isAllergen: z.boolean(),
});

export const solidsPayload = z.object({
  foods: z.array(solidsFood).min(1).max(30),
  amount: z.enum(['taste', 'little', 'medium', 'lot']).optional(),
  texture: z.enum(['puree', 'mashed', 'soft_pieces', 'finger_food']).optional(),
  reaction: z.string().trim().max(500).optional(),
});

export const otherPayload = z.object({
  title: z.string().trim().min(1).max(80),
});

export const payloadSchemas = {
  bottle: bottlePayload,
  nursing: nursingPayload,
  pumping: pumpingPayload,
  sleep: sleepPayload,
  diaper: diaperPayload,
  solids: solidsPayload,
  other: otherPayload,
} as const;

export type BottlePayload = z.infer<typeof bottlePayload>;
export type NursingPayload = z.infer<typeof nursingPayload>;
export type PumpingPayload = z.infer<typeof pumpingPayload>;
export type SleepPayload = z.infer<typeof sleepPayload>;
export type DiaperPayload = z.infer<typeof diaperPayload>;
export type SolidsPayload = z.infer<typeof solidsPayload>;
export type OtherPayload = z.infer<typeof otherPayload>;

export interface PayloadByType {
  bottle: BottlePayload;
  nursing: NursingPayload;
  pumping: PumpingPayload;
  sleep: SleepPayload;
  diaper: DiaperPayload;
  solids: SolidsPayload;
  other: OtherPayload;
}

export type SyncStatus = 'synced' | 'pending' | 'conflict';

interface EventBase {
  id: string;
  childId: string;
  /** Supabase user id of the author; null while the app is used without an account. */
  createdBy: string | null;
  /** UTC ISO. For sleep this equals startedAt. */
  occurredAt: string;
  startedAt: string | null;
  /** null on a sleep event means the timer is still running. */
  endedAt: string | null;
  notes: string | null;
  clientEventId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Last server version this device has seen (0 = never synced). */
  version: number;
  syncStatus: SyncStatus;
}

export type ActivityEvent = {
  [T in ActivityType]: EventBase & { type: T; payload: PayloadByType[T] };
}[ActivityType];

export type EventOf<T extends ActivityType> = Extract<ActivityEvent, { type: T }>;

/** What a form submits. Timestamps are UTC ISO. */
export type ActivityDraft = {
  [T in ActivityType]: {
    type: T;
    occurredAt: string;
    startedAt?: string | null;
    endedAt?: string | null;
    notes?: string | null;
    payload: PayloadByType[T];
  };
}[ActivityType];

export class ValidationError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ValidationError';
  }
}

/**
 * Validates and normalises a draft before it is allowed anywhere near storage.
 * Mirrors the CHECK constraints in the Postgres schema.
 */
export function validateDraft(draft: ActivityDraft, now: Date = new Date()): ActivityDraft {
  const parsed = payloadSchemas[draft.type].safeParse(draft.payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ValidationError(`invalid_payload:${draft.type}:${first?.path.join('.') || first?.message || 'payload'}`);
  }
  const occurred = Date.parse(draft.occurredAt);
  if (Number.isNaN(occurred)) throw new ValidationError('invalid_time');
  // Small allowance for clock drift between devices.
  if (occurred > now.getTime() + 5 * 60_000) throw new ValidationError('future_time');

  let startedAt = draft.startedAt ?? null;
  const endedAt = draft.endedAt ?? null;
  if (draft.type === 'sleep') startedAt = startedAt ?? draft.occurredAt;
  if (startedAt && Number.isNaN(Date.parse(startedAt))) throw new ValidationError('invalid_time');
  if (endedAt && Number.isNaN(Date.parse(endedAt))) throw new ValidationError('invalid_time');
  if (startedAt && endedAt) {
    const span = Date.parse(endedAt) - Date.parse(startedAt);
    if (span < 0) throw new ValidationError('end_before_start');
    if (draft.type === 'sleep' && span > LIMITS.sleepMaxHours * 3_600_000) throw new ValidationError('sleep_too_long');
  }
  if (endedAt && Date.parse(endedAt) > now.getTime() + 5 * 60_000) throw new ValidationError('future_time');

  const notes = draft.notes?.trim() ? draft.notes.trim().slice(0, LIMITS.notesMax) : null;
  return {
    ...draft,
    payload: parsed.data,
    occurredAt: draft.type === 'sleep' && startedAt ? startedAt : draft.occurredAt,
    startedAt,
    endedAt,
    notes,
  } as ActivityDraft;
}

export function isFeeding(e: ActivityEvent): e is EventOf<'bottle'> | EventOf<'nursing'> {
  return e.type === 'bottle' || e.type === 'nursing';
}

export function isActiveSleep(e: ActivityEvent): e is EventOf<'sleep'> {
  return e.type === 'sleep' && e.endedAt === null && e.deletedAt === null;
}

/** Sleep duration in minutes; a running sleep is measured up to `now`. */
export function sleepMinutes(e: EventOf<'sleep'>, now: Date = new Date()): number {
  const start = Date.parse(e.startedAt ?? e.occurredAt);
  const end = e.endedAt ? Date.parse(e.endedAt) : now.getTime();
  return Math.max(0, Math.round((end - start) / 60_000));
}

export type FilterKey = 'all' | 'feeding' | 'sleep' | 'diaper' | 'solids' | 'other';

export function matchesFilter(e: ActivityEvent, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'feeding':
      return e.type === 'bottle' || e.type === 'nursing' || e.type === 'pumping';
    case 'sleep':
      return e.type === 'sleep';
    case 'diaper':
      return e.type === 'diaper';
    case 'solids':
      return e.type === 'solids';
    case 'other':
      return e.type === 'other';
  }
}
