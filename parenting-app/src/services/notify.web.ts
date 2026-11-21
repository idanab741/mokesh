import type { Reminder } from '@/domain/reminders';

/**
 * Reminders in a browser. A web page cannot wake itself, so a notification is shown only while
 * the app is open in a tab (or installed on the home screen and open); the list inside the app
 * always shows what is due.
 */
export type NotifyState = 'granted' | 'denied' | 'ask' | 'unsupported';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;
const read = (): NotifyState => (!supported() ? 'unsupported' : Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'ask');

export async function notifyState(): Promise<NotifyState> { return read(); }

export async function askToNotify(): Promise<NotifyState> {
  if (!supported()) return 'unsupported';
  try { await Notification.requestPermission(); } catch { /* an old browser that only takes a callback */ }
  return read();
}

export const NOTIFIES_WHEN_CLOSED = false;

let timers: ReturnType<typeof setTimeout>[] = [];
const shown = new Set<string>();

export async function scheduleReminders(list: readonly Reminder[], now: Date): Promise<void> {
  for (const t of timers) clearTimeout(t);
  timers = [];
  if (read() !== 'granted') return;
  for (const r of list) {
    const wait = r.at.getTime() - now.getTime();
    // Further than a day ahead: the list is scheduled again long before that.
    if (wait <= 0 || wait > 86_400_000 || shown.has(r.key)) continue;
    timers.push(setTimeout(() => {
      shown.add(r.key);
      try { new Notification(r.title, { body: r.body, tag: r.key, lang: 'he', dir: 'rtl' }); } catch { /* some phones only allow it from a service worker */ }
    }, wait));
  }
}
