-- Alle update 009: the owner dashboard (/dashboard).
-- Paste into Supabase → SQL Editor and click Run. Safe to run again.

-- 1. Where each deck came from: ready_made, library, sheet, ai_or_paste, shared.
--    Older decks are worked out from what they contain.
alter table public.decks add column if not exists source text;

-- 2. Everything the dashboard shows, in one call. Returns nothing unless the
--    caller is the owner (is_owner(), set up in 005 with your email).
create or replace function public.dash_insights(days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  span interval := make_interval(days => greatest(1, least(coalesce(days, 30), 365)));
  since timestamptz := now() - span;
  result jsonb;
begin
  if not public.is_owner() then
    return null;
  end if;

  with
  -- Any sign of someone using the app
  act as (
    select user_id, created_at as at from public.events
    union all select user_id, last_reviewed_at from public.progress
    union all select user_id, created_at from public.decks
  ),
  deck_src as (
    select d.*,
      coalesce(d.source,
        case when d.is_sample then 'ready_made'
             when d.csv_url is not null then 'sheet'
             else 'ai_or_paste' end) as src,
      coalesce(jsonb_array_length(d.cards::jsonb), 0) as n_cards
    from public.decks d
  ),
  sess as (
    select user_id, name, created_at,
      coalesce((props->>'total')::int, 0) as total,
      coalesce((props->>'duration_s')::numeric, 0) as dur
    from public.events
    where name in ('session_finished', 'session_left')
  ),
  per_user as (
    select u.id, u.email, u.created_at, u.last_sign_in_at,
      trim(coalesce(u.raw_user_meta_data->>'first_name', '') || ' ' || coalesce(u.raw_user_meta_data->>'last_name', '')) as name,
      (select max(a.at) from act a where a.user_id = u.id) as last_active,
      (select count(distinct a.at::date) from act a where a.user_id = u.id) as active_days,
      (select count(*) from deck_src d where d.user_id = u.id) as decks,
      (select coalesce(sum(p.reviews), 0) from public.progress p where p.user_id = u.id) as reviews,
      (select count(*) from sess s where s.user_id = u.id and s.name = 'session_finished') as sessions,
      (select round(coalesce(sum(s.dur), 0) / 60.0, 1) from sess s where s.user_id = u.id) as minutes,
      (select coalesce(jsonb_agg(jsonb_build_object('title', d.title, 'cards', d.n_cards, 'source', d.src,
                 'labels', concat_ws(' → ', nullif(d.front_label, ''), nullif(d.back_label, '')),
                 'shared', d.share_id is not null, 'created_at', d.created_at) order by d.created_at desc), '[]'::jsonb)
         from deck_src d where d.user_id = u.id) as deck_list
    from auth.users u
  )
  select jsonb_build_object(
    'generated_at', now(),
    'days', extract(day from span)::int,

    'kpis', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'users_new', (select count(*) from auth.users where created_at >= since),
      'users_new_prev', (select count(*) from auth.users where created_at >= since - span and created_at < since),
      'active', (select count(distinct user_id) from act where at >= since),
      'active_prev', (select count(distinct user_id) from act where at >= since - span and at < since),
      'decks', (select count(*) from public.decks),
      'decks_new', (select count(*) from public.decks where created_at >= since),
      'decks_new_prev', (select count(*) from public.decks where created_at >= since - span and created_at < since),
      'reviews', (select coalesce(sum(total), 0) from sess where name = 'session_finished' and created_at >= since),
      'reviews_prev', (select coalesce(sum(total), 0) from sess where name = 'session_finished' and created_at >= since - span and created_at < since),
      'sessions', (select count(*) from sess where name = 'session_finished' and created_at >= since),
      'sessions_left', (select count(*) from sess where name = 'session_left' and created_at >= since),
      'correct', (select coalesce(sum((props->>'correct')::int), 0) from public.events
                  where name = 'session_finished' and created_at >= since and props ? 'correct'),
      'reviews_scored', (select coalesce(sum((props->>'total')::int), 0) from public.events
                  where name = 'session_finished' and created_at >= since and props ? 'correct'),
      'minutes', (select round(coalesce(sum(dur), 0) / 60.0) from sess where created_at >= since),
      'minutes_prev', (select round(coalesce(sum(dur), 0) / 60.0) from sess where created_at >= since - span and created_at < since),
      'shared_decks', (select count(*) from public.decks where share_id is not null),
      'cards_known', (select count(*) from public.progress where box >= 4)
    ),

    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date,
        'active', (select count(distinct user_id) from act where at::date = d::date),
        'reviews', (select coalesce(sum(total), 0) from sess where name = 'session_finished' and created_at::date = d::date),
        'signups', (select count(*) from auth.users where created_at::date = d::date),
        'decks', (select count(*) from public.decks where created_at::date = d::date)
      ) order by d), '[]'::jsonb)
      from generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') d
    ),

    'funnel', jsonb_build_array(
      jsonb_build_object('step', 'Signed up', 'n', (select count(*) from auth.users)),
      jsonb_build_object('step', 'Added a deck', 'n', (select count(distinct user_id) from public.decks)),
      jsonb_build_object('step', 'Studied', 'n', (select count(distinct user_id) from public.progress)),
      jsonb_build_object('step', 'Came back another day', 'n', (select count(*) from per_user where active_days >= 2)),
      jsonb_build_object('step', 'Shared a deck', 'n', (select count(distinct user_id) from public.decks where share_id is not null))
    ),

    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', src, 'decks', n, 'people', p) order by n desc), '[]'::jsonb)
      from (select src, count(*) n, count(distinct user_id) p from deck_src group by src) x
    ),

    'ready_made', (
      select coalesce(jsonb_agg(jsonb_build_object('title', title, 'people', n) order by n desc), '[]'::jsonb)
      from (select title, count(distinct user_id) n from deck_src where src in ('ready_made', 'library') group by title) x
    ),

    'ai_subjects', (
      select coalesce(jsonb_agg(jsonb_build_object('subject', s, 'n', n) order by n desc), '[]'::jsonb)
      from (select coalesce(nullif(props->>'subject', ''), 'Other') s, count(*) n
            from public.events where name = 'ai_deck_created' group by 1) x
    ),

    'languages', (
      select coalesce(jsonb_agg(jsonb_build_object('lang', lang, 'n', n) order by n desc), '[]'::jsonb)
      from (select coalesce(nullif(lang, ''), '?') lang, count(*) n from public.decks group by 1) x
    ),

    'recent_decks', (
      select coalesce(jsonb_agg(r order by (r->>'created_at') desc), '[]'::jsonb) from (
        select jsonb_build_object('title', d.title, 'cards', d.n_cards, 'source', d.src, 'created_at', d.created_at,
          'labels', concat_ws(' → ', nullif(d.front_label, ''), nullif(d.back_label, '')),
          'who', coalesce(nullif(pu.name, ''), pu.email)) r
        from deck_src d join per_user pu on pu.id = d.user_id
        where d.src not in ('ready_made', 'library')
        order by d.created_at desc limit 40) x
    ),

    'top_decks', (
      select coalesce(jsonb_agg(r order by (r->>'reviews')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('title', d.title, 'cards', d.n_cards, 'source', d.src,
          'who', coalesce(nullif(pu.name, ''), pu.email), 'reviews', sum(p.reviews)) r
        from public.progress p
        join deck_src d on d.id = p.deck_id
        join per_user pu on pu.id = d.user_id
        group by d.id, d.title, d.n_cards, d.src, pu.name, pu.email
        order by sum(p.reviews) desc limit 15) x
    ),

    'users', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', name, 'email', email, 'joined', created_at, 'last_sign_in', last_sign_in_at,
        'last_active', last_active, 'active_days', active_days, 'decks', decks, 'reviews', reviews,
        'sessions', sessions, 'minutes', minutes, 'deck_list', deck_list
      ) order by last_active desc nulls last), '[]'::jsonb)
      from (select * from per_user order by last_active desc nulls last limit 500) x
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.dash_insights(int) from public, anon;
grant execute on function public.dash_insights(int) to authenticated;
