-- היסטוריית משחקים וסטטיסטיקות בחשבון. להריץ פעם אחת ב-Supabase → SQL Editor
create table if not exists public.mokesh_history(id bigserial primary key,user_id uuid not null references auth.users(id) on delete cascade,at timestamptz not null default now(),gkey text not null,d jsonb not null default '{}'::jsonb,unique(user_id,gkey));
create index if not exists mokesh_history_u on public.mokesh_history(user_id,at desc);
alter table public.mokesh_history enable row level security;
drop policy if exists h_own on public.mokesh_history;
create policy h_own on public.mokesh_history for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.mokesh_history from anon;
grant select on public.mokesh_history to authenticated;
create or replace function public.mokesh_record_game2(p_key text,p jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare st jsonb; won boolean:=coalesce((p->>'res')='win',false); played boolean:=coalesce((p->>'res'),'none')<>'none'; n int;
 c int:=least(greatest(coalesce((p->>'correct')::int,0),0),60); tr int:=least(greatest(coalesce((p->>'traps')::int,0),0),60); ex int:=least(greatest(coalesce((p->>'expl')::int,0),0),60);
begin if auth.uid() is null then raise exception 'login'; end if;
 if pg_column_size(p)>4000 then raise exception 'size'; end if;
 insert into mokesh_history(user_id,gkey,d) values(auth.uid(),left(p_key,80),p) on conflict do nothing; get diagnostics n=row_count;
 select stats into st from mokesh_profiles where id=auth.uid(); st:=coalesce(st,'{}'::jsonb);
 if n=0 then return st; end if;
 st:=st||jsonb_build_object('games',coalesce((st->>'games')::int,0)+1,
   'wins',coalesce((st->>'wins')::int,0)+case when won then 1 else 0 end,
   'correct',coalesce((st->>'correct')::int,0)+c,'traps',coalesce((st->>'traps')::int,0)+tr,'expl',coalesce((st->>'expl')::int,0)+ex,
   'mvp',coalesce((st->>'mvp')::int,0)+case when coalesce((p->>'mvp')::boolean,false) then 1 else 0 end,
   'cur',case when won then coalesce((st->>'cur')::int,0)+1 when played then 0 else coalesce((st->>'cur')::int,0) end,
   'clean',coalesce((st->>'clean')::int,0)+case when won and coalesce((p->>'teamTraps')::int,1)=0 then 1 else 0 end,
   'night',coalesce((st->>'night')::int,0)+case when extract(hour from now() at time zone 'Asia/Jerusalem')<5 then 1 else 0 end,
   'online',coalesce((st->>'online')::int,0)+case when p->>'mode'='online' then 1 else 0 end,
   'local',coalesce((st->>'local')::int,0)+case when p->>'mode'='local' then 1 else 0 end,
   'ai',coalesce((st->>'ai')::int,0)+case when p->>'mode'='ai' then 1 else 0 end,
   'big',coalesce((st->>'big')::int,0)+case when coalesce((p->>'players')::int,0)>=8 then 1 else 0 end);
 st:=st||jsonb_build_object('best',greatest(coalesce((st->>'best')::int,0),(st->>'cur')::int));
 update mokesh_profiles set stats=st where id=auth.uid(); return st; end $$;
revoke all on function public.mokesh_record_game2(text,jsonb) from public,anon;
grant execute on function public.mokesh_record_game2(text,jsonb) to authenticated;
