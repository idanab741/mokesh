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

export interface AdminInsights {
  records_by_day: { day: string; n: number }[];
  visitors_by_day: { day: string; n: number }[];
  by_hour: { hour: number; n: number }[];
  children_age: { m0_3: number; m3_6: number; m6_12: number; m12_24: number; m24_plus: number };
  children_sex: Record<string, number>;
  adoption: { accounts: number; logged: number; photos: number; milestones: number; measurements: number; health: number; sharing: number };
  retention: { cohort: number; retained: number; never_logged: number; no_child: number };
  sharing: { invites: number; accepted: number; pending: number; roles: Record<string, number> };
  storage: { photos: number; files: number; bytes: number };
}
export interface AdminAccountDetail {
  email: string | null; created_at: string | null; last_sign_in: string | null; last_record: string | null;
  roles: { role: string; members: number }[];
  children: { age_months: number; sex: string }[];
  by_type: Record<string, number>;
  week: number; days_active_30: number; photos: number; milestones: number; measurements: number; health: number;
}

export async function loadInsights(): Promise<AdminInsights> {
  const { data, error } = await getSupabase()!.rpc('admin_insights');
  if (error) throw new Error(error.message);
  return data as AdminInsights;
}

export async function searchAccounts(search: string, limit = 50): Promise<AdminAccount[]> {
  const { data, error } = await getSupabase()!.rpc('admin_search_accounts', { p_search: search.trim(), p_limit: limit, p_offset: 0 });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAccount[];
}

export async function loadAccount(userId: string): Promise<AdminAccountDetail> {
  const { data, error } = await getSupabase()!.rpc('admin_account', { p_user: userId });
  if (error) throw new Error(error.message);
  return data as AdminAccountDetail;
}

/** The accounts list as a CSV file (web) for a spreadsheet. */
export function accountsCsv(rows: AdminAccount[]): string {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [['email', 'registered', 'last_active', 'children', 'records', 'families'].join(','),
    ...rows.map((a) => [a.email, a.created_at, a.last_active, a.children, a.records, a.families].map(cell).join(','))].join('\n');
}
