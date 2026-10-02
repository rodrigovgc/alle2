import { useEffect, useRef, useState } from 'react';
import { getThemePref, setThemePref } from '../lib/theme.js';
import { Button, IconButton } from '../components/Button.jsx';
import { Tag } from '../components/Tag.jsx';
import { Segmented } from '../components/Segmented.jsx';
import { Field } from '../components/Sheet.jsx';
import { DeckPreview } from '../components/DeckCard.jsx';
import { DeckShape, Icon, Logo } from '../components/Icon.jsx';
import { ICONS } from '../assets/svg.js';
import { DECK_COLORS, DECK_SHAPES } from '../styles/tokens.js';

/*
 * Alle's design system, live. Every swatch reads its value from tokens.css and
 * every component is the real one the app uses, so this page can't drift.
 * Open it at /design.
 */

const COLOR_GROUPS = [
  ['Base', ['--color-background', '--color-surface', '--color-surface-deep', '--color-foreground']],
  ['Greys', ['--grey-500', '--grey-400', '--grey-300', '--grey-200']],
  ['Accent', ['--lime-100', '--lime-200']],
  ['Feedback', ['--tag-correct-bg', '--tag-correct-border', '--tag-almost-bg', '--tag-almost-border', '--tag-wrong-bg', '--tag-wrong-border', '--color-danger']],
];

const TYPE = [
  ['--font-size-display', 'Display', '14/20', 700],
  ['--font-size-large-title', 'Large title', 'Numbers in Portuguese', 700],
  ['--font-size-small-title', 'Title', 'Create your own deck', 700],
  ['--font-size-button', 'Body · Button', 'Import cards from Google Sheets', 400],
  ['--font-size-small', 'Secondary', 'Pick a deck to see how studying works.', 400],
  ['--font-size-caption', 'Caption', 'Digit → Portuguese · 10 cards', 400],
];

const SPACES = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-8', '--space-10'];
const RADII = ['--radius-mark', '--radius-field', '--radius-tag', '--radius-deck', '--radius-button', '--radius-card', '--radius-sheet'];

// Re-read token values whenever the theme changes.
function useThemeTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener('alle-theme', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('alle-theme', on); window.removeEventListener('storage', on); };
  }, []);
  return tick;
}

