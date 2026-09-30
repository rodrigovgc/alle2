import { alternatives } from './csv.js';

/** Lowercase, strip punctuation, collapse whitespace. Accents are kept. */
export function normalise(s) {
  return s
    .toLowerCase()
    .replace(/•/g, ' ')
    .replace(/[\p{P}\p{S}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * @returns {{ verdict: 'correct'|'almost'|'wrong', match: string }}
 * `match` is the accepted answer closest to what was typed (shown on the card).
 */
export function evaluate(typed, backCell) {
  const accepted = alternatives(backCell);
  const input = normalise(typed);
  if (!input) return { verdict: 'wrong', match: accepted[0] };

  let best = { dist: Infinity, match: accepted[0] };
  for (const alt of accepted) {
    const dist = levenshtein(input, normalise(alt));
    if (dist < best.dist) best = { dist, match: alt };
  }
  if (best.dist === 0) return { verdict: 'correct', match: best.match };
  if (best.dist <= 2) return { verdict: 'almost', match: best.match };
  return { verdict: 'wrong', match: accepted[0] };
}
