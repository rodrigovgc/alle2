import { hashFront } from './hash.js';
import { LEITNER_INTERVALS_DAYS, SESSION_SIZE, NEW_CARDS_PER_SESSION } from '../styles/tokens.js';

const DAY = 24 * 60 * 60 * 1000;
const MAX_BOX = LEITNER_INTERVALS_DAYS.length;

/**
 * Leitner, 5 boxes. Unseen cards sit in box 0.
 * Easy +2, Learning +1, Hard → 1. A wrong answer caps the result at box 2.
 */
export function nextBox(currentBox, rating, verdict) {
  let box;
  if (rating === 'easy') box = Math.min(MAX_BOX, (currentBox || 0) + 2);
  else if (rating === 'learning') box = Math.min(MAX_BOX, (currentBox || 0) + 1);
  else box = 1;
  if (verdict === 'wrong') box = Math.min(box, 2);
  return Math.max(1, box);
}

export function schedule(prev, rating, verdict, now = new Date()) {
  const box = nextBox(prev?.box ?? 0, rating, verdict);
  return {
    box,
    due_at: new Date(now.getTime() + LEITNER_INTERVALS_DAYS[box - 1] * DAY).toISOString(),
    last_reviewed_at: now.toISOString(),
    reviews: (prev?.reviews ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (verdict === 'wrong' ? 1 : 0),
  };
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Flatten decks into study cards with their progress attached. */
export function collectCards(decks, progressRows) {
  const byKey = new Map(progressRows.map((p) => [`${p.deck_id}:${p.card_hash}`, p]));
  return decks.flatMap((deck) =>
    (deck.cards || []).map((c) => {
      const hash = hashFront(c.front);
      return {
        key: `${deck.id}:${hash}`,
        hash,
        deckId: deck.id,
        front: c.front,
        back: c.back,
        frontLabel: deck.front_label,
        backLabel: deck.back_label,
        lang: deck.lang,
        progress: byKey.get(`${deck.id}:${hash}`) || null,
      };
    }),
  );
}

/**
 * 20 cards: due first (oldest due first), then up to 6 new to fill.
 * `mix` shuffles the final order (used by Shuffle decks).
 */
export function buildSession(cards, { now = new Date(), mix = false, practice = false } = {}) {
  const due = cards
    .filter((c) => c.progress && new Date(c.progress.due_at) <= now)
    .sort((a, b) => new Date(a.progress.due_at) - new Date(b.progress.due_at));
  const fresh = shuffle(cards.filter((c) => !c.progress));

  let picked = due.slice(0, SESSION_SIZE);
  const room = SESSION_SIZE - picked.length;
  picked = picked.concat(fresh.slice(0, Math.min(NEW_CARDS_PER_SESSION, room)));

  // Nothing due and nothing new: practise the cards coming up soonest.
  if (!picked.length && practice) {
    picked = cards
      .filter((c) => c.progress)
      .sort((a, b) => new Date(a.progress.due_at) - new Date(b.progress.due_at))
      .slice(0, SESSION_SIZE);
  }
  return mix ? shuffle(picked) : picked;
}

export function dueCount(cards, now = new Date()) {
  return cards.filter((c) => c.progress && new Date(c.progress.due_at) <= now).length;
}
