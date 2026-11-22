import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { type Reminder, type ReminderSettings, isDue, listReminders, parseReminders, pruneDismissed } from '@/domain/reminders';
import { scheduleReminders } from '@/services/notify';
import { useGuest } from '@/state/guest';
import { useServices } from '@/state/services';
import { useActiveSleep, useHealth, useNow, useRecentEvents } from './data';

const FEEDS = new Set(['bottle', 'nursing', 'solids']);

/**
 * The reminders of one child on this device: the settings, what is due now and what is coming,
 * and the two things a parent does with them (change the settings, mark one as done).
 */
export function useReminders(childId: string | undefined) {
  const { kv } = useServices();
  const { guard } = useGuest();
  const qc = useQueryClient();
  const now = useNow(30_000);
  const settingsQ = useQuery({ queryKey: ['reminders', childId, 'settings'], queryFn: async () => parseReminders(await kv.get(`reminders:${childId}`)), enabled: !!childId });
  const doneQ = useQuery({
    queryKey: ['reminders', childId, 'done'], enabled: !!childId,
    queryFn: async () => { try { return JSON.parse((await kv.get(`reminders_done:${childId}`)) ?? '{}') as Record<string, number>; } catch { return {}; } },
  });
  const recent = useRecentEvents(childId, 60);
  const sleep = useActiveSleep(childId);
  const health = useHealth(childId);

  const save = useMutation({
    mutationFn: async (next: ReminderSettings) => { await kv.set(`reminders:${childId}`, JSON.stringify(next)); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders', childId, 'settings'] }),
  });
  const dismiss = useMutation({
    mutationFn: async (key: string) => {
      const next = { ...pruneDismissed(doneQ.data ?? {}, new Date()), [key]: Date.now() };
      await kv.set(`reminders_done:${childId}`, JSON.stringify(next));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders', childId, 'done'] }),
  });

  const settings = settingsQ.data;
  const list: Reminder[] = useMemo(() => {
    if (!settings) return [];
    const events = (recent.data ?? []).filter((e) => e.deletedAt === null);
    const last = (pick: (type: string) => boolean) => {
      const e = events.filter((x) => pick(x.type)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
      return e ? new Date(e.occurredAt) : null;
    };
    return listReminders(settings, {
      lastFeedAt: last((t) => FEEDS.has(t)),
      lastDiaperAt: last((t) => t === 'diaper'),
      asleep: !!sleep.data,
      visits: (health.visits.data ?? []).map((v) => ({ id: v.id, title: v.title, at: new Date(v.at) })),
      dismissed: new Set(Object.keys(doneQ.data ?? {})),
    }, now);
  }, [settings, recent.data, sleep.data, health.visits.data, doneQ.data, now]);

  // Whatever is still ahead is handed to the phone (or the browser tab) as notifications.
  const ahead = list.filter((r) => !isDue(r, now)).map((r) => `${r.key}@${r.at.getTime()}`).join('|');
  useEffect(() => {
    void scheduleReminders(list, new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ahead]);

  return {
    ready: !!settings,
    settings: settings ?? parseReminders(null),
    due: list.filter((r) => isDue(r, now)),
    upcoming: list.filter((r) => !isDue(r, now)),
    // Reminders live in the app's own settings, which a visitor's writes are not blocked from: block them here.
    save: guard((next: ReminderSettings) => save.mutate(next)),
    done: guard((key: string) => dismiss.mutate(key)),
  };
}
