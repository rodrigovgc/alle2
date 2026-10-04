-- Alle update: "Delete account" removes the login itself, not just the decks.
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Runs with elevated rights (security definer) so it can remove the login, but
-- it can only ever delete the account of whoever is calling it (auth.uid()).
-- Decks, progress and events go with it automatically (on delete cascade).

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
