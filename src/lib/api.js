import { supabase } from './supabase.js';
import { SAMPLE_DECK } from './sampleDeck.js';

const DECK_FIELDS = 'id,title,csv_url,front_label,back_label,lang,color,cards,is_sample,created_at';

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

/* ---- First login ------------------------------------------------------- */

/** Seeds the sample deck exactly once per account (flag lives in user metadata). */
export async function ensureOnboarded(user) {
  if (user.user_metadata?.seeded) return user;
  await createDeck(SAMPLE_DECK);
  return updatePrefs({ seeded: true, sample_banner_dismissed: false });
}

export async function updatePrefs(patch) {
  const { data, error } = await supabase.auth.updateUser({ data: patch });
  if (error) throw error;
  return data.user;
}
