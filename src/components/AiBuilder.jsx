import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, IconButton } from './Button.jsx';
import { Icon } from './Icon.jsx';
import { Field, SheetActions } from './Sheet.jsx';
import { Segmented } from './Segmented.jsx';
import { DeckImportError, parseLooseTable } from '../lib/csv.js';
import { inferLang } from '../lib/speech.js';
import { imageSrc, needsFrame } from '../lib/media.js';
import {
  LEVELS, SIZES, SUBJECTS, buildPrompt, describeTopic, presetFor,
} from '../lib/prompt.js';

const STEPS = ['subject', 'topic', 'sides', 'size', 'prompt', 'paste'];
const LANGS = ['Dutch', 'French', 'Spanish', 'Portuguese', 'German', 'Italian'];
const TOPIC_HINTS = {
  science: 'e.g. Cell biology',
  history: 'e.g. The French Revolution',
  math: 'e.g. Multiplication tables',
  other: 'e.g. Wine regions of Portugal',
};

/**
 * Six short steps: subject → topic → front & back → size → prompt → paste.
 * The prompt is a fixed template with the answers filled in, so it runs in
 * the browser at no cost. The last step reads the AI's reply and makes the deck.
 */
export function AiBuilder({ onCreate }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [v, setV] = useState({
    subject: null, known: 'English', learning: '', topic: '',
    presetIndex: 0, front: '', back: '', frontHint: '', backHint: '',
    count: 20, level: 'Beginner', alternatives: true,
  });
  const set = (patch) => setV((cur) => ({ ...cur, ...patch }));

  const valid = [
    Boolean(v.subject) && (v.subject !== 'other' || v.topic.trim()),
    v.subject === 'language' ? v.known.trim() && v.learning.trim() : v.subject === 'other' || v.topic.trim(),
    v.front.trim() && v.back.trim(),
    true,
    true,
    false, // the paste step has its own button
  ];

  function go(delta) {
    const nextStep = step + delta;
    // Entering "front & back": start from the preset for this subject.
    if (STEPS[nextStep] === 'sides' && delta > 0) {
      set(presetFor(v.subject, v, v.presetIndex));
    }
    setDir(delta);
    setStep(nextStep);
  }

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 * dir },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 * dir, transition: { duration: 0.12 } },
      };

  return (
    <form
      className="sheet__body builder"
      onSubmit={(e) => { e.preventDefault(); if (valid[step]) go(1); }}
    >
      <div className="builder__progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => <span key={s} className={i <= step ? 'is-done' : ''} />)}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} className="builder__step" {...slide} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          {STEPS[step] === 'subject' && <SubjectStep v={v} set={set} />}
          {STEPS[step] === 'topic' && <TopicStep v={v} set={set} />}
          {STEPS[step] === 'sides' && <SidesStep v={v} set={set} />}
          {STEPS[step] === 'size' && <SizeStep v={v} set={set} />}
          {STEPS[step] === 'prompt' && <PromptStep v={v} />}
          {STEPS[step] === 'paste' && <PasteStep v={v} onCreate={onCreate} onBack={() => go(-1)} />}
        </motion.div>
      </AnimatePresence>

      {STEPS[step] !== 'paste' && (
        <SheetActions>
          <Button type="submit" disabled={!valid[step]}>
            Continue
          </Button>
          {step > 0 && <Button variant="secondary" onClick={() => go(-1)}>Back</Button>}
        </SheetActions>
      )}
    </form>
  );
}

/* ---- Steps -------------------------------------------------------------- */

function StepHead({ title, text }) {
  return (
    <header className="builder__head">
      <h3 className="builder__title">{title}</h3>
      {text && <p className="builder__text">{text}</p>}
    </header>
  );
}

