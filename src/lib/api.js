import { SAMPLE_DECKS } from './sampleDeck.js';
import { supabase } from './supabase.js';

const DECK_FIELDS = '*'; // tolerant of optional columns added by later migrations

function check({ data, error }) {
  if (error) throw error;
  return data;
}

/* ---- Decks ------------------------------------------------------------- */

/** Decks in the user's order: by position, then oldest first. Decks without a
 *  position (new ones, or before the 004 migration) go at the end. Sorted here,
 *  not in the query, so a missing column can't break loading. */
export async function listDecks() {
  const rows = check(await supabase.from('decks').select(DECK_FIELDS).order('created_at', { ascending: true }));
  return sortDecks(rows.map(refreshReadyMade));
}

/** A ready-made deck added earlier picks up the latest cards and settings. */
function refreshReadyMade(deck) {
  if (!deck.is_sample) return deck;
  const latest = Object.values(SAMPLE_DECKS).find((d) => d.title === deck.title);
  if (!latest) return deck;
  return {
    ...deck,
    cards: latest.cards,
    answer_mode: deck.answer_mode ?? latest.answer_mode ?? null,
  };
}

export function sortDecks(rows) {
  const pos = (d) => (typeof d.position === 'number' ? d.position : Number.POSITIVE_INFINITY);
  return [...rows].sort((a, b) => pos(a) - pos(b) || String(a.created_at).localeCompare(String(b.created_at)));
}

/** Save a new order: only decks whose position changed are written. */
export async function saveOrder(orderedDecks) {
  const changed = orderedDecks
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => d.position !== i);
  await Promise.all(changed.map(({ d, i }) => updateDeck(d.id, { position: i })));
  return orderedDecks.map((d, i) => ({ ...d, position: i }));
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

/** Forget every card's box and due date in one deck: all cards count as new again. */
export async function resetProgress(deckId) {
  check(await supabase.from('progress').delete().eq('deck_id', deckId));
}

export async function saveProgress(row) {
  check(await supabase.from('progress').upsert(row, { onConflict: 'user_id,deck_id,card_hash' }));
}

/* ---- Preferences ------------------------------------------------------ */

export async function changeEmail(email) {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export async function changePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/**
 * Delete the account completely: the login, decks, progress and events.
 * Uses the delete_own_account() function from supabase/006_delete_account.sql.
 */
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) {
    if (/delete_own_account|function/i.test(error.message)) {
      throw new Error('Deleting accounts needs one database update. Run supabase/006_delete_account.sql in Supabase.');
    }
    throw error;
  }
  await supabase.auth.signOut();
}

export async function updatePrefs(patch) {
  const { data, error } = await supabase.auth.updateUser({ data: patch });
  if (error) throw error;
  return data.user;
}
