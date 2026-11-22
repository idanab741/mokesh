import { newId } from '@/lib/id';
import { getSupabase } from './supabase';

/**
 * Anonymous usage counts for the app's own admin screen: which screen was opened, from a random
 * id that lives on this device. No names, no diary, nothing a family wrote. Never blocks the app.
 */
export type TrackKind =
  | 'welcome_view' | 'peek_start' | 'account_prompt' | 'signup_done' | 'signin_done'
  | 'screen_home' | 'screen_journal' | 'screen_stats' | 'screen_child' | 'screen_album' | 'screen_reminders'
  | 'screen_health' | 'screen_milestones' | 'screen_growth' | 'screen_foods' | 'screen_family' | 'screen_report';

const KEY = 'lilbaby_anon_id';
let anon: string | null = null;
function anonId(): string {
  if (anon) return anon;
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    anon = stored ?? newId();
    if (!stored && typeof localStorage !== 'undefined') localStorage.setItem(KEY, anon);
  } catch {
    anon = newId();
  }
  return anon;
}

const seen = new Map<string, number>();
export function track(kind: TrackKind): void {
  const supabase = getSupabase();
  if (!supabase) return;
  // The same screen within a minute counts once.
  const now = Date.now();
  if (now - (seen.get(kind) ?? 0) < 60_000) return;
  seen.set(kind, now);
  void supabase.rpc('track_event', { p_kind: kind, p_anon: anonId() }).then(() => undefined, () => undefined);
}

const SCREENS: Record<string, TrackKind> = {
  '/': 'screen_home', '/journal': 'screen_journal', '/stats': 'screen_stats', '/child': 'screen_child', '/album': 'screen_album',
  '/reminders': 'screen_reminders', '/health': 'screen_health', '/milestones': 'screen_milestones', '/growth': 'screen_growth',
  '/foods': 'screen_foods', '/family': 'screen_family', '/report': 'screen_report', '/welcome': 'welcome_view',
};
export function trackPath(path: string): void {
  const kind = SCREENS[path];
  if (kind) track(kind);
}
