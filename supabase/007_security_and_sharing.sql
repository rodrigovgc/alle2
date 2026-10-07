-- Alle update 007: security fixes from Supabase Advisor + deck sharing.
-- Paste this whole file into Supabase → SQL Editor and click Run. Safe to run again.

------------------------------------------------------------------------------
-- 1. Dashboard without views
-- The stats views were flagged (Exposed Auth Users, Security Definer View).
-- The queries now live inside the owner-only dashboard functions, and the
-- views are removed, so nothing is exposed through the API.
------------------------------------------------------------------------------
drop function if exists public.dash_overview();
drop function if exists public.dash_funnel();
drop function if exists public.dash_ready_made();
drop function if exists public.dash_events();
drop function if exists public.dash_activity();

drop view if exists public.stats_overview;
drop view if exists public.stats_funnel;
drop view if exists public.stats_ready_made;
drop view if exists public.stats_events;
drop view if exists public.stats_activity;

-- The owner check keeps your email from 005; this only hardens it.
alter function public.is_owner() set search_path = public;

create function public.dash_overview()
returns table (users bigint, decks bigint, ready_made_decks bigint, sheet_decks bigint, ai_or_pasted_decks bigint, active_14d bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from auth.users),
    (select count(*) from public.decks),
    (select count(*) from public.decks where is_sample),
    (select count(*) from public.decks where not is_sample and csv_url is not null),
    (select count(*) from public.decks where not is_sample and csv_url is null),
    (select count(distinct user_id) from public.progress where last_reviewed_at > now() - interval '14 days')
  where public.is_owner();
$$;

create function public.dash_funnel()
returns table (signed_up bigint, made_own_deck bigint, imported_sheet bigint, created_ai bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from auth.users),
    (select count(distinct user_id) from public.decks where not is_sample),
    (select count(distinct user_id) from public.decks where not is_sample and csv_url is not null),
    (select count(distinct user_id) from public.decks where not is_sample and csv_url is null)
  where public.is_owner();
$$;

create function public.dash_ready_made()
returns table (title text, adds bigint)
language sql stable security definer set search_path = public as $$
  select d.title, count(*) from public.decks d
  where d.is_sample and public.is_owner()
  group by d.title order by 2 desc;
$$;

create function public.dash_events()
returns table (name text, props jsonb, n bigint)
language sql stable security definer set search_path = public as $$
  select e.name, e.props, count(*) from public.events e
  where public.is_owner()
  group by e.name, e.props order by 3 desc;
$$;

create function public.dash_activity()
returns table (day date, reviews bigint, people bigint)
language sql stable security definer set search_path = public as $$
  select date_trunc('day', p.last_reviewed_at)::date, count(*), count(distinct p.user_id)
  from public.progress p
  where p.last_reviewed_at > now() - interval '14 days' and public.is_owner()
  group by 1 order by 1;
$$;

-- Only signed-in people can call them (and they return nothing unless you're the owner).
revoke all on function public.dash_overview(), public.dash_funnel(), public.dash_ready_made(),
  public.dash_events(), public.dash_activity(), public.is_owner() from public, anon;
grant execute on function public.dash_overview(), public.dash_funnel(), public.dash_ready_made(),
  public.dash_events(), public.dash_activity() to authenticated;

------------------------------------------------------------------------------
-- 2. Faster security rules (Auth RLS Initialization Plan)
-- "(select auth.uid())" is worked out once per request instead of per row.
------------------------------------------------------------------------------
drop policy if exists "own decks" on public.decks;
create policy "own decks" on public.decks
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "insert own events" on public.events;
create policy "insert own events" on public.events
  for insert with check ((select auth.uid()) = user_id);

------------------------------------------------------------------------------
-- 3. Deck sharing
-- A deck can have a secret share code. Signed-in people with the link can
-- read that one deck's cards to add a copy: never the owner, never progress.
------------------------------------------------------------------------------
alter table public.decks add column if not exists share_id uuid unique;

drop function if exists public.get_shared_deck(uuid);
create function public.get_shared_deck(sid uuid)
returns table (
  title text, front_label text, back_label text, lang text,
  color text, shape text, answer_mode text, csv_url text, cards jsonb
)
language sql stable security definer set search_path = public as $$
  select d.title, d.front_label, d.back_label, d.lang,
         d.color, d.shape, d.answer_mode, d.csv_url, d.cards::jsonb
  from public.decks d
  where d.share_id = sid and (select auth.uid()) is not null
  limit 1;
$$;

revoke all on function public.get_shared_deck(uuid) from public, anon;
grant execute on function public.get_shared_deck(uuid) to authenticated;

-- Delete-account function (from 006): signed-in only.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
