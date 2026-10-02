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
  return sortDecks(rows);
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

export async function changePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Remove the account's decks and progress, then sign out. (Deleting the auth
 *  user itself needs a server function; this clears everything the user made.) */
export async function deleteAccountData() {
  const decks = await listDecks();
  if (decks.length) {
    check(await supabase.from('progress').delete().in('deck_id', decks.map((d) => d.id)));
    check(await supabase.from('decks').delete().in('id', decks.map((d) => d.id)));
  }
  await supabase.auth.signOut();
}

export async function updatePrefs(patch) {
  const { data, error } = await supabase.auth.updateUser({ data: patch });
  if (error) throw error;
  return data.user;
}
