import type { ActivityEvent, ActivityType, PayloadByType } from '@/domain/activity';

let seq = 0;

/** Builds an event at a local wall-clock time such as '2026-11-19T07:00:00'. */
export function makeEvent<T extends ActivityType>(
  type: T,
  localTime: string,
  payload: PayloadByType[T],
  extra: { endedAt?: string | null; childId?: string } = {},
): Extract<ActivityEvent, { type: T }> {
  seq += 1;
  const iso = new Date(localTime).toISOString();
  return {
    id: `event-${seq}`,
    childId: extra.childId ?? 'child-1',
    createdBy: null,
    type,
    occurredAt: iso,
    startedAt: type === 'sleep' ? iso : null,
    endedAt: extra.endedAt ? new Date(extra.endedAt).toISOString() : null,
    payload,
    notes: null,
    clientEventId: `event-${seq}`,
    createdAt: iso,
    updatedAt: iso,
    deletedAt: null,
    version: 0,
    syncStatus: 'pending',
  } as Extract<ActivityEvent, { type: T }>;
}
