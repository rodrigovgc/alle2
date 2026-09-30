import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, IconButton } from '../components/Button.jsx';
import { RatingTabs } from '../components/RatingTabs.jsx';
import { Tag } from '../components/Tag.jsx';
import { Icon } from '../components/Icon.jsx';
import { diffAnswer, evaluate } from '../lib/evaluate.js';
import { alternatives, displayLines } from '../lib/csv.js';
import { canSpeak, speak } from '../lib/speech.js';
import { useVisualViewport } from '../lib/useViewport.js';
import { useFitText } from '../lib/useFitText.js';
import { SPRING, tokenNumber } from '../styles/tokens.js';

const DEFAULT_RATING = { correct: 'easy', almost: 'learning', wrong: 'hard' };
const RATINGS = ['easy', 'learning', 'hard'];

function Lines({ text }) {
  return displayLines(text.replace(/\s*\|\s*/g, ' / ')).map((l, i) => (
    <span key={i} className="line">{l}</span>
  ));
}

function Runs({ runs, markClass }) {
  return runs.map((r, i) =>
    r.mark ? <mark key={i} className={`mark ${markClass}`}>{r.text}</mark> : <span key={i}>{r.text}</span>);
}

export function Study({ cards, onReview, onExit, onFinish }) {
  const keyboardOpen = useVisualViewport(true);
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

  /* ---- Card geometry ---------------------------------------------------
     The card keeps index-card proportions. Its size comes from the screen
     with the keyboard closed; when the keyboard opens the whole card scales
     down as one object instead of squashing. */
  const t = useMemo(() => ({
    offset: tokenNumber('--stack-offset', 8),
    step: tokenNumber('--stack-scale-step', 0.03),
    depth: tokenNumber('--stack-depth', 3),
    ratio: tokenNumber('--card-ratio', 0.72),
  }), []);

  const stageRef = useRef(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const restH = useRef(0);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!keyboardOpen && stage.h) restH.current = stage.h;
  }, [keyboardOpen, stage.h]);

  const baseH = keyboardOpen ? restH.current || stage.h : stage.h;
  const cardW = Math.max(0, Math.min(stage.w, (baseH - t.offset * t.depth) * t.ratio));
  const cardH = cardW / t.ratio;
  const scale = keyboardOpen && cardH ? Math.min(1, stage.h / cardH) : 1;
  const spread = keyboardOpen ? 0 : 1; // tuck the stack away while typing

  /* ---- Flow ----------------------------------------------------------- */

  // Focus inside the same tap that dealt the card, so iOS opens the keyboard.
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
    const newCorrect = correctCount + (result.verdict === 'correct' ? 1 : 0);
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

  // Hardware keyboard on the answer side: Enter = Next, 1/2/3 = rating.
  useEffect(() => {
    if (phase !== 'answer') return undefined;
    const onKey = (e) => {
      if (e.target.closest?.('button, textarea, input, select')) return;
      if (e.key === 'Enter') { e.preventDefault(); next(); }
      const n = Number(e.key);
      if (n >= 1 && n <= 3) setRating(RATINGS[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const slots = cards.slice(index, index + 1 + t.depth);

  return (
    <div className={`study ${keyboardOpen ? 'is-typing' : ''}`}>
      <nav className="study__nav">
        <IconButton icon="back" label="Back to decks" onClick={onExit} />
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1}>
          <span className="progress__fill" style={{ '--progress': (index + 1) / total }} />
        </div>
        <span className="study__count">{index + 1}/{total}</span>
      </nav>

      <div className="study__stage" ref={stageRef}>
        <motion.div
          className="study__deck"
          style={{ width: cardW, height: cardH, visibility: cardW ? 'visible' : 'hidden' }}
          animate={{ scale }}
          transition={reduce ? { duration: 0 } : SPRING.stack}
        >
          <AnimatePresence initial={false}>
            {slots.map((c, slot) => {
              const front = slot === 0;
              return (
                <motion.div
                  key={index + slot}
                  className={`study-card ${front ? 'is-front' : 'is-behind'}`}
                  aria-hidden={!front}
                  inert={front ? undefined : ''}
                  initial={{
                    y: (slot + 1) * t.offset * spread,
                    scale: 1 - (slot + 1) * t.step * spread,
                    opacity: 0,
                  }}
                  animate={{
                    y: slot * t.offset * spread,
                    scale: 1 - slot * t.step * spread,
                    opacity: 1,
                    zIndex: t.depth + 1 - slot,
                  }}
                  exit={reduce
                    ? { opacity: 0, transition: { duration: 0.15 } }
                    : {
                        x: '-125%',
                        rotate: -8,
                        zIndex: 20,
                        transition: { ...SPRING.deal, zIndex: { duration: 0 } },
                      }}
                  transition={reduce ? { duration: 0 } : SPRING.stack}
                >
                  <CardFace
                    card={c}
                    interactive={front}
                    phase={front ? phase : 'question'}
                    typed={front ? typed : ''}
                    setTyped={setTyped}
                    result={front ? result : null}
                    inputRef={front ? inputRef : undefined}
                    keyboardOpen={keyboardOpen}
                    onSkip={() => reveal({ skipped: true })}
                    onSubmit={() => reveal()}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      {!(phase === 'question' && keyboardOpen) && (
        <div className="study__controls">
          {phase === 'question' ? (
            <Button onClick={() => reveal()}>Answer</Button>
          ) : (
            <>
              <RatingTabs value={rating} onChange={setRating} />
              <Button onClick={next}>Next</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CardFace({ card, interactive, phase, typed, setTyped, result, inputRef, keyboardOpen, onSkip, onSubmit }) {
  const bodyRef = useRef(null);
  const fit = useFitText(bodyRef, [card.key, phase, phase === 'question' ? typed : '']);
  const isAnswer = phase === 'answer' && result;

  let answerFace = null;
  if (isAnswer) {
    const answerText = result.match.replace(/\s*•\s*/g, '\n');
    const hasTyped = result.verdict !== 'correct' && !result.skipped && typed.trim();
    const diff = hasTyped ? diffAnswer(typed, answerText) : null;
    const showDiff = diff && diff.changed <= 0.5;
    const others = alternatives(card.back).filter((a) => a !== result.match);

    answerFace = (
      <>
        {hasTyped && (
          <p
            className={`study-card__text study-card__text--typed ${showDiff ? '' : 'is-struck'}`}
            aria-label={`You wrote: ${typed}`}
          >
            {showDiff ? <Runs runs={diff.typed} markClass="mark--wrong" /> : typed}
          </p>
        )}
        <p className="study-card__text">
          {showDiff ? <Runs runs={diff.answer} markClass="mark--fix" /> : <Lines text={result.match} />}
        </p>
        {others.length > 0 && (
          <p className="study-card__helper">Also accepted: {others.join(', ')}</p>
        )}
        <div className="study-card__verdict"><Tag verdict={result.verdict} /></div>
      </>
    );
  }

  return (
    <>
      <header className="study-card__header">
        <span className="study-card__label">{isAnswer ? card.backLabel : card.frontLabel}</span>
        {isAnswer ? (
          canSpeak() && (
            <IconButton
              icon="speaker"
              label="Read answer aloud"
              className="icon-btn--inner icon-btn--card"
              onClick={() => speak(card.back, card.lang)}
            />
          )
        ) : (
          <button type="button" className="skip" onClick={onSkip} tabIndex={interactive ? 0 : -1}>
            Skip
          </button>
        )}
      </header>

      <div ref={bodyRef} className="study-card__body" data-fit={fit}>
        {isAnswer ? answerFace : (
          <>
            <p className="study-card__text"><Lines text={card.front} /></p>
            {interactive ? (
              <textarea
                ref={inputRef}
                className="study-card__input"
                value={typed}
                placeholder="Type answer…"
                rows={1}
                enterKeyHint="go"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                aria-label={`Your answer in ${card.backLabel}`}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  // Enter answers (desktop and the phone's Go key). Shift+Enter adds a line.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
              />
            ) : (
              <span className="study-card__input study-card__input--static">Type answer…</span>
            )}
          </>
        )}
      </div>

      {interactive && !isAnswer && keyboardOpen && (
        <footer className="study-card__footer">
          <button
            type="button"
            className="card-submit"
            onPointerDown={(e) => e.preventDefault()} // keep the keyboard up until we reveal
            onClick={onSubmit}
          >
            Answer
            <Icon name="arrow" />
          </button>
        </footer>
      )}
    </>
  );
}
