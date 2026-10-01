import { supabase } from './supabase.js';

const DECK_FIELDS = '*'; // tolerant of optional columns added by later migrations

function check({ data, error }) {
  if (error) throw error;
  return data;
}

/* ---- Decks ------------------------------------------------------------- */

export async function listDecks() {
  return check(await supabase.from('decks').select(DECK_FIELDS).order('created_at', { ascending: true }));
}

export async function createDeck(deck) {
  return check(await supabase.from('decks').insert(deck).select(DECK_FIELDS).single());
}

export async function updateDeck(id, patch) {
  return check(await supabase.from('decks').update(patch).eq('id', id).select(DECK_FIELDS).single());
}

export async function removeDeck(id) {
  check(await supabase.from('decks').delete().eq('id', id));
}

/* ---- Progress ---------------------------------------------------------- */

export async function listProgress(deckIds) {
  if (!deckIds.length) return [];
  return check(
    await supabase
      .from('progress')
      .select('deck_id,card_hash,box,due_at,last_reviewed_at,reviews,lapses')
      .in('deck_id', deckIds),
  );
}

export async function saveProgress(row) {
  check(await supabase.from('progress').upsert(row, { onConflict: 'user_id,deck_id,card_hash' }));
}

/* ---- Preferences ------------------------------------------------------ */

export async function updatePrefs(patch) {
  const { data, error } = await supabase.auth.updateUser({ data: patch });
  if (error) throw error;
  return data.user;
}
