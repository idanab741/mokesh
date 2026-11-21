import { Platform } from 'react-native';
import { getSupabase } from './supabase';

export type FamilyRole = 'owner' | 'parent' | 'caregiver' | 'relative';
export interface FamilyMember { id: string; userId: string; name: string | null; role: FamilyRole; isMe: boolean; canEditTracking: boolean }
export interface Family { id: string; name: string; myRole: FamilyRole; members: FamilyMember[] }

export const roleLabel: Record<FamilyRole, string> = { owner: 'מנהל/ת המשפחה', parent: 'הורה', caregiver: 'מטפל/ת', relative: 'צפייה בלבד' };
/** What an invited person will be able to do, in the inviter's words. */
export const roleExplain: Record<Exclude<FamilyRole, 'owner'>, string> = {
  parent: 'רואה ומתעד הכול, כולל מידע רפואי, ויכול לערוך את פרטי הילדים.',
  caregiver: 'רואה ומתעד האכלות, שינה וחיתולים. בלי מדידות גדילה ובלי עריכת פרטי הילדים.',
  relative: 'רואה את התיעוד בלבד, בלי לשנות.',
};

const TOKEN = /^[a-f0-9]{64}$/;
const KEY = 'lilbaby_invite';
let memory: string | null = null;

function fail(error: { message: string }): never { throw new Error(error.message); }

/** Every family the signed-in user belongs to, with its members. Empty when signed out or offline-only. */
export async function loadFamilies(): Promise<Family[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user;
  if (!me) return [];
  // The profile row is what the rest of the family sees as this person's name.
  const displayName = typeof me.user_metadata?.display_name === 'string' ? me.user_metadata.display_name.trim() : '';
  if (displayName) await supabase.from('users').upsert({ id: me.id, display_name: displayName.slice(0, 80) }, { onConflict: 'id' });

  const members = await supabase.from('family_members').select('id, family_id, user_id, role, can_edit_tracking, created_at').order('created_at');
  if (members.error) fail(members.error);
  const rows = members.data ?? [];
  const familyIds = [...new Set(rows.map((r) => r.family_id as string))];
  if (familyIds.length === 0) return [];
  const [families, users] = await Promise.all([
    supabase.from('families').select('id, name').in('id', familyIds),
    supabase.from('users').select('id, display_name').in('id', [...new Set(rows.map((r) => r.user_id as string))]),
  ]);
  if (families.error) fail(families.error);
  if (users.error) fail(users.error);
  const names = new Map((users.data ?? []).map((u) => [u.id as string, (u.display_name as string | null) ?? null]));
  return (families.data ?? []).map((f) => {
    const mine = rows.filter((r) => r.family_id === f.id);
    return {
      id: f.id as string, name: f.name as string,
      myRole: (mine.find((r) => r.user_id === me.id)?.role ?? 'relative') as FamilyRole,
      members: mine.map((r) => ({
        id: r.id as string, userId: r.user_id as string, name: names.get(r.user_id as string) ?? null,
        role: r.role as FamilyRole, isMe: r.user_id === me.id, canEditTracking: !!r.can_edit_tracking,
      })),
    };
  });
}

/** Creates a family for a signed-in user who has none yet, so there is something to invite into. */
export async function ensureOwnFamily(name: string): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud not configured');
  const { data, error } = await supabase.rpc('create_family', { p_name: name });
  if (error) fail(error);
  return data as string;
}

/** Returns the one-time code. The server keeps only its hash; it is valid for 7 days and for one person. */
export async function createInvitation(familyId: string, role: Exclude<FamilyRole, 'owner'>): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud not configured');
  const { data, error } = await supabase.rpc('create_invitation', { p_family: familyId, p_role: role });
  if (error) fail(error);
  return data as string;
}

export async function acceptInvitation(code: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud not configured');
  const { error } = await supabase.rpc('accept_invitation', { p_token: code.trim().toLowerCase() });
  if (error) fail(error);
}

/** An owner removes someone, or a member leaves. The server refuses to remove the last owner. */
export async function removeMember(memberId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud not configured');
  const { data, error } = await supabase.from('family_members').delete().eq('id', memberId).select('id');
  if (error) fail(error);
  if (!data || data.length === 0) throw new Error('not removed');
}

export function isInviteCode(code: string): boolean { return TOKEN.test(code.trim().toLowerCase()); }

/** The link an invited person opens. It carries the code in the query, which every host serves. */
export function inviteLink(code: string): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const base = window.location.pathname.startsWith('/parents') ? '/parents/' : '/';
  return `${window.location.origin}${base}?join=${code}`;
}

/** On the web an invitation arrives as ?join=CODE. It is kept until the person is signed in, and removed from the address bar. */
export function captureInviteFromUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('join');
    if (!code) return;
    if (isInviteCode(code)) { memory = code.toLowerCase(); window.localStorage.setItem(KEY, memory); }
    url.searchParams.delete('join');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch { /* an unreadable address simply carries no invitation */ }
}

export function pendingInvite(): string | null {
  if (memory) return memory;
  try { const v = Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null; return v && isInviteCode(v) ? v : null; } catch { return null; }
}
export function setPendingInvite(code: string | null): void {
  memory = code;
  try {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (code) window.localStorage.setItem(KEY, code); else window.localStorage.removeItem(KEY);
  } catch { /* storage may be unavailable; the in-memory copy still works for this visit */ }
}

/** Accepts a waiting invitation, if there is one. Returns what happened so the screen can say it. */
export async function acceptPendingInvite(): Promise<'none' | 'joined' | 'invalid'> {
  const code = pendingInvite();
  if (!code) return 'none';
  try {
    await acceptInvitation(code);
    setPendingInvite(null);
    return 'joined';
  } catch (err) {
    // "not valid" covers used, expired and revoked codes alike; a network failure keeps the code for the next try.
    if (err instanceof Error && /not valid/i.test(err.message)) { setPendingInvite(null); return 'invalid'; }
    throw err;
  }
}

/** The name the rest of the family sees for the signed-in user. */
export async function setMyName(name: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud not configured');
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('signed out');
  const clean = name.trim().slice(0, 80);
  const { error } = await supabase.from('users').upsert({ id: data.user.id, display_name: clean }, { onConflict: 'id' });
  if (error) fail(error);
  await supabase.auth.updateUser({ data: { display_name: clean } });
}
