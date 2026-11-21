import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { ActivityDraft, ActivityEvent } from '@/domain/activity';
import type { ChildDraft, MeasurementDraft } from '@/domain/child';
import type { MilestoneDraft } from '@/data/repositories/milestones';
import { addDays, startOfDay } from '@/lib/time';
import { useServices } from '@/state/services';
import { loadFamilies } from '@/services/family';
import { useSession } from '@/state/session';

/** Re-renders on an interval. Timers are always derived from stored timestamps, this only refreshes the view. */
export function useNow(intervalMs: number, enabled = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}

export function useChildren() {
  const { children } = useServices();
  return useQuery({ queryKey: ['children'], queryFn: () => children.list() });
}

/** The child every screen is currently about. Falls back to the first child if the stored id is gone. */
export function useActiveChild() {
  const query = useChildren();
  const { kv } = useServices();
  const activeChildId = useSession((s) => s.activeChildId);
  const setActiveChildId = useSession((s) => s.setActiveChildId);
  const list = query.data;
  const child = useMemo(() => list?.find((c) => c.id === activeChildId) ?? list?.[0] ?? null, [list, activeChildId]);

  useEffect(() => {
    if (child && child.id !== activeChildId) {
      setActiveChildId(child.id);
      void kv.set('active_child_id', child.id);
    }
  }, [child, activeChildId, setActiveChildId, kv]);

  const select = (id: string) => {
    setActiveChildId(id);
    void kv.set('active_child_id', id);
  };
  return { child, children: list ?? [], isLoading: query.isLoading, select };
}

/** Events for a local calendar range [fromDay, toDay] inclusive, including sleeps overlapping it. */
export function useEventsBetween(childId: string | undefined, fromDay: Date, toDay: Date) {
  const { events } = useServices();
  const fromIso = startOfDay(fromDay).toISOString();
  const toIso = startOfDay(addDays(toDay, 1)).toISOString();
  return useQuery({
    queryKey: ['events', childId, 'range', fromIso, toIso],
    queryFn: () => events.listInRange(childId!, fromIso, toIso),
    enabled: !!childId,
  });
}

export function useRecentEvents(childId: string | undefined, limit: number) {
  const { events } = useServices();
  return useQuery({ queryKey: ['events', childId, 'recent', limit], queryFn: () => events.listRecent(childId!, limit), enabled: !!childId });
}

export function useEvent(id: string | undefined) {
  const { events } = useServices();
  return useQuery({ queryKey: ['events', 'byId', id], queryFn: () => events.getById(id!), enabled: !!id });
}

export function useActiveSleep(childId: string | undefined) {
  const { events } = useServices();
  return useQuery({ queryKey: ['events', childId, 'activeSleep'], queryFn: () => events.getActiveSleep(childId!), enabled: !!childId });
}

export function useLastBottle(childId: string | undefined) {
  const { events } = useServices();
  return useQuery({ queryKey: ['events', childId, 'lastBottle'], queryFn: () => events.lastOfType(childId!, 'bottle'), enabled: !!childId });
}

export function useFoodHistory(childId: string | undefined, beforeIso?: string) {
  const { events } = useServices();
  return useQuery({ queryKey: ['events', childId, 'foods', beforeIso ?? 'all'], queryFn: () => events.foodHistory(childId!, beforeIso), enabled: !!childId });
}

export function useUnsynced() {
  const { events } = useServices();
  return useQuery({ queryKey: ['events', 'unsynced'], queryFn: () => events.countUnsynced() });
}

export function useConflicts(childId: string | undefined) {
  const { events } = useServices();
  return useQuery({ queryKey: ['events', childId, 'conflicts'], queryFn: () => events.listConflicts(childId!), enabled: !!childId });
}

/**
 * All event writes go through here. A mutation resolves only after the local database
 * has the row, then every screen that shows events is refreshed and a sync is requested.
 */
