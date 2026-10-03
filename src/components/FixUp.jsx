import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, IconButton } from './Button.jsx';
import { Tag } from './Tag.jsx';
import { alternatives } from '../lib/csv.js';
import { normalise } from '../lib/evaluate.js';
import { SPRING } from '../styles/tokens.js';

/*
 * The "let's fix these" round. Missed cards return as a word-ordering exercise:
 * tap the chips in order to rebuild the answer. Like Duolingo, a lifted chip
 * leaves its slot behind so the bank never reflows. Getting it right teaches the
 * wording and counts toward the celebration score, but doesn't change the
 * card's schedule (a miss still comes back sooner).
 */

const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};
const wordsOf = (answer) => answer.replace(/\s*•\s*/g, ' ').trim().split(/\s+/);

export function FixUp({ cards, sessionTotal, baseCorrect = 0, onExit, onDone }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [fixedCount, setFixedCount] = useState(0);

  const card = cards[index];
  const answer = useMemo(() => alternatives(card.back)[0], [card.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useMemo(() => wordsOf(answer), [answer]);

  // Build the bank once per card: answer words + a couple of distractors.
  const bank = useMemo(() => {
    const distractors = shuffle(
      cards.filter((c) => c.key !== card.key)
        .flatMap((c) => wordsOf(alternatives(c.back)[0]))
        .filter((w) => !target.includes(w)),
    ).slice(0, Math.min(2, Math.max(0, 6 - target.length)));
    return shuffle(target.concat(distractors)).map((w, i) => ({ id: `${w}-${i}`, w }));
  }, [card.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const [placed, setPlaced] = useState([]); // chip ids, in order
  const [checked, setChecked] = useState(null); // null | 'right' | 'wrong'

  const placedSet = new Set(placed);
  const placedChips = placed.map((id) => bank.find((c) => c.id === id));

  function place(chip) {
    if (checked || placedSet.has(chip.id)) return;
    setPlaced((p) => [...p, chip.id]);
  }
  function removeAt(i) {
    if (checked) return;
    setPlaced((p) => p.filter((_, k) => k !== i));
  }
  function check() {
    const built = normalise(placedChips.map((c) => c.w).join(' '));
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

  const denom = Math.max(1, sessionTotal || cards.length);
  const shownNum = Math.min(denom, baseCorrect + index);

  return (
    <div className="study">
      <nav className="study__nav">
        <IconButton icon="close" label="Close deck" onClick={onExit} />
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={denom} aria-valuenow={shownNum}>
          <span className="progress__fill" style={{ '--progress': shownNum / denom }} />
        </div>
        <span className="study__count">{shownNum}/{denom}</span>
      </nav>
      <p className="fixup__kicker">Let’s fix these</p>
      <div className="fixup">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={card.key}
          className="fixup__card"
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24, transition: { duration: 0.12 } }}
          transition={SPRING.flip}
        >
          <span className="fixup__col">{card.frontLabel}</span>
          <p className="fixup__prompt">{card.front}</p>
          <p className="fixup__hint">Tap the words in the right order</p>

          {/* Answer: lined notepad rows the chips land on */}
          <div className={`fixup__answer ${checked || ''}`}>
            {placedChips.map((chip, i) => (
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

          {/* Word bank: a lifted chip leaves an empty slot so nothing reflows */}
          {!checked && (
            <div className="fixup__bank">
              {bank.map((chip) => (
                placedSet.has(chip.id)
                  ? <span key={chip.id} className="chip chip--ghost" aria-hidden="true">{chip.w}</span>
                  : <button key={chip.id} type="button" className="chip" onClick={() => place(chip)}>{chip.w}</button>
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
    </div>
  );
}
