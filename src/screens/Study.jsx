import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, IconButton } from '../components/Button.jsx';
import { RatingTabs, RATING_VALUES } from '../components/RatingTabs.jsx';
import { Tag } from '../components/Tag.jsx';
import { diffAnswer, evaluate } from '../lib/evaluate.js';
import { alternatives, displayLines } from '../lib/csv.js';
import { canSpeak, speak } from '../lib/speech.js';
import { useVisualViewport } from '../lib/useViewport.js';
import { useFitText } from '../lib/useFitText.js';
import { SPRING, tokenNumber } from '../styles/tokens.js';

const SUGGESTED = { correct: 'easy', almost: 'learning', wrong: 'hard' };

function Lines({ text }) {
  return displayLines(text.replace(/\s*\|\s*/g, ' / ')).map((l, i) => (
    <span key={i} className="line">{l}</span>
  ));
}

function Runs({ runs, markClass }) {
  return runs.map((r, i) =>
    r.mark ? <mark key={i} className={`mark ${markClass}`}>{r.text}</mark> : <span key={i}>{r.text}</span>);
}

/*
 * One card, two sides, and a tray at the bottom for the actions.
 *  - Typing: just the card and the keyboard. The keyboard's Go key answers.
 *  - Keyboard dismissed: the tray rises with Answer.
 *  - Answered: the card turns over; the tray holds the rating with Next
 *    below it, in the spot where Answer was.
 */
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
  const busy = useRef(false);

  const total = cards.length;
  const card = cards[index];

  /* ---- Card geometry: one fixed size that fits above the keyboard ------ */
  const t = useMemo(() => ({
    offset: tokenNumber('--stack-offset', 8),
    step: tokenNumber('--stack-scale-step', 0.03),
    depth: tokenNumber('--stack-depth', 3),
    ratio: tokenNumber('--card-ratio', 1.15),
  }), []);

  const stageRef = useRef(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spread = keyboardOpen ? 0 : 1; // tuck the stack away while typing
  const cardW = stage.w;
  const cardH = Math.max(0, Math.min(cardW / t.ratio, stage.h - t.offset * t.depth * spread));

  /* ---- Flow ----------------------------------------------------------- */

  useLayoutEffect(() => {
    if (phase === 'question') inputRef.current?.focus({ preventScroll: true });
  }, [index, phase]);

  function reveal({ skipped = false } = {}) {
    if (phase !== 'question' || busy.current) return;
    busy.current = true;
    const ta = inputRef.current;
    ta?.blur(); // commits any word the keyboard was still holding
    // Read the field itself, one frame later, so the check always sees
    // exactly what is on screen.
    requestAnimationFrame(() => {
      const value = skipped ? '' : (ta ? ta.value : typed);
      const r = skipped
        ? { verdict: 'wrong', match: alternatives(card.back)[0], skipped: true }
        : evaluate(value, card.back);
      setTyped(value);
      setResult(r);
      setRating(SUGGESTED[r.verdict]);
      setPhase('answer');
      busy.current = false;
    });
  }

  function next() {
    if (phase !== 'answer' || busy.current) return;
    busy.current = true;
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
    busy.current = false;
  }

  // Hardware keyboard on the back: Enter = Next, 1/2/3 pick a rating.
  useEffect(() => {
    if (phase !== 'answer') return undefined;
    const onKey = (e) => {
      if (e.target.closest?.('button, textarea, input, select')) return;
      if (e.key === 'Enter') { e.preventDefault(); next(); }
      const n = Number(e.key);
      if (n >= 1 && n <= 3) setRating(RATING_VALUES[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const slots = cards.slice(index, index + 1 + t.depth);
  const flipped = phase === 'answer';
  const showTray = flipped || !keyboardOpen;

  return (
    <div className={`study ${keyboardOpen ? 'is-typing' : ''}`}>
      <nav className="study__nav">
        <IconButton icon="close" label="Close deck" onClick={onExit} />
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1}>
          <span className="progress__fill" style={{ '--progress': (index + 1) / total }} />
        </div>
        <span className="study__count">{index + 1}/{total}</span>
      </nav>

      <div className="study__stage" ref={stageRef}>
        <div className="study__deck" style={{ width: cardW, height: cardH, visibility: cardH ? 'visible' : 'hidden' }}>
          <AnimatePresence initial={false}>
            {slots.map((c, slot) => {
              const front = slot === 0;
              return (
                <motion.div
                  key={index + slot}
                  className={`study-card ${front ? 'is-front' : 'is-behind'}`}
                  aria-hidden={!front}
                  inert={front ? undefined : ''}
                  initial={{ y: (slot + 1) * t.offset * spread, scale: 1 - (slot + 1) * t.step * spread, opacity: 0 }}
                  animate={{ y: slot * t.offset * spread, scale: 1 - slot * t.step * spread, opacity: 1, zIndex: t.depth + 1 - slot }}
                  exit={reduce
                    ? { opacity: 0, transition: { duration: 0.15 } }
                    : { x: '-125%', rotate: -8, zIndex: 20, transition: { ...SPRING.deal, zIndex: { duration: 0 } } }}
                  transition={reduce ? { duration: 0 } : SPRING.stack}
                >
                  {front ? (
                    <motion.div
                      className="study-card__flipper"
                      initial={false}
                      animate={{ rotateY: flipped ? 180 : 0 }}
                      transition={reduce ? { duration: 0 } : SPRING.flip}
                    >
                      <div className="study-card__face">
                        <FrontFace
                          card={c}
                          interactive={!flipped}
                          typed={typed}
                          setTyped={setTyped}
                          inputRef={inputRef}
                          onSkip={() => reveal({ skipped: true })}
                          onSubmit={() => reveal()}
                        />
                      </div>
                      <div className="study-card__face study-card__face--back" aria-hidden={!flipped}>
                        {result && <BackFace card={c} typed={typed} result={result} />}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="study-card__face">
                      <FrontFace card={c} interactive={false} typed="" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showTray && (
          <motion.div
            key="tray"
            className="tray"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%', transition: { duration: 0.12 } }}
            transition={SPRING.sheet}
          >
            {flipped ? (
              <>
                <RatingTabs value={rating} onChange={setRating} />
                <Button onClick={next}>Next</Button>
              </>
            ) : (
              <Button
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => reveal()}
              >
                Answer
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FrontFace({ card, interactive, typed, setTyped, inputRef, onSkip, onSubmit }) {
  const bodyRef = useRef(null);
  const fit = useFitText(bodyRef, [card.key, typed]);

  // Grow the answer box with its text, so the font shrinks to fit instead of
  // the box scrolling and hiding the start of what was typed.
  useLayoutEffect(() => {
    const ta = inputRef?.current;
    if (!ta || !interactive) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [typed, fit, interactive, inputRef]);

  return (
    <>
      <header className="study-card__header">
        <span className="study-card__label">{card.frontLabel}</span>
        <button type="button" className="skip" onClick={onSkip} tabIndex={interactive ? 0 : -1}>Skip</button>
      </header>

      <div
        ref={bodyRef}
        className="study-card__body"
        data-fit={fit}
        onClick={() => interactive && inputRef?.current?.focus()}
      >
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
          <span className="study-card__input study-card__input--static">{typed || 'Type answer…'}</span>
        )}
      </div>

    </>
  );
}

function BackFace({ card, typed, result }) {
  const bodyRef = useRef(null);
  const fit = useFitText(bodyRef, [card.key, result.match, typed]);

  const answerText = result.match.replace(/\s*•\s*/g, '\n');
  const hasTyped = result.verdict !== 'correct' && !result.skipped && typed.trim();
  const diff = hasTyped ? diffAnswer(typed, answerText) : null;
  const showDiff = diff && diff.changed <= 0.5;
  const others = alternatives(card.back).filter((a) => a !== result.match);

  return (
    <>
      <header className="study-card__header">
        <span className="study-card__label">{card.backLabel}</span>
        {canSpeak() && (
          <IconButton
            icon="speaker"
            label="Read answer aloud"
            className="icon-btn--inner icon-btn--card"
            onClick={() => speak(card.back, card.lang)}
          />
        )}
      </header>

      <div ref={bodyRef} className="study-card__body" data-fit={fit}>
        {hasTyped && (
          <p
            className={`study-card__text study-card__text--typed ${showDiff ? '' : 'is-struck'}`}
            aria-label={`You wrote: ${typed}`}
          >
            {showDiff ? <Runs runs={diff.typed} markClass="mark--wrong" /> : typed}
          </p>
        )}
        <p className="study-card__text" aria-label={`${card.backLabel}: ${result.match}`}>
          {showDiff ? <Runs runs={diff.answer} markClass="mark--fix" /> : <Lines text={result.match} />}
        </p>
        {others.length > 0 && (
          <p className="study-card__helper">Also accepted: {others.join(', ')}</p>
        )}
        <div className="study-card__verdict"><Tag verdict={result.verdict} /></div>
      </div>
    </>
  );
}