export function useEventMutations() {
  const { events, requestSync } = useServices();
  const qc = useQueryClient();
  const userId = useSession((s) => s.user?.id ?? null);
  const done = async () => {
    await qc.invalidateQueries({ queryKey: ['events'] });
    requestSync();
  };
  const create = useMutation({
    mutationFn: ({ childId, draft, id }: { childId: string; draft: ActivityDraft; id?: string }): Promise<ActivityEvent> =>
      events.create(childId, draft, { id, createdBy: userId }),
    onSuccess: done,
  });
  const update = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: ActivityDraft }) => events.update(id, draft),
    onSuccess: done,
  });
  const remove = useMutation({ mutationFn: (id: string) => events.remove(id), onSuccess: done });
  const endSleep = useMutation({ mutationFn: (id: string) => events.endSleep(id), onSuccess: done });
  return { create, update, remove, endSleep };
}

export function useChildMutations() {
  const { children, requestSync } = useServices();
  const qc = useQueryClient();
  const done = async () => {
    await qc.invalidateQueries({ queryKey: ['children'] });
    requestSync();
  };
  const create = useMutation({ mutationFn: (draft: ChildDraft) => children.create(draft), onSuccess: done });
  const update = useMutation({ mutationFn: ({ id, draft }: { id: string; draft: ChildDraft }) => children.update(id, draft), onSuccess: done });
  const remove = useMutation({ mutationFn: (id: string) => children.remove(id), onSuccess: done });
  const setAvatar = useMutation({
    mutationFn: ({ id, avatar }: { id: string; avatar: string }) => children.setAvatar(id, avatar),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['children'] }),
  });
  return { create, update, remove, setAvatar };
}

export function useMeasurements(childId: string | undefined) {
  const { measurements } = useServices();
  return useQuery({ queryKey: ['measurements', childId], queryFn: () => measurements.list(childId!), enabled: !!childId });
}

export function useMeasurementMutations(childId: string | undefined) {
  const { measurements, requestSync } = useServices();
  const qc = useQueryClient();
  const done = async () => {
    await qc.invalidateQueries({ queryKey: ['measurements'] });
    requestSync();
  };
  const create = useMutation({ mutationFn: (draft: MeasurementDraft) => measurements.create(childId!, draft), onSuccess: done });
  const remove = useMutation({ mutationFn: (id: string) => measurements.remove(id), onSuccess: done });
  return { create, remove };
}

/** The signed-in user's families and what they may do in each. Undefined while signed out or loading. */
export function useFamilies() {
  const userId = useSession((s) => s.user?.id ?? null);
  return useQuery({ queryKey: ['families', userId], queryFn: loadFamilies, enabled: !!userId, staleTime: 60_000 });
}
/** Whether the user may edit the child's profile and health data: true unless they joined that child's family as a caregiver or viewer. */
export function useCanManage(familyId: string | null | undefined): boolean {
  const families = useFamilies();
  const role = families.data?.find((f) => f.id === familyId)?.myRole;
  return role === undefined || role === 'owner' || role === 'parent';
}

export function useMilestones(childId: string | undefined) {
  const { milestones } = useServices();
  return useQuery({ queryKey: ['milestones', childId], queryFn: () => milestones.list(childId!), enabled: !!childId });
}

export function useMilestoneMutations(childId: string | undefined) {
  const { milestones, requestSync } = useServices();
  const qc = useQueryClient();
  const done = async () => { await qc.invalidateQueries({ queryKey: ['milestones'] }); requestSync(); };
  const mark = useMutation({ mutationFn: ({ key, draft }: { key: string; draft: MilestoneDraft }) => milestones.markCatalog(childId!, key, draft), onSuccess: done });
  const add = useMutation({ mutationFn: (draft: MilestoneDraft) => milestones.addCustom(childId!, draft), onSuccess: done });
  const update = useMutation({ mutationFn: ({ id, draft }: { id: string; draft: MilestoneDraft }) => milestones.update(id, draft), onSuccess: done });
  const remove = useMutation({ mutationFn: (id: string) => milestones.remove(id), onSuccess: done });
  return { mark, add, update, remove };
}
