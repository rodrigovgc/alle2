-- Alle update: lets each deck pick a shape separately from its colour.
-- Run once in Supabase → SQL Editor. Safe to run again.
alter table public.decks add column if not exists shape text;
