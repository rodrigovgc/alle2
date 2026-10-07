import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from './Button.jsx';
import { DeckShape, Icon, Logo } from './Icon.jsx';

/*
 * First-run tour: six calm steps, each with a small looping scene drawn in
 * Alle's own style. Swipe or use Next/Back; Skip at any time. Shown once after
 * signing up, and again from Help.
 */

const HELP_URL = 'https://allecards.app/help.html';

const STEPS = [
  {
    key: 'welcome',
    title: 'Welcome to Alle',
    text: 'Flashcards that bring back what you’re about to forget. A few minutes a day is all it takes.',
    Scene: WelcomeScene,
  },
  {
    key: 'ready',
    title: 'Start with a ready-made deck',
    text: 'Tap one in the list to add it, and try a short session to see how studying works.',
    Scene: ReadyScene,
  },
  {
    key: 'sheets',
    title: 'Bring your own Google Sheet',
    text: 'Two columns: what you see, and the answer. In Google Sheets choose File → Share → Publish to web → CSV, then paste the link in Alle.',
    Scene: SheetScene,
  },
  {
    key: 'ai',
    title: 'Or create a deck with AI',
    text: 'Answer a few questions and Alle writes a prompt. Paste it into ChatGPT, Claude or Gemini, then paste the reply back into Alle.',
    Scene: AiScene,
  },
  {
    key: 'study',
    title: 'Study your way',
    text: 'New decks start with multiple choice. Switch to typing in Edit deck when you’re ready. Missed cards come back at the end, so they stick.',
    Scene: StudyScene,
  },
  {
    key: 'home',
    title: 'Keep Alle on your Home Screen',
    text: 'On iPhone, open Alle in Safari, tap Share, then Add to Home Screen. It opens full screen, just like an app.',
    Scene: HomeScene,
  },
];

export function Onboarding({ onDone }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  const go = (n) => {
    if (n < 0 || n >= STEPS.length) return;
    setDir(n > i ? 1 : -1);
    setI(n);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
      initial: (d) => ({ opacity: 0, x: d * 40 }),
      animate: { opacity: 1, x: 0 },
      exit: (d) => ({ opacity: 0, x: d * -40 }),
    };

  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label="How to use Alle">
      <header className="onb__top">
        <Logo />
        {!last && <button type="button" className="text-btn onb__skip" onClick={onDone}>Skip</button>}
      </header>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.section
          key={step.key}
          className="onb__slide"
          custom={dir}
          {...slide}
          transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          drag={reduce ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(i + 1);
            else if (info.offset.x > 60) go(i - 1);
          }}
        >
          <div className="onb__stage" aria-hidden="true"><step.Scene /></div>
          <div className="onb__copy">
            <h2 className="onb__title">{step.title}</h2>
            <p className="onb__text">{step.text}</p>
            {last && (
              <a className="onb__more" href={HELP_URL} target="_blank" rel="noreferrer">More help and step-by-step guides</a>
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      <footer className="onb__bottom">
        <div className="onb__dots" role="tablist" aria-label="Steps">
          {STEPS.map((s, n) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Step ${n + 1}: ${s.title}`}
              className={`onb__dot ${n === i ? 'is-on' : ''}`}
              onClick={() => go(n)}
            />
          ))}
        </div>
        <div className="onb__nav">
          {i > 0 && <Button variant="secondary" onClick={() => go(i - 1)}>Back</Button>}
          <Button onClick={() => (last ? onDone() : go(i + 1))}>{last ? 'Start learning' : 'Next'}</Button>
        </div>
      </footer>
    </div>
  );
}

/* ---- Scenes: small, calm, looping. All motion lives in CSS (onboarding.css). */

function MiniDeck({ title, color, shape, meta }) {
  return (
    <div className="mini-deck" style={{ '--deck-fill': `var(--deck-${color})`, '--deck-deep': `var(--deck-${color}-deep)` }}>
      {meta && <span className="mini-deck__meta">{meta}</span>}
      <span className="mini-deck__title">{title}</span>
      <span className="mini-deck__shape"><DeckShape shape={shape || color} /></span>
    </div>
  );
}

function WelcomeScene() {
  return (
    <div className="sc sc-welcome">
      <div className="sc-card sc-card--back2" />
      <div className="sc-card sc-card--back1" />
      <div className="sc-flip">
        <div className="sc-face sc-face--front"><small>English</small><b>to go</b><span className="sc-type">Type answer…</span></div>
        <div className="sc-face sc-face--back"><small>Dutch</small><b>gaan</b><span className="sc-tag sc-tag--ok">Correct</span></div>
      </div>
    </div>
  );
}

function ReadyScene() {
  return (
    <div className="sc sc-ready">
      <MiniDeck title="Numbers in Portuguese" color="red" meta="Digit → Portuguese" />
      <MiniDeck title="Road signs" color="yellow" meta="Sign → Meaning" />
      <MiniDeck title="Basic Dutch" color="purple" shape="green" meta="English → Dutch" />
      <span className="sc-tap" />
    </div>
  );
}

function SheetScene() {
  const rows = [['to go', 'gaan'], ['the house', 'het huis'], ['thank you', 'dank je']];
  return (
    <div className="sc sc-sheet">
      <div className="sc-gsheet">
        <div className="sc-gsheet__bar"><i /> Dutch words</div>
        <div className="sc-gsheet__row sc-gsheet__head"><span>English</span><span>Dutch</span></div>
        {rows.map(([a, b], n) => (
          <div key={a} className="sc-gsheet__row" style={{ '--n': n }}><span>{a}</span><span>{b}</span></div>
        ))}
      </div>
      <div className="sc-arrow"><Icon name="arrow" /></div>
      <div className="sc-sheet__deck"><MiniDeck title="Dutch words" color="blue" meta="English → Dutch" /></div>
    </div>
  );
}

function AiScene() {
  return (
    <div className="sc sc-ai">
      <div className="sc-bubble sc-bubble--me">Make 20 flashcards for learning Dutch…</div>
      <div className="sc-bubble sc-bubble--ai"><span className="sc-dots"><i /><i /><i /></span><span className="sc-csv">English,Dutch<br />to go,gaan<br />the house,het huis</span></div>
      <div className="sc-ai__deck"><MiniDeck title="Dutch with AI" color="green" shape="pink" meta="English → Dutch" /></div>
    </div>
  );
}

function StudyScene() {
  return (
    <div className="sc sc-study">
      <div className="sc-qcard"><small>Sign</small><b>Stop</b></div>
      <div className="sc-opts">
        <span className="sc-opt">Give way</span>
        <span className="sc-opt sc-opt--right">Stop</span>
        <span className="sc-opt">No entry</span>
        <span className="sc-opt">Roundabout</span>
      </div>
    </div>
  );
}

function HomeScene() {
  return (
    <div className="sc sc-home">
      <div className="sc-phone">
        <div className="sc-phone__bar"><span className="sc-share"><Icon name="share" /></span></div>
        <div className="sc-sheetmenu">
          <span>Copy</span>
          <span className="sc-sheetmenu__hl">Add to Home Screen</span>
          <span>Add Bookmark</span>
        </div>
        <div className="sc-appicon"><span className="sc-appicon__img"><i /><i /></span><small>Alle</small></div>
      </div>
    </div>
  );
}
