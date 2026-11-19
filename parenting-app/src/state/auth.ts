import { getSupabase } from '@/services/supabase';
import { useSession } from './session';

/** Subscribes the session store to Supabase auth. Returns an unsubscribe function. */
export function initAuth(onSignedIn: () => void): () => void {
  const supabase = getSupabase();
  const { setUser, setAuthReady } = useSession.getState();
  if (!supabase) {
    setAuthReady();
    return () => {};
  }
  supabase.auth
    .getSession()
    .then(({ data }) => {
      const u = data.session?.user;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      if (u) onSignedIn();
    })
    .catch(() => setUser(null))
    .finally(setAuthReady);

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const u = session?.user;
    setUser(u ? { id: u.id, email: u.email ?? null } : null);
    if (event === 'SIGNED_IN') onSignedIn();
  });
  return () => data.subscription.unsubscribe();
}

export type AuthOutcome = { ok: true; needsEmailConfirmation?: boolean } | { ok: false; message: string };

function authMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login')) return 'האימייל או הסיסמה אינם נכונים.';
  if (m.includes('email not confirmed')) return 'צריך לאשר את כתובת האימייל לפני הכניסה. שלחנו אליך קישור אישור.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'כבר קיים חשבון עם האימייל הזה. אפשר להיכנס.';
  if (m.includes('password')) return 'הסיסמה חלשה מדי. נדרשים לפחות 8 תווים.';
  if (m.includes('rate limit')) return 'יותר מדי ניסיונות. אפשר לנסות שוב בעוד כמה דקות.';
  if (m.includes('network') || m.includes('fetch')) return 'אין חיבור לשרת כרגע. כדאי לבדוק את החיבור לאינטרנט.';
  return 'לא הצלחנו להשלים את הפעולה. אפשר לנסות שוב.';
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'חשבונות ענן אינם מוגדרים בגרסה הזו.' };
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, message: authMessage(error.message) } : { ok: true };
  } catch (err) {
    return { ok: false, message: authMessage(err instanceof Error ? err.message : '') };
  }
}

export async function signUp(email: string, password: string, displayName: string): Promise<AuthOutcome> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'חשבונות ענן אינם מוגדרים בגרסה הזו.' };
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) return { ok: false, message: authMessage(error.message) };
    // With email confirmation enabled (the default) there is no session until the link is opened.
    return { ok: true, needsEmailConfirmation: !data.session };
  } catch (err) {
    return { ok: false, message: authMessage(err instanceof Error ? err.message : '') };
  }
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}
