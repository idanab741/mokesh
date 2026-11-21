import * as Notifications from 'expo-notifications';
import type { Reminder } from '@/domain/reminders';

/**
 * Reminders as notifications on the phone. The list is replaced as a whole every time it
 * changes, so nothing stale is left scheduled.
 */
export type NotifyState = 'granted' | 'denied' | 'ask' | 'unsupported';

export async function notifyState(): Promise<NotifyState> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function askToNotify(): Promise<NotifyState> {
  try {
    const p = await Notifications.requestPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** True where a notification arrives even when the app is closed. */
export const NOTIFIES_WHEN_CLOSED = true;

export async function scheduleReminders(list: readonly Reminder[], now: Date): Promise<void> {
  try {
    if ((await notifyState()) !== 'granted') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const r of list.filter((x) => x.at.getTime() > now.getTime()).slice(0, 24)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
      });
    }
  } catch {
    // The list inside the app still shows every reminder.
  }
}