function useToken(name) {
  const tick = useThemeTick();
  const [v, setV] = useState('');
  useEffect(() => {
    setV(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }, [name, tick]);
  return v;
}

/*
 * Screen sizes in points (CSS pixels). iPhone 18 Pro: 2622 × 1206 px at 3x.
 * iPhone Duo sizes are estimated from Apple's published diagonals (7.6" 4:3
 * inside, 5.4" outside) until exact values are published.
 */
const DEVICES = [
  { value: 'pro', label: 'iPhone 18 Pro', w: 402, h: 874, kind: 'phone', island: true },
  { value: 'duo', label: 'iPhone Duo', kind: 'duo' },
  { value: 'ipad', label: 'iPad', w: 820, h: 1180, kind: 'tablet' },
  { value: 'desktop', label: 'Desktop', w: 1440, h: 900, kind: 'desktop' },
];
const DUO = {
  closed: { w: 468, h: 676, label: 'Closed · outer display' },
  open: { w: 930, h: 698, label: 'Open · inner display' },
};

/** The real app running inside a device frame, scaled to fit the page. */
function PhonePreview() {
  const [device, setDevice] = useState('pro');
  const [fold, setFold] = useState('open');
  const [key, setKey] = useState(0);
  const wrap = useRef(null);
  const [avail, setAvail] = useState(760);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const base = DEVICES.find((x) => x.value === device);
  const d = base.kind === 'duo' ? { ...base, ...DUO[fold] } : base;
  const chrome = { phone: 12, duo: 12, tablet: 16, desktop: 1 }[d.kind];
  const top = d.kind === 'phone' ? 54 : d.kind === 'desktop' ? 40 : d.kind === 'tablet' ? 24 : 32;
  const bottom = 0;
  const outerW = d.w + chrome * 2;
  const outerH = d.h + chrome * 2;
  const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.85 : 900;
  const scale = Math.min(1, avail / outerW, maxH / outerH);

  return (
    <div className="ds-phone-wrap" ref={wrap}>
      <div className="ds-row">
        <Segmented labelledBy="" options={DEVICES} value={device} onChange={setDevice} />
      </div>
      <div className="ds-row">
        {d.kind === 'duo' && (
          <Segmented
            labelledBy=""
            options={[{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }]}
            value={fold}
            onChange={setFold}
          />
        )}
        <Button variant="secondary" className="ds-reload" onClick={() => setKey((k) => k + 1)}>Reload</Button>
        <span className="ds-token">{d.w} × {d.h}{d.kind === 'duo' ? ' · approximate' : ''}{scale < 1 ? ` · shown at ${Math.round(scale * 100)}%` : ''}</span>
      </div>
      <div className="ds-device-slot" style={{ width: outerW * scale, height: outerH * scale }}>
        <div
          className={`ds-device ds-device--${d.kind}`}
          style={{ width: d.w, height: d.h, borderWidth: chrome, transform: `scale(${scale})`, '--top': `${top}px`, '--bottom': `${bottom}px` }}
        >
          {d.kind === 'desktop' ? (
            <div className="ds-device__bar"><i /><i /><i /><span>alle-app.vercel.app</span></div>
          ) : (
            <div className="ds-device__status">
              <span>9:41</span>
              {d.island && <span className="ds-device__island" />}
            </div>
          )}
          <iframe key={`${device}-${fold}-${key}`} className="ds-device__screen" src="/" title={`Alle on ${d.label}`} />
          {d.kind === 'duo' && fold === 'open' && <span className="ds-device__crease" aria-hidden="true" />}

        </div>
      </div>
      <p className="ds-head__text">The real app, signed in as you. Taps, typing and navigation all work; the appearance switch above applies here too.</p>
    </div>
  );
}

function Swatch({ name }) {
  const value = useToken(name);
  return (
    <div className="ds-swatch">
      <span className="ds-swatch__chip" style={{ background: `var(${name})` }} />
      <span className="ds-swatch__name">{name.replace('--', '')}</span>
      <span className="ds-swatch__value">{value}</span>
    </div>
  );
}

function Token({ name }) {
  const value = useToken(name);
  return <span className="ds-token">{name} · {value}</span>;
}

function Section({ title, children }) {
  return (
    <section className="ds-section">
      <h2 className="ds-section__title">{title}</h2>
      {children}
    </section>
  );
}

export function DesignSystem() {
  const [seg, setSeg] = useState(20);
  const [theme, setTheme] = useState(getThemePref);
  return (
    <main className="ds">
      <header className="ds-head">
        <Logo />
        <h1 className="ds-head__title">Design system</h1>
        <p className="ds-head__text">
          Live from the app. Colours and sizes come from <code>src/styles/tokens.css</code>; components are the real ones.
          Change a token and this page, and the app, change with it.
        </p>
        <Segmented
          labelledBy=""
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'Automatic' }]}
          value={theme}
          onChange={(t) => { setThemePref(t); setTheme(t); }}
        />
      </header>

      <Section title="Preview">
        <PhonePreview />
      </Section>

      <Section title="Colour">
        {COLOR_GROUPS.map(([label, names]) => (
          <div key={label} className="ds-group">
            <h3 className="ds-group__title">{label}</h3>
            <div className="ds-swatches">{names.map((n) => <Swatch key={n} name={n} />)}</div>
          </div>
        ))}
        <div className="ds-group">
          <h3 className="ds-group__title">Deck colours · fill and deep</h3>
          <div className="ds-swatches">
            {DECK_COLORS.map((c) => (
              <div key={c} className="ds-pair">
                <Swatch name={`--deck-${c}`} />
                <Swatch name={`--deck-${c}-deep`} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Typography · Inter">
        {TYPE.map(([name, label, sample, weight]) => (
          <div key={name} className="ds-type">
            <span className="ds-type__meta">{label}<Token name={name} /></span>
            <span style={{ fontSize: `var(${name})`, fontWeight: weight, lineHeight: 'var(--line-height-tight)', letterSpacing: weight === 700 ? 'var(--letter-spacing-title)' : 0 }}>
              {sample}
            </span>
          </div>
        ))}
      </Section>

      <Section title="Spacing and radius">
        <div className="ds-group">
          {SPACES.map((n) => (
            <div key={n} className="ds-space"><span className="ds-space__bar" style={{ width: `var(${n})` }} /><Token name={n} /></div>
          ))}
        </div>
        <div className="ds-radii">
          {RADII.map((n) => (
            <div key={n} className="ds-radius"><span className="ds-radius__box" style={{ borderRadius: `var(${n})` }} /><Token name={n} /></div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="ds-stack">
          <Button>Primary · Answer</Button>
          <Button icon="shuffle">Primary with icon</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger · Remove deck</Button>
          <Button disabled>Disabled</Button>
          <button type="button" className="text-btn">Text button</button>
        </div>
        <div className="ds-row">
          <IconButton icon="plus" label="Outer icon button" />
          <IconButton icon="close" label="Outer icon button" />
          <IconButton icon="speaker" label="Inner icon button" className="icon-btn--inner" />
          <IconButton icon="swap" label="Inner icon button" className="icon-btn--inner" />
          <button type="button" className="skip">Skip</button>
        </div>
      </Section>

      <Section title="Controls">
        <div className="ds-stack">
          <Segmented labelledBy="" options={[20, 50, 100].map((n) => ({ value: n, label: String(n) }))} value={seg} onChange={setSeg} />
          <div className="ds-row"><Tag verdict="correct" /><Tag verdict="almost" /><Tag verdict="wrong" /></div>
          <div className="progress" style={{ '--progress': 0.4 }}><span className="progress__fill" /></div>
          <Field label="Field label" hint="Hint text in caption size.">
            <input className="input" placeholder="Placeholder" />
          </Field>
          <div className="chips">
            <button type="button" className="chip is-checked">Chosen chip</button>
            <button type="button" className="chip">Chip</button>
          </div>
          <label className="choice is-checked"><span>Choice row, selected</span></label>
          <label className="choice"><span>Choice row</span></label>
        </div>
      </Section>

      <Section title="Multiple choice">
        <div className="ds-stack">
          <button type="button" className="quiz-option">Option</button>
          <button type="button" className="quiz-option is-right">Right answer</button>
          <button type="button" className="quiz-option is-wrong">Wrong pick</button>
          <button type="button" className="quiz-option is-dim">Other options, dimmed</button>
        </div>
      </Section>

      <Section title="Cards">
        <div className="ds-stack">
          <DeckPreview deck={{ title: 'Numbers in Portuguese', front_label: 'Digit', back_label: 'Portuguese', color: 'red', cards: Array(10) }} />
          <DeckPreview deck={{ title: 'Monochrome deck', front_label: 'English', back_label: 'Dutch', color: 'none', shape: 'purple', cards: Array(156) }} />
          <div className="ds-study">
            <div className="study-card__face" style={{ '--card-shadow': 'var(--shadow-card)' }}>
              <header className="study-card__header">
                <span className="study-card__label">English</span>
                <button type="button" className="skip">Skip</button>
              </header>
              <div className="study-card__body">
                <p className="study-card__text">How do you get to work?</p>
                <span className="study-card__input study-card__input--static">Type answer…</span>
              </div>
            </div>
          </div>
          <div className="ds-study">
            <div className="study-card__face" style={{ '--card-shadow': 'var(--shadow-card)' }}>
              <header className="study-card__header">
                <span className="study-card__label">Dutch</span>
                <IconButton icon="speaker" label="Read aloud" className="icon-btn--inner icon-btn--card" />
              </header>
              <div className="study-card__body">
                <p className="study-card__text study-card__text--typed">Hoe kom jij naa<mark className="mark mark--wrong">t</mark> het werk</p>
                <p className="study-card__text">Hoe kom jij naa<mark className="mark mark--fix">r</mark> het werk?</p>
                <div className="study-card__verdict"><Tag verdict="almost" /></div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Deck shapes">
        <div className="ds-shapes">
          {DECK_SHAPES.map((sh) => (
            <span key={sh} className="ds-shape" style={{ '--deck-fill': `var(--deck-${sh})`, '--deck-deep': `var(--deck-${sh}-deep)` }}>
              <DeckShape shape={sh} />
            </span>
          ))}
        </div>
      </Section>

      <Section title="Icons">
        <div className="ds-icons">
          {Object.keys(ICONS).map((k) => (
            <span key={k} className="ds-icon"><Icon name={k} /><span>{k}</span></span>
          ))}
        </div>
      </Section>
    </main>
  );
}
