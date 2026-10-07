import { supabase } from './supabase.js';
import { READY_MADE, SAMPLE_DECKS, LIBRARY } from './sampleDeck.js';
import { fetchDeckFromUrl } from './csv.js';

// A link can ask the app to add a deck: ?share=<code> (someone's shared deck)
// or ?add=<key> (a ready-made deck, e.g. from the website). The request is kept
// on the device so it survives signing in or creating an account first.

const KEY = 'alle-intent';

/** Read ?share= / ?add= from the address once, keep it, tidy the address. */
export function captureIntent() {
  const url = new URL(window.location.href);
  // /s/<code> is normally answered by the preview page, which forwards to ?share=;
  // if the app is opened on that address directly, read the code from the path.
  const fromPath = url.pathname.match(/^\/s\/([0-9a-f-]{36})\/?$/i);
  const share = url.searchParams.get('share') || (fromPath && fromPath[1]);
  const add = url.searchParams.get('add');
  if (!share && !add) return;
  try { localStorage.setItem(KEY, JSON.stringify(share ? { type: 'share', id: share } : { type: 'add', id: add })); } catch { /* storage off */ }
  url.searchParams.delete('share'); url.searchParams.delete('add');
  window.history.replaceState(null, '', (fromPath ? '/' : url.pathname) + url.search + url.hash);
}

export function readIntent() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function clearIntent() { try { localStorage.removeItem(KEY); } catch { /* storage off */ } }

/** Fetch what the link points to: { title, deck? , key? } or null. */
export async function resolveIntent(intent) {
  if (!intent) return null;
  if (intent.type === 'add') {
    const r = READY_MADE.find((x) => x.key === intent.id);
    if (!r) return null;
    // Labels and card count for the preview: built-in decks have them; library
    // decks are read from their sheet (also reused when adding).
    const built = SAMPLE_DECKS[r.key];
    if (built) {
      return { kind: 'ready', key: r.key, title: r.title, deck: { front_label: built.front_label, back_label: built.back_label, cards: built.cards } };
    }
    const lib = LIBRARY[r.key];
    let cards = [];
    let front = lib?.front_label || '';
    let back = lib?.back_label || '';
    try {
      const parsed = await fetchDeckFromUrl(lib.csv_url);
      cards = parsed.cards; front = parsed.frontLabel || front; back = parsed.backLabel || back;
    } catch { /* preview without a count */ }
    return { kind: 'ready', key: r.key, title: r.title, deck: { front_label: front, back_label: back, cards } };
  }
  if (!/^[0-9a-f-]{36}$/i.test(intent.id)) return null;
  const { data, error } = await supabase.rpc('get_shared_deck', { sid: intent.id });
  const deck = !error && Array.isArray(data) ? data[0] : null;
  return deck ? { kind: 'shared', title: deck.title, deck } : null;
}
