-- Supabase/PostgreSQL. Enable anonymous sign-ins in Auth settings.
create table if not exists public.rider_scores (
 rider uuid not null references auth.users(id) on delete cascade,
 mode text not null,
 nickname text not null check (nickname ~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,15}$'),
 points int not null check (points between 0 and 1425),
 primary key(rider,mode)
);
alter table public.rider_scores enable row level security;
alter table public.rider_scores drop constraint if exists rider_scores_mode_check;
alter table public.rider_scores add constraint rider_scores_mode_check check(mode in ('route','yard','urgent','mower','walk'));
revoke all on public.rider_scores from public, anon, authenticated;
grant select(mode,nickname,points) on public.rider_scores to authenticated;
drop policy if exists rider_read on public.rider_scores;
create policy rider_read on public.rider_scores for select to authenticated using(true);
create or replace function public.post_rider_best(m text,n text,v int) returns void
language sql security definer set search_path='' as $$
 insert into public.rider_scores as s(rider,mode,nickname,points) values(auth.uid(),m,n,v)
 on conflict(rider,mode) do update set nickname=excluded.nickname,points=greatest(s.points,excluded.points)
$$;
revoke all on function public.post_rider_best(text,text,int) from public,anon;
grant execute on function public.post_rider_best(text,text,int) to authenticated;
