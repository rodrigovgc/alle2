import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, IconButton } from './Button.jsx';
import { Tag } from './Tag.jsx';
import { alternatives } from '../lib/csv.js';
import { normalise } from '../lib/evaluate.js';
import { SPRING } from '../styles/tokens.js';

/*
 * The "let's fix these" round. Cards missed in the session come back, but
 * instead of typing, the learner rebuilds the answer by tapping word chips in
 * order (like Duolingo). Getting it right here doesn't change the card's
 * schedule — a miss still comes back sooner — but it counts toward the
 * session's celebration score and teaches the correct wording.
 */

const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};

const wordsOf = (answer) => answer.replace(/\s*•\s*/g, ' ').trim().split(/\s+/);

export function FixUp({ cards, onDone }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [fixedCount, setFixedCount] = useState(0);

  const card = cards[index];
  const answer = useMemo(() => alternatives(card.back)[0], [card.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useMemo(() => wordsOf(answer), [answer]);
  // Chips: the answer's words plus a couple of distractors from other missed cards.
  const bank = useMemo(() => {
    const distractors = shuffle(
      cards.filter((c) => c.key !== card.key)
        .flatMap((c) => wordsOf(alternatives(c.back)[0]))
        .filter((w) => !target.includes(w)),
    ).slice(0, Math.min(2, Math.max(0, 5 - target.length)));
    return shuffle(target.concat(distractors)).map((w, i) => ({ id: `${w}-${i}`, w }));
  }, [card.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const [placed, setPlaced] = useState([]); // array of chip objects
  const [checked, setChecked] = useState(null); // null | 'right' | 'wrong'

  const remaining = bank.filter((c) => !placed.some((p) => p.id === c.id));

  function place(chip) {
    if (checked) return;
    setPlaced((p) => [...p, chip]);
  }
  function removeAt(i) {
    if (checked) return;
    setPlaced((p) => p.filter((_, k) => k !== i));
  }
  function check() {
    const built = normalise(placed.map((c) => c.w).join(' '));
    const ok = alternatives(card.back).some((alt) => normalise(alt) === built);
    setChecked(ok ? 'right' : 'wrong');
    if (ok) setFixedCount((n) => n + 1);
  }
  function nextCard() {
    if (index + 1 >= cards.length) { onDone({ fixed: fixedCount, total: cards.length }); return; }
    setIndex(index + 1);
    setPlaced([]);
    setChecked(null);
  }

  return (
    <div className="fixup">
      <header className="fixup__head">
        <p className="fixup__kicker">Let’s fix these</p>
        <span className="fixup__count">{index + 1}/{cards.length}</span>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={card.key}
          className="fixup__card"
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24, transition: { duration: 0.12 } }}
          transition={SPRING.flip}
        >
          <span className="fixup__prompt-label">{card.frontLabel}</span>
          <p className="fixup__prompt">{card.front}</p>
          <p className="fixup__hint">Tap the words in the right order</p>

          {/* The answer being built */}
          <div className={`fixup__answer ${checked || ''}`}>
            {placed.length === 0 && <span className="fixup__placeholder">Your answer</span>}
            {placed.map((chip, i) => (
              <button key={chip.id} type="button" className="chip chip--placed" onClick={() => removeAt(i)} disabled={!!checked}>
                {chip.w}
              </button>
            ))}
          </div>

          {checked === 'right' && <div className="fixup__verdict"><Tag verdict="correct" /></div>}
          {checked === 'wrong' && (
            <div className="fixup__verdict">
              <Tag verdict="wrong" />
              <p className="fixup__correct">{answer}</p>
            </div>
          )}

          {/* The word bank */}
          {!checked && (
            <div className="fixup__bank">
              {remaining.map((chip) => (
                <button key={chip.id} type="button" className="chip" onClick={() => place(chip)}>{chip.w}</button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="fixup__controls">
        {!checked ? (
          <Button disabled={placed.length === 0} onClick={check}>Check</Button>
        ) : (
          <Button onClick={nextCard}>{index + 1 >= cards.length ? 'See results' : 'Next'}</Button>
        )}
      </div>
    </div>
  );
}
