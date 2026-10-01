-- Alle update: lets people put their decks in their own order.
-- Run once in Supabase → SQL Editor. Safe to run again.
alter table public.decks add column if not exists position double precision;