function Choice({ name, value, checked, onChange, children }) {
  return (
    <label className={`choice ${checked ? 'is-checked' : ''}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

function Chips({ options, value, onChange, label }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o;
        const text = typeof o === 'object' ? o.label : o;
        return (
          <button
            key={val}
            type="button"
            role="radio"
            aria-checked={value === val}
            className={`chip ${value === val ? 'is-checked' : ''}`}
            onClick={() => onChange(val)}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

function SubjectStep({ v, set }) {
  return (
    <>
      <StepHead title="What do you want to learn?" />
      <div className="choices">
        {SUBJECTS.map((s) => (
          <Choice
            key={s.id}
            name="subject"
            value={s.id}
            checked={v.subject === s.id}
            onChange={() => set({ subject: s.id, presetIndex: 0 })}
          >
            {s.label}
          </Choice>
        ))}
      </div>
      {v.subject === 'other' && (
        <Field label="What is it?">
          <input className="input" autoFocus value={v.topic} placeholder={TOPIC_HINTS.other}
            onChange={(e) => set({ topic: e.target.value })} />
        </Field>
      )}
    </>
  );
}

function TopicStep({ v, set }) {
  if (v.subject === 'language') {
    return (
      <>
        <StepHead title="Which languages?" />
        <Field label="I speak">
          <input className="input" value={v.known} onChange={(e) => set({ known: e.target.value })} />
        </Field>
        <Field label="I’m learning">
          <input className="input" value={v.learning} placeholder="e.g. Dutch"
            onChange={(e) => set({ learning: e.target.value })} />
        </Field>
        <Chips options={LANGS} value={v.learning} onChange={(l) => set({ learning: l })} label="Popular languages" />
      </>
    );
  }
  if (v.subject === 'other') {
    return (
      <>
        <StepHead title="Anything more specific?" text="Optional. A narrower topic gives better cards." />
        <Field label="Topic">
          <input className="input" value={v.topic} onChange={(e) => set({ topic: e.target.value })} />
        </Field>
      </>
    );
  }
  const label = SUBJECTS.find((s) => s.id === v.subject)?.label;
  return (
    <>
      <StepHead title={`Which part of ${label.toLowerCase()}?`} />
      <Field label="Topic">
        <input className="input" autoFocus value={v.topic} placeholder={TOPIC_HINTS[v.subject]}
          onChange={(e) => set({ topic: e.target.value })} />
      </Field>
    </>
  );
}

function SidesStep({ v, set }) {
  const swap = () => set({
    front: v.back, back: v.front, frontHint: v.backHint, backHint: v.frontHint,
  });
  return (
    <>
      <StepHead title="Front and back" />
      <FlipPreview front={v.front} back={v.back} />
      <div className="builder__sides">
        <Field label="Front">
          <input className="input" value={v.front} onChange={(e) => set({ front: e.target.value, frontHint: '' })} />
        </Field>
        <IconButton icon="swap" label="Swap front and back" className="icon-btn--inner builder__swap" onClick={swap} />
        <Field label="Back">
          <input className="input" value={v.back} onChange={(e) => set({ back: e.target.value, backHint: '' })} />
        </Field>
      </div>
    </>
  );
}

function FlipPreview({ front, back }) {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setFlipped((f) => !f), 2200);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <button type="button" className="mini-card" onClick={() => setFlipped((f) => !f)} aria-label="Flip the example card">
      <motion.span
        className="mini-card__flipper"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      >
        <span className="mini-card__face">
          <span className="mini-card__side">Front</span>
          <span className="mini-card__text">{front || 'Column A'}</span>
        </span>
        <span className="mini-card__face mini-card__face--back">
          <span className="mini-card__side">Back</span>
          <span className="mini-card__text">{back || 'Column B'}</span>
        </span>
      </motion.span>
    </button>
  );
}

function SizeStep({ v, set }) {
  return (
    <>
      <StepHead title="Deck settings" />
      <div className="builder__group">
        <span className="field__label" id="size-label">How many cards?</span>
        <Segmented
          labelledBy="size-label"
          options={SIZES.map((n) => ({ value: n, label: String(n) }))}
          value={v.count}
          onChange={(n) => set({ count: n })}
        />
      </div>
      <div className="builder__group">
        <span className="field__label" id="level-label">Difficulty</span>
        <Segmented
          labelledBy="level-label"
          options={LEVELS.map((l) => ({ value: l, label: l }))}
          value={v.level}
          onChange={(l) => set({ level: l })}
        />
      </div>
    </>
  );
}

function PromptStep({ v }) {
  const prompt = useMemo(() => buildPrompt(v), [v]);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Older browsers: select the text so the user can copy it themselves.
      const el = document.getElementById('ai-prompt');
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <StepHead
        title="Your prompt is ready"
        text="Copy it into ChatGPT, Claude, Gemini or any AI chat. When it replies, copy its whole answer and come back here."
      />
      <div className="prompt-box">
        <pre className="prompt-box__text" id="ai-prompt">{prompt}</pre>
        <button
          type="button"
          className="prompt-box__copy"
          aria-label={copied ? 'Prompt copied' : 'Copy prompt'}
          onClick={copy}
        >
          <Icon name={copied ? 'check' : 'copy'} />
        </button>
        <span className="visually-hidden" role="status">{copied ? 'Prompt copied' : ''}</span>
      </div>
    </>
  );
}

function PasteStep({ v, onCreate, onBack }) {
  const [raw, setRaw] = useState('');
  const [name, setName] = useState(() => (v.subject === 'language' ? v.learning : v.topic || describeTopic(v)));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  const parsed = useMemo(() => {
    if (!raw.trim()) return null;
    try { return { deck: parseLooseTable(raw) }; } catch (e) {
      return { error: e instanceof DeckImportError ? e.message : 'Those cards couldn’t be read. Copy the whole reply, including the first row.' };
    }
  }, [raw]);

  async function create() {
    if (!parsed?.deck) return;
    setBusy(true); setSaveError('');
    try {
      const d = parsed.deck;
      await onCreate({
        title: name.trim() || d.backLabel,
        csv_url: null,
        front_label: d.frontLabel,
        back_label: d.backLabel,
        lang: inferLang(v.subject === 'language' ? v.learning : d.backLabel),
        cards: d.cards,
      });
    } catch (e) {
      setSaveError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <StepHead title="Paste the cards" text="Paste the AI’s whole reply. Alle picks out the cards." />
      <textarea
        className="input input--area"
        rows={5}
        value={raw}
        placeholder={`${v.front || 'Column A'},${v.back || 'Column B'}\n…`}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => setRaw(e.target.value)}
      />
      {parsed?.error && <p className="form-error" role="alert">{parsed.error}</p>}
      {parsed?.deck && (
        <div className="preview-list" aria-label="Preview">
          <p className="preview-list__head">
            {parsed.deck.cards.length} cards · {parsed.deck.frontLabel} → {parsed.deck.backLabel}
          </p>
          {parsed.deck.cards.slice(0, 5).map((c, i) => (
            <div key={i} className="preview-list__row">
              {imageSrc(c.front)
                ? <img className={`preview-list__img ${needsFrame(c.front) ? 'is-framed' : ''}`} src={imageSrc(c.front)} alt={c.front} />
                : <span>{c.front}</span>}
              <span>{c.back.replace(/\|/g, ' / ')}</span>
            </div>
          ))}
          <p className="field__hint">Check a few answers. AI can make mistakes.</p>
        </div>
      )}
      {parsed?.deck && (
        <Field label="Deck name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
      )}
      {saveError && <p className="form-error" role="alert">{saveError}</p>}
      <SheetActions>
        <Button onClick={create} disabled={!parsed?.deck || busy}>{busy ? 'Creating…' : 'Create deck'}</Button>
        <Button variant="secondary" onClick={onBack}>Back</Button>
      </SheetActions>
    </>
  );
}
