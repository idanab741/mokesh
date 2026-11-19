import type { SupabaseClient } from '@supabase/supabase-js';
import type { RemoteGateway, RemoteRow, SyncTable } from './types';

const PAGE = 500;

function fail(context: string, error: { message: string; code?: string }): never {
  throw new Error(`${context}: ${error.message}${error.code ? ` (${error.code})` : ''}`);
}

export function createSupabaseGateway(supabase: SupabaseClient): RemoteGateway {
  const get = async (table: SyncTable, id: string): Promise<RemoteRow | null> => {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) fail(`get ${table}`, error);
    return (data as RemoteRow | null) ?? null;
  };

  return {
    get,

    async ensureFamily(defaultName) {
      const { data, error } = await supabase.from('family_members').select('family_id, role').order('created_at').limit(1);
      if (error) fail('load family', error);
      if (data && data.length > 0) return data[0].family_id as string;
      const created = await supabase.rpc('create_family', { p_name: defaultName });
      if (created.error) fail('create family', created.error);
      return created.data as string;
    },

    async insert(table, row) {
      // ignoreDuplicates => "insert if absent": a retried request can never create a second row.
      const { data, error } = await supabase.from(table).upsert(row, { onConflict: 'id', ignoreDuplicates: true }).select();
      if (error) fail(`insert ${table}`, error);
      if (data && data.length > 0) return { row: data[0] as RemoteRow, created: true };
      const existing = await get(table, String(row.id));
      if (!existing) throw new Error(`insert ${table}: row was neither created nor readable (permission denied?)`);
      return { row: existing, created: false };
    },

    async update(table, id, baseVersion, patch) {
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).eq('version', baseVersion).select();
      if (error) fail(`update ${table}`, error);
      return data && data.length > 0 ? (data[0] as RemoteRow) : null;
    },

    async pull(table, cursor) {
      const rows: RemoteRow[] = [];
      for (let offset = 0; ; offset += PAGE) {
        let query = supabase.from(table).select('*').order('updated_at', { ascending: true }).order('id', { ascending: true });
        if (cursor) query = query.gte('updated_at', cursor);
        const { data, error } = await query.range(offset, offset + PAGE - 1);
        if (error) fail(`pull ${table}`, error);
        rows.push(...((data ?? []) as RemoteRow[]));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    },
  };
}
