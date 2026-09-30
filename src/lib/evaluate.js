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

/* ---- Letter-level diff for the answer face ---------------------------- */

const isLetter = (ch) => /[\p{L}\p{N}]/u.test(ch);
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/**
 * Aligns what was typed against the accepted answer and marks the letters
 * that differ. Punctuation and spaces are free to add or drop, because the
 * checker ignores them too. Returns runs of text for each side:
 *   { typed: [{ text, mark }], answer: [{ text, mark }], changed }
 * `changed` is the share of letters that differ (0–1).
 */
export function diffAnswer(typedRaw, answerRaw) {
  const a = [...typedRaw.trim()];
  const b = [...answerRaw.trim()];
  const gap = (ch) => (isLetter(ch) ? 1 : 0);

  const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) d[i][0] = d[i - 1][0] + gap(a[i - 1]);
  for (let j = 1; j <= b.length; j++) d[0][j] = d[0][j - 1] + gap(b[j - 1]);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + gap(a[i - 1]),
        d[i][j - 1] + gap(b[j - 1]),
        d[i - 1][j - 1] + (same(a[i - 1], b[j - 1]) ? 0 : 1),
      );
    }
  }

  const ta = []; const tb = [];
  let i = a.length; let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (same(a[i - 1], b[j - 1]) ? 0 : 1)) {
      const diff = !same(a[i - 1], b[j - 1]);
      ta.unshift({ ch: a[i - 1], mark: diff && isLetter(a[i - 1]) });
      tb.unshift({ ch: b[j - 1], mark: diff && isLetter(b[j - 1]) });
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + gap(a[i - 1])) {
      ta.unshift({ ch: a[i - 1], mark: isLetter(a[i - 1]) });
      i--;
    } else {
      tb.unshift({ ch: b[j - 1], mark: isLetter(b[j - 1]) });
      j--;
    }
  }

  const runs = (chars) => chars.reduce((out, c) => {
    const last = out[out.length - 1];
    if (last && last.mark === c.mark) last.text += c.ch;
    else out.push({ text: c.ch, mark: c.mark });
    return out;
  }, []);

  const letters = Math.max(1, b.filter(isLetter).length);
  const changed = tb.filter((c) => c.mark).length / letters;
  return { typed: runs(ta), answer: runs(tb), changed };
}
