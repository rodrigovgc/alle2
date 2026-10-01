-- Alle update: lets a deck choose typing or multiple choice.
-- Run once in Supabase → SQL Editor. Safe to run again.
alter table public.decks add column if not exists answer_mode text;  -- 'type' | 'choice' | null = automatic
