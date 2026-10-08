-- Alle update 011: share a whole group of decks with one link.
-- Paste into Supabase → SQL Editor and click Run. Safe to run again.

alter table public.deck_groups add column if not exists share_id uuid unique;

-- For signed-in people opening a group link: the group's name and its decks'
-- cards, to add copies. Never the owner or anyone's progress.
create or replace function public.get_shared_group(sid uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'title', g.title,
    'decks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', d.title, 'front_label', d.front_label, 'back_label', d.back_label, 'lang', d.lang,
        'color', d.color, 'shape', d.shape, 'answer_mode', d.answer_mode, 'csv_url', d.csv_url, 'cards', d.cards::jsonb
      ) order by d.position nulls last, d.created_at)
      from public.decks d where d.group_id = g.id), '[]'::jsonb))
  from public.deck_groups g
  where g.share_id = sid and (select auth.uid()) is not null
  limit 1;
$$;
revoke all on function public.get_shared_group(uuid) from public, anon;
grant execute on function public.get_shared_group(uuid) to authenticated;

-- For link previews (WhatsApp, iMessage…), which aren't signed in: just the cover.
create or replace function public.get_shared_group_meta(sid uuid)
returns table (title text, deck_count int, card_count int, color text, shape text)
language sql stable security definer set search_path = public as $$
  select g.title,
         (select count(*)::int from public.decks d where d.group_id = g.id),
         (select coalesce(sum(jsonb_array_length(d.cards::jsonb)), 0)::int from public.decks d where d.group_id = g.id),
         (select d.color from public.decks d where d.group_id = g.id order by d.position nulls last limit 1),
         (select d.shape from public.decks d where d.group_id = g.id order by d.position nulls last limit 1)
  from public.deck_groups g
  where g.share_id = sid
  limit 1;
$$;
revoke all on function public.get_shared_group_meta(uuid) from public;
grant execute on function public.get_shared_group_meta(uuid) to anon, authenticated;
