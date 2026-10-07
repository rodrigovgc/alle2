-- Alle update 008: link previews for shared decks.
-- Paste into Supabase → SQL Editor and click Run. Safe to run again.
--
-- When someone pastes a share link into WhatsApp, iMessage, Slack and so on,
-- those apps fetch a preview without being signed in. This returns only what
-- the preview shows: the deck's cover. Never the cards, the owner or anyone's
-- progress, and only for a deck whose secret share code you already have.
-- (Supabase's Advisor will list it under "Public Can Execute SECURITY DEFINER
-- Function"; that's expected for this one, for the reasons above.)

create or replace function public.get_shared_deck_meta(sid uuid)
returns table (title text, front_label text, back_label text, color text, shape text, card_count int)
language sql stable security definer set search_path = public as $$
  select d.title, d.front_label, d.back_label, d.color, d.shape,
         coalesce(jsonb_array_length(d.cards::jsonb), 0)
  from public.decks d
  where d.share_id = sid
  limit 1;
$$;

revoke all on function public.get_shared_deck_meta(uuid) from public;
grant execute on function public.get_shared_deck_meta(uuid) to anon, authenticated;
