import { hashFront } from './hash.js';
import { alternatives } from './csv.js';
import { imageSrc, clockTime } from './media.js';
import { LEITNER_INTERVALS_DAYS, SESSION_SIZE, NEW_CARDS_PER_SESSION } from '../styles/tokens.js';

const DAY = 24 * 60 * 60 * 1000;
const MAX_BOX = LEITNER_INTERVALS_DAYS.length;

/**
 * Leitner, 5 boxes, scheduled from the checked answer (no self-rating):
 *   Correct       → up one box (a new card counts as box 1, so it lands in 2)
 *   Almost right  → stays in the same box
 *   Not this time → back to box 1 (Skip counts as this)
 */
export function nextBox(currentBox, verdict) {
  const box = Math.max(1, currentBox || 1);
  if (verdict === 'correct') return Math.min(MAX_BOX, box + 1);
  if (verdict === 'almost') return box;
  return 1;
}

export function schedule(prev, verdict, now = new Date()) {
  const box = nextBox(prev?.box ?? 0, verdict);
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

/* ---- Answer mode ------------------------------------------------------ */

const MIN_CHOICES = 4;
const VERY_LONG_ANSWER = 40; // characters: definitions and sentences
const PICTURE_PHRASE_WORDS = 2; // words: "Uneven road" under a sign, not "Belgium" under a flag

/** The distinct main answers of a deck: the pool multiple-choice options come from. */
export function choicePool(deck) {
  return [...new Set((deck.cards || []).map((c) => alternatives(c.back)[0]).filter(Boolean))];
}

/**
 * 'type' or 'choice'. A deck's own setting wins. Otherwise multiple choice is
 * used when answers are very long (definitions), or when the fronts are
 * pictures and the answers are phrases (sign meanings). Language decks and
 * picture-to-name decks (flags) stay typed. Needs at least four answers.
 */
export function answerMode(deck) {
  const pool = choicePool(deck);
  if (pool.length < MIN_CHOICES) return 'type';
  if (deck.answer_mode === 'type' || deck.answer_mode === 'choice') return deck.answer_mode;
  const avgChars = pool.reduce((n, a) => n + a.length, 0) / pool.length;
  if (avgChars > VERY_LONG_ANSWER) return 'choice';
  const cards = deck.cards || [];
  const pictures = cards.filter((c) => imageSrc(c.front)).length > cards.length / 2;
  const avgWords = pool.reduce((n, a) => n + a.split(/\s+/).length, 0) / pool.length;
  return pictures && avgWords >= PICTURE_PHRASE_WORDS ? 'choice' : 'type';
}

/** Four options: the right answer plus three others from the same deck, shuffled. */
export function makeOptions(correct, pool) {
  const others = shuffle(pool.filter((a) => a.toLowerCase() !== correct.toLowerCase())).slice(0, MIN_CHOICES - 1);
  return shuffle([correct, ...others]);
}

/** Flatten decks into study cards with their progress attached. */
export function collectCards(decks, progressRows) {
  const byKey = new Map(progressRows.map((p) => [`${p.deck_id}:${p.card_hash}`, p]));
  return decks.flatMap((deck) => {
    const mode = answerMode(deck);
    const pool = mode === 'choice' ? choicePool(deck) : null;
    return (deck.cards || []).map((c) => {
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
        mode,
        pool,
        progress: byKey.get(`${deck.id}:${hash}`) || null,
      };
    });
  });
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
