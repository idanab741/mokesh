import { getSupabase } from './supabase';

export interface AdminOverview {
  accounts: { total: number; today: number; week: number; month: number };
  families: number;
  shared_families: number;
  children: number;
  active: { day: number; week: number; month: number };
  records: { events: number; events_week: number; by_type: Record<string, number>; photos: number; milestones: number; measurements: number; health: number };
  signups_by_day: { day: string; n: number }[];
  funnel_month: Record<string, number>;
  screens_week: Record<string, number>;
}
export interface AdminAccount { user_id: string; email: string | null; created_at: string; last_active: string | null; families: number; children: number; records: number }

/** True only for an account the server lists as an admin; anyone else gets false, also on any error. */
export async function isAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_app_admin');
  return !error && data === true;
}

export async function loadOverview(): Promise<AdminOverview> {
  const { data, error } = await getSupabase()!.rpc('admin_overview');
  if (error) throw new Error(error.message);
  return data as AdminOverview;
}

export async function loadAccounts(offset = 0): Promise<AdminAccount[]> {
  const { data, error } = await getSupabase()!.rpc('admin_accounts', { p_limit: 50, p_offset: offset });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAccount[];
}
