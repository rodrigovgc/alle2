import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, normalise } from './evaluate.js';
import { nextBox, buildSession, schedule } from './srs.js';
import { parseCSV, rowsToDeck, toCsvUrl, displayLines } from './csv.js';

test('normalise', () => {
  assert.equal(normalise('  Hoe kom  jij, naar het werk?! '), 'hoe kom jij naar het werk');
});

test('evaluate verdicts', () => {
  assert.equal(evaluate('Hoe kom jij naar het werk', 'Hoe kom jij naar het werk?').verdict, 'correct');
  assert.equal(evaluate('Hoe kom jij naat het werk?', 'Hoe kom jij naar het werk?').verdict, 'almost');
  assert.equal(evaluate('tres', 'três').verdict, 'almost');
  assert.equal(evaluate('cinco', 'dois').verdict, 'wrong');
  assert.equal(evaluate('', 'um').verdict, 'wrong');
  const alt = evaluate('uma', 'um|uma');
  assert.equal(alt.verdict, 'correct');
  assert.equal(alt.match, 'uma');
});

test('leitner boxes', () => {
  assert.equal(nextBox(0, 'easy', 'correct'), 2);
  assert.equal(nextBox(4, 'easy', 'correct'), 5);
  assert.equal(nextBox(5, 'learning', 'correct'), 5);
  assert.equal(nextBox(3, 'hard', 'correct'), 1);
  assert.equal(nextBox(3, 'easy', 'wrong'), 2);
  assert.equal(nextBox(0, 'learning', 'wrong'), 1);
  const s = schedule({ box: 2, reviews: 3, lapses: 0 }, 'learning', 'correct', new Date('2026-01-01'));
  assert.equal(s.box, 3);
  assert.equal(s.due_at, new Date('2026-01-05').toISOString());
});

test('session: due first oldest-first, then up to 6 new', () => {
  const now = new Date('2026-06-01');
  const due = Array.from({ length: 3 }, (_, i) => ({
    key: `d${i}`, progress: { due_at: new Date(now - (i + 1) * 864e5).toISOString() },
  }));
  const later = [{ key: 'l', progress: { due_at: new Date(+now + 864e5).toISOString() } }];
  const fresh = Array.from({ length: 10 }, (_, i) => ({ key: `n${i}`, progress: null }));
  const s = buildSession([...due, ...later, ...fresh], { now });
  assert.deepEqual(s.slice(0, 3).map((c) => c.key), ['d2', 'd1', 'd0']);
  assert.equal(s.length, 9);
  assert.ok(!s.some((c) => c.key === 'l'));
  const many = Array.from({ length: 25 }, (_, i) => ({ key: `x${i}`, progress: { due_at: new Date(now - i * 1000).toISOString() } }));
  assert.equal(buildSession([...many, ...fresh], { now }).length, 20);
});

test('csv parsing', () => {
  const rows = parseCSV('English,Dutch\r\n"Hello, you",Hallo|Hoi\n"Say ""hi""","Zeg • hoi"\n,\n');
  const deck = rowsToDeck(rows);
  assert.equal(deck.frontLabel, 'English');
  assert.equal(deck.cards.length, 2);
  assert.equal(deck.cards[0].front, 'Hello, you');
  assert.equal(deck.cards[1].front, 'Say "hi"');
  assert.deepEqual(displayLines(deck.cards[1].back), ['Zeg', 'hoi']);
});

test('sheet url conversion', () => {
  assert.equal(
    toCsvUrl('https://docs.google.com/spreadsheets/d/abc123/edit#gid=42'),
    'https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&gid=42',
  );
  assert.equal(
    toCsvUrl('https://docs.google.com/spreadsheets/d/e/2PACX-x/pubhtml'),
    'https://docs.google.com/spreadsheets/d/e/2PACX-x/pub?output=csv',
  );
});

import { diffAnswer } from './evaluate.js';
test('diff marks only the letters that differ', () => {
  const r = diffAnswer('Hoe kom jij naat het werk', 'Hoe kom jij naar het werk?');
  assert.deepEqual(r.typed.filter((x) => x.mark).map((x) => x.text), ['t']);
  assert.deepEqual(r.answer.filter((x) => x.mark).map((x) => x.text), ['r']);
  const miss = diffAnswer('tres', 'três');
  assert.deepEqual(miss.answer.filter((x) => x.mark).map((x) => x.text), ['ê']);
});
