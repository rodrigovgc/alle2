import { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, IconButton } from '../components/Button.jsx';
import { RatingTabs } from '../components/RatingTabs.jsx';
import { Tag } from '../components/Tag.jsx';
import { Icon } from '../components/Icon.jsx';
import { evaluate } from '../lib/evaluate.js';
import { alternatives, displayLines } from '../lib/csv.js';
import { canSpeak, speak } from '../lib/speech.js';
import { useVisualViewport } from '../lib/useViewport.js';
import { useFitText } from '../lib/useFitText.js';
import { SPRING } from '../styles/tokens.js';

const DEFAULT_RATING = { correct: 'easy', almost: 'learning', wrong: 'hard' };
const STACK_DEPTH = 3;

function Lines({ text }) {
  const lines = displayLines(text.replace(/\s*\|\s*/g, ' / '));
  return lines.map((l, i) => (
    <span key={i} className="line">{l}</span>
  ));
}

export function Study({ cards, onReview, onExit, onFinish }) {
  useVisualViewport(true);
  const reduce = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('question');
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null);
  const [rating, setRating] = useState('learning');
  const [correctCount, setCorrectCount] = useState(0);
  const inputRef = useRef(null);

  const total = cards.length;
  const card = cards[index];
  const behind = Math.min(STACK_DEPTH, total - index - 1);

  // Focus on the new card inside the same tap that dealt it, so iOS opens the keyboard.
  useLayoutEffect(() => {
    if (phase === 'question') inputRef.current?.focus({ preventScroll: true });
  }, [index, phase]);

  function reveal({ skipped = false } = {}) {
    const r = skipped
      ? { verdict: 'wrong', match: alternatives(card.back)[0], skipped: true }
      : evaluate(typed, card.back);
    inputRef.current?.blur();
    setResult(r);
    setRating(DEFAULT_RATING[r.verdict]);
    setPhase('answer');
  }

  function next() {
    const isCorrect = result.verdict === 'correct';
    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    onReview(card, rating, result.verdict);
    if (index + 1 >= total) {
      onFinish({ correct: newCorrect, total });
      return;
    }
    setCorrectCount(newCorrect);
    setIndex(index + 1);
    setPhase('question');
    setTyped('');
    setResult(null);
  }

  const deal = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: '112%', rotate: 4 },
        animate: { x: 0, rotate: 0 },
        exit: { x: '-120%', rotate: -7, transition: SPRING.deal },
      };

  return (
    <div className="study">
      <nav className="study__nav">
        <IconButton icon="back" label="Back to decks" onClick={onExit} />
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <span className="progress__fill" style={{ '--progress': (index + 1) / total }} />
        </div>
        <span className="study__count">{index + 1}/{total}</span>
      </nav>

      <div className="study__stage" style={{ '--stack-count': behind }}>
        {Array.from({ length: behind }, (_, n) => {
          const i = behind - n; // render deepest first
          return (
            <div
              key={index + i}
              className="study-card study-card--behind"
              style={{ '--i': i }}
              aria-hidden="true"
            />
          );
        })}

        <AnimatePresence initial={!reduce}>
          <motion.div
            key={index}
            className="study-card study-card--front"
            {...deal}
            transition={SPRING.deal}
          >
            <CardFace
              card={card}
              phase={phase}
              typed={typed}
              setTyped={setTyped}
              result={result}
              inputRef={inputRef}
              onSkip={() => reveal({ skipped: true })}
              onSubmit={() => reveal()}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={`study__controls study__controls--${phase}`}>
        {phase === 'question' ? (
          <Button onClick={() => reveal()}>Answer</Button>
        ) : (
          <>
            <RatingTabs value={rating} onChange={setRating} />
            <Button onClick={next}>Next</Button>
          </>
        )}
      </div>
    </div>
  );
}

function CardFace({ card, phase, typed, setTyped, result, inputRef, onSkip, onSubmit }) {
  const bodyRef = useRef(null);
  const fit = useFitText(bodyRef, [card.key, phase, phase === 'question' ? typed : '']);
  const isAnswer = phase === 'answer';
  const showTyped = isAnswer && result.verdict !== 'correct' && !result.skipped && typed.trim();
  const others = isAnswer ? alternatives(card.back).filter((a) => a !== result.match) : [];

  return (
    <>
      <header className="study-card__header">
        <span className="study-card__label">{isAnswer ? card.backLabel : card.frontLabel}</span>
        {isAnswer ? (
          canSpeak() && (
            <button
              type="button"
              className="icon-btn icon-btn--small"
              aria-label="Read answer aloud"
              onClick={() => speak(card.back, card.lang)}
            >
              <Icon name="speaker" />
            </button>
          )
        ) : (
          <button type="button" className="skip" onClick={onSkip}>Skip</button>
        )}
      </header>

      <div ref={bodyRef} className="study-card__body" data-fit={fit}>
        {!isAnswer ? (
          <>
            <p className="study-card__text"><Lines text={card.front} /></p>
            <textarea
              ref={inputRef}
              className="study-card__input"
              value={typed}
              placeholder="Type answer…"
              rows={1}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label={`Your answer in ${card.backLabel}`}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                // Enter makes a new line. Cmd/Ctrl+Enter submits on a hardware keyboard.
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit(); }
              }}
            />
          </>
        ) : (
          <>
            {showTyped && <p className="study-card__text study-card__text--typed">{typed}</p>}
            <p className="study-card__text"><Lines text={result.match} /></p>
            <div className="study-card__verdict">
              <Tag verdict={result.verdict} />
              {others.length > 0 && (
                <span className="study-card__also">Also accepted: {others.join(', ')}</span>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
