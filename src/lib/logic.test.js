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

test('leitner boxes follow the verdict', () => {
  assert.equal(nextBox(0, 'correct'), 2);   // new card answered right
  assert.equal(nextBox(3, 'correct'), 4);
  assert.equal(nextBox(5, 'correct'), 5);   // capped
  assert.equal(nextBox(3, 'almost'), 3);    // stays
  assert.equal(nextBox(0, 'almost'), 1);
  assert.equal(nextBox(4, 'wrong'), 1);
  const s = schedule({ box: 2, reviews: 3, lapses: 0 }, 'correct', new Date('2026-01-01'));
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

import { parseLooseTable } from './csv.js';
import { buildPrompt } from './prompt.js';
test('pasted AI output: fenced CSV, tabs, markdown', () => {
  const fenced = 'Here you go!\n```csv\nEnglish,Dutch\nto go,gaan|lopen\n"Hi, you",Hoi\n```\nEnjoy';
  const d1 = parseLooseTable(fenced);
  assert.equal(d1.frontLabel, 'English');
  assert.equal(d1.cards.length, 2);
  assert.equal(d1.cards[0].back, 'gaan|lopen');
  const d2 = parseLooseTable('Term\tDefinition\nAtom\tSmallest unit');
  assert.equal(d2.cards[0].front, 'Atom');
  const d3 = parseLooseTable('| Event | Year |\n|---|---|\n| Moon landing | 1969 |');
  assert.deepEqual(d3.cards[0], { front: 'Moon landing', back: '1969' });
});
test('prompt fills the template', () => {
  const p = buildPrompt({ subject: 'language', known: 'English', learning: 'Dutch', front: 'English', back: 'Dutch',
    frontHint: 'a phrase in English', backHint: 'the same in Dutch', count: 20, level: 'Beginner', alternatives: true });
  assert.match(p, /Make 20 flashcards for learning Dutch for someone who speaks English/);
  assert.match(p, /first row is exactly: English,Dutch/);
  assert.match(p, /gaan\|lopen/);
});
