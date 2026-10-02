import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo, Icon, DeckShape } from '../components/Icon.jsx';
import { Button, IconButton } from '../components/Button.jsx';
import { DeckCard, DeckPreview } from '../components/DeckCard.jsx';
import { Menu } from '../components/Menu.jsx';
import { Sheet, Field, SheetActions } from '../components/Sheet.jsx';
import { AiBuilder } from '../components/AiBuilder.jsx';
import { ReorderList } from '../components/ReorderList.jsx';
import { Segmented } from '../components/Segmented.jsx';
import { Account } from '../components/Account.jsx';
import { READY_MADE } from '../lib/sampleDeck.js';
import { answerMode } from '../lib/srs.js';
import { fetchDeckFromUrl } from '../lib/csv.js';
import { LANGUAGES, inferLang } from '../lib/speech.js';
import { DECK_COLORS, DECK_COLOR_LABELS, DECK_SHAPES, NO_COLOR, SPRING, deckColorVars, deckShape, pickDeckLook, tokenNumber } from '../styles/tokens.js';

export function Home({
  decks, loading, dueByDeck, colorMode,
  onAddSample, onColorMode, onStudyDeck, onShuffle,
  onAddDeck, onUpdateDeck, onRemoveDeck, onResetProgress, onReorder, onSignOut, userEmail,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(null); // { type, deck? }
  const headerRef = useRef(null);
  const shellPill = useMemo(() => tokenNumber('--size-search-pill', 98), []);
  const [shellFull, setShellFull] = useState(shellPill);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;
    const gutter = tokenNumber('--gutter', 16);
    const measure = () => setShellFull(el.clientWidth - gutter * 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function openSearch() { setSearching(true); }
  function closeSearch() { setSearching(false); setQuery(''); }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((d) =>
      [d.title, d.front_label, d.back_label].some((s) => s?.toLowerCase().includes(q)));
  }, [decks, query]);

  const close = () => setSheet(null);
  // Reorder mode: a working copy of the order, saved on Done.
  const [order, setOrder] = useState(null);
  const reordering = order !== null;
  async function finishReorder() {
    const changed = order.some((d, i) => d.id !== decks[i]?.id);
    const next = order;
    setOrder(null);
    if (changed) await onReorder(next);
  }
  // Ready-made decks the user hasn't added yet; added ones are hidden.
  const remainingReadyMade = READY_MADE.filter((r) => !decks.some((d) => d.is_sample && d.title === r.title));

  return (
    <main className="home">
      <header className="home__header" ref={headerRef}>
        {/* Logo and + only fade: nothing is scaled or moved, so nothing distorts */}
        <motion.div
          className="home__logo"
          initial={false}
          animate={{ opacity: searching ? 0 : 1 }}
          transition={{ duration: searching ? 0.12 : 0.2, delay: searching ? 0 : 0.12 }}
          aria-hidden={searching}
        >
          <Logo />
        </motion.div>

        <div className="home__actions">
          <motion.div
            initial={false}
            animate={{ opacity: searching ? 0 : 1 }}
            transition={{ duration: searching ? 0.12 : 0.2, delay: searching ? 0 : 0.12 }}
            style={{ pointerEvents: searching ? 'none' : 'auto' }}
          >
            <IconButton icon="plus" label="Add deck" onClick={() => setSheet({ type: 'choose' })} tabIndex={searching ? -1 : 0} />
          </motion.div>
          <div className="pill-slot" aria-hidden="true" />
          <Menu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            className="menu--home"
            items={[
              ...(decks.length > 1 ? [{ label: 'Reorder decks', icon: 'sort', onSelect: () => { setSearching(false); setQuery(''); setOrder(decks); } }] : []),
              { label: 'Account', icon: 'person', onSelect: () => setSheet({ type: 'account' }) },
            ]}
          />
        </div>

        {/* One shell: its real width grows from the pill to the full row. Width
            changes reflow the contents instead of stretching them. */}
        <motion.div
          className={`search-shell ${searching ? 'is-open' : ''}`}
          initial={false}
          animate={{ width: searching ? shellFull : shellPill }}
          transition={SPRING.morph}
        >
          <AnimatePresence initial={false}>
            {searching ? (
              <motion.div
                key="field"
                className="search__content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.18 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <Icon name="search" className="search__icon" />
                <input
                  className="search__input"
                  type="search"
                  placeholder="Search decks"
                  aria-label="Search decks"
                  value={query}
                  autoFocus
                  enterKeyHint="search"
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                />
                <button type="button" className="search__cancel" onClick={closeSearch}>Cancel</button>
              </motion.div>
            ) : (
              <motion.div
                key="pill"
                className="pill__content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.18 } }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
              >
                <button type="button" className="pill__btn" aria-label="Search decks" onClick={openSearch}>
                  <Icon name="search" />
                </button>
                <button
                  type="button"
                  className="pill__btn"
                  aria-label="More options"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(true)}
                >
                  <Icon name="more" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </header>

      {(loading || decks.length > 0) && (
        <div className="home__title-row">
          <h1 className="home__title">{reordering ? 'Reorder decks' : 'My study decks'}</h1>
          {reordering && <button type="button" className="text-btn home__done" onClick={finishReorder}>Done</button>}
        </div>
      )}

      <section className="deck-list" aria-busy={loading}>
        {loading && !decks.length && <div className="deck deck--skeleton" aria-hidden="true" />}
        {!loading && !decks.length && (
          <div className="start" aria-label="Get started">
            <section className="start-tile">
              <h2 className="start-tile__title">Create your own deck</h2>
              <p className="start-tile__text">Import cards from Google Sheets or create a new deck with AI.</p>
              <CreateChoices onAi={() => setSheet({ type: 'ai' })} onPaste={() => setSheet({ type: 'paste' })} onImport={() => setSheet({ type: 'add' })} />
            </section>
            <section className="start-tile">
              <h2 className="start-tile__title">Try a sample deck</h2>
              <p className="start-tile__text">Pick a deck to see how studying works.</p>
              <div className="start-tile__samples">
                {READY_MADE.map((r) => (
                  <SampleCard key={r.key} title={r.title} color={r.color} onClick={() => onAddSample(r.key)} />
                ))}
              </div>
            </section>
          </div>
        )}
        {!!decks.length && !visible.length && (
          <p className="empty__body">No decks match “{query}”.</p>
        )}
        {reordering && <ReorderList decks={order} mode={colorMode} onChange={setOrder} />}
        {!reordering && <AnimatePresence initial={false} mode="popLayout">
          {visible.map((deck) => (
            <motion.div
              key={deck.id}
              layout="position"
              initial={query ? { opacity: 0, scale: 0.94 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              transition={SPRING.morph}
            >
              <DeckCard
                deck={deck}
                mode={colorMode}
                due={dueByDeck[deck.id] || 0}
                onOpen={() => onStudyDeck(deck)}
                onUpdateUrl={() => setSheet({ type: 'url', deck })}
                onCustomize={() => setSheet({ type: 'cover', deck })}
                onResetProgress={() => setSheet({ type: 'reset', deck })}
                onRemove={() => setSheet({ type: 'remove', deck })}
              />
            </motion.div>
          ))}
        </AnimatePresence>}
      </section>

      {decks.length > 0 && !reordering && (
        <div className="home__cta">
          <Button icon="shuffle" onClick={() => decks.length > 1 ? setSheet({ type: 'shuffle' }) : onShuffle(decks.map((d) => d.id))}>Shuffle decks</Button>
        </div>
      )}

      <Sheet open={sheet?.type === 'choose'} onClose={close} title="Create your own deck" variant="dialog">
        <div className="sheet__body">
          <p className="sheet__text">Import cards from Google Sheets or create a new deck with AI.</p>
          <SheetActions>
            <CreateChoices onAi={() => setSheet({ type: 'ai' })} onPaste={() => setSheet({ type: 'paste' })} onImport={() => setSheet({ type: 'add' })} />
            {remainingReadyMade.length > 0 && (
              <button type="button" className="text-btn" onClick={() => setSheet({ type: 'library' })}>
                Browse ready-made decks
              </button>
            )}
          </SheetActions>
        </div>
      </Sheet>

      <Sheet open={sheet?.type === 'account'} onClose={close} title="Account">
        <Account
          email={userEmail}
          colorMode={colorMode}
          onColorMode={onColorMode}
          onSignOut={onSignOut}
          onClose={close}
        />
      </Sheet>

      <Sheet open={sheet?.type === 'shuffle'} onClose={close} title="Shuffle decks" variant="dialog">
        <ShufflePicker
          decks={decks}
          onStart={(ids) => { close(); onShuffle(ids); }}
        />
      </Sheet>

      <Sheet open={sheet?.type === 'library'} onClose={close} title="Ready-made decks">
        <div className="sheet__body">
          {remainingReadyMade.length > 0 && <p className="sheet__text">Tap a deck to add it. Add as many as you like.</p>}
          {remainingReadyMade.length ? (
            <div className="start-tile__samples library">
              <AnimatePresence initial={false} mode="popLayout">
                {remainingReadyMade.map((r) => (
                  <motion.div
                    key={r.key}
                    layout
                    initial={false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
                    transition={SPRING.morph}
                  >
                    <SampleCard
                      title={r.title}
                      color={r.color}
                      onClick={() => onAddSample(r.key)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="library-done">
              <p className="sheet__text">You’ve added every ready-made deck.</p>
              <Button onClick={close}>Done</Button>
            </div>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet?.type === 'add'} onClose={close} title="Import from Google Sheets">
        <DeckUrlForm
          submitLabel="Import deck"
          onSubmit={async (parsed, extra) => {
            await onAddDeck({
              title: extra.title || parsed.backLabel,
              csv_url: parsed.csvUrl,
              front_label: parsed.frontLabel,
              back_label: parsed.backLabel,
              lang: inferLang(parsed.backLabel),
              ...pickDeckLook(decks),
              cards: parsed.cards,
            });
            close();
          }}
          withTitle
        />
      </Sheet>

      <Sheet open={sheet?.type === 'ai'} onClose={close} title="Create with AI">
        <AiBuilder
          onCreate={async (deck) => {
            await onAddDeck({ ...deck, ...pickDeckLook(decks) });
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet?.type === 'paste'} onClose={close} title="Paste AI deck prompt">
        <AiBuilder
          pasteOnly
          onCreate={async (deck) => {
            await onAddDeck({ ...deck, ...pickDeckLook(decks) });
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet?.type === 'url'} onClose={close} title="Update URL">
        {sheet?.deck && (
          <DeckUrlForm
            initialUrl={sheet.deck.csv_url || ''}
            submitLabel="Update deck"
            onSubmit={async (parsed) => {
              await onUpdateDeck(sheet.deck.id, {
                csv_url: parsed.csvUrl,
                front_label: parsed.frontLabel,
                back_label: parsed.backLabel,
                cards: parsed.cards,
                is_sample: false,
              });
              close();
            }}
          />
        )}
      </Sheet>

      <Sheet open={sheet?.type === 'cover'} onClose={close} title="Customize cover">
        {sheet?.deck && (
          <CoverForm
            deck={sheet.deck}
            onSubmit={async (patch) => { await onUpdateDeck(sheet.deck.id, patch); close(); }}
          />
        )}
      </Sheet>

      <Sheet open={sheet?.type === 'reset'} onClose={close} title="Reset progress" variant="dialog">
        {sheet?.deck && (
          <div className="sheet__body">
            <p className="sheet__text">
              Every card in “{sheet.deck.title}” will count as new again, as if you’d never studied it. This can’t be undone.
            </p>
            <SheetActions>
              <Button variant="danger" onClick={async () => { await onResetProgress(sheet.deck.id); close(); }}>
                Reset progress
              </Button>
              <Button variant="secondary" onClick={close}>Keep progress</Button>
            </SheetActions>
          </div>
        )}
      </Sheet>

      <Sheet open={sheet?.type === 'remove'} onClose={close} title="Remove deck" variant="dialog">
        {sheet?.deck && (
          <div className="sheet__body">
            <p className="sheet__text">
              “{sheet.deck.title}” and its study progress will be removed. Your Google Sheet stays as it is.
            </p>
            <SheetActions>
              <Button
                variant="danger"
                onClick={async () => { await onRemoveDeck(sheet.deck.id); close(); }}
              >
                Remove deck
              </Button>
              <Button variant="secondary" onClick={close}>Keep deck</Button>
            </SheetActions>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function DeckUrlForm({ initialUrl = '', submitLabel, onSubmit, withTitle = false }) {
  const [url, setUrl] = useState(initialUrl);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const parsed = await fetchDeckFromUrl(url);
      await onSubmit(parsed, { title: title.trim() });
    } catch (err) {
      setError(err.message || 'Something went wrong. Try the link again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="sheet__body" onSubmit={submit}>
      <Field label="Published CSV link" hint="File → Share → Publish to web → Comma-separated values.">
        <input
          className="input"
          type="url"
          inputMode="url"
          name="alle-sheet-source"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="https://docs.google.com/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Field>
      {withTitle && (
        <Field label="Deck name" hint="Leave empty to use the back column’s name.">
          <input
            className="input"
            name="alle-deck-name"
            autoComplete="off"
            enterKeyHint="go"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <SheetActions>
        <Button type="submit" disabled={busy || !url.trim()}>{busy ? 'Reading sheet…' : submitLabel}</Button>
      </SheetActions>
    </form>
  );
}

function CoverForm({ deck, onSubmit }) {
  const [title, setTitle] = useState(deck.title);
  const [color, setColor] = useState(deck.color);
  const [shape, setShape] = useState(deckShape(deck));
  const [lang, setLang] = useState(deck.lang);
  const [mode, setMode] = useState(answerMode(deck));
  const canChoose = answerMode({ ...deck, answer_mode: 'choice' }) === 'choice';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = deckColorVars(color);

  return (
    <form
      className="sheet__body"
      onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try {
          const patch = { title: title.trim() || deck.title, color, shape, lang };
          if (mode !== answerMode(deck)) patch.answer_mode = mode; // only send when changed
          await onSubmit(patch);
        } catch (err) {
          setError(/answer_mode/.test(err.message)
            ? 'Answer settings need one database update. Run supabase/003_answer_mode.sql in Supabase, then save again.'
            : /shape/.test(err.message)
              ? 'Shapes need one database update. Run supabase/002_shapes.sql in Supabase, then save again.'
              : err.message);
        } finally { setBusy(false); }
      }}
    >
      <DeckPreview deck={{ ...deck, title, color, shape }} />

      <fieldset className="picker">
        <legend className="field__label">Colour</legend>
        <div className="colors">
          {[NO_COLOR, ...DECK_COLORS].map((c) => {
            const { fill, deep, ink, ink2 } = deckColorVars(c);
            const label = c === NO_COLOR ? 'No colour' : DECK_COLOR_LABELS[c];
            return (
              <label key={c} className={`color ${c === NO_COLOR ? 'color--none' : ''}`} style={{ '--deck-fill': fill, '--deck-deep': deep, '--deck-ink': ink, '--deck-ink-2': ink2 }}>
                <input type="radio" name="color" value={c} checked={color === c} onChange={() => setColor(c)} />
                <span className="color__dot" />
                <span className="visually-hidden">{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="picker">
        <legend className="field__label">Shape</legend>
        <div className="shapes" style={{ '--deck-fill': current.fill, '--deck-deep': current.deep }}>
          {DECK_SHAPES.map((sh, i) => (
            <label key={sh} className="shape">
              <input type="radio" name="shape" value={sh} checked={shape === sh} onChange={() => setShape(sh)} />
              <span className="shape__tile"><DeckShape shape={sh} /></span>
              <span className="visually-hidden">Shape {i + 1}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Deck name">
        <input className="input" name="alle-deck-name" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      {canChoose && (
        <div className="builder__group">
          <span className="field__label" id="answer-label">Answer by</span>
          <Segmented
            labelledBy="answer-label"
            options={[{ value: 'type', label: 'Typing' }, { value: 'choice', label: 'Multiple choice' }]}
            value={mode}
            onChange={setMode}
          />
        </div>
      )}
      <Field label="Read-aloud language" hint={`Used for the speaker on the ${deck.back_label} side.`}>
        <select className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </Field>
      {error && <p className="form-error" role="alert">{error}</p>}
      <SheetActions>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save cover'}</Button>
      </SheetActions>
    </form>
  );
}

function ShufflePicker({ decks, onStart }) {
  const [chosen, setChosen] = useState(() => new Set(decks.map((d) => d.id)));
  const toggle = (id) => setChosen((cur) => {
    const next = new Set(cur);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const all = chosen.size === decks.length;
  return (
    <div className="sheet__body shuffle-body">
      <div className="shuffle-head">
        <p className="sheet__text">Pick decks to shuffle</p>
        <button type="button" className="text-btn shuffle-head__all" onClick={() => setChosen(all ? new Set() : new Set(decks.map((d) => d.id)))}>
          {all ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="check-list shuffle-scroll">
        {decks.map((deck) => {
          const { fill, deep } = deckColorVars(deck.color);
          const on = chosen.has(deck.id);
          return (
            <label key={deck.id} className={`check-row ${on ? 'is-on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(deck.id)} />
              <span className="check-row__dot" style={{ '--deck-fill': fill, '--deck-deep': deep }} />
              <span className="check-row__title">{deck.title}</span>
              <span className="check-row__box">{on && <Icon name="check" />}</span>
            </label>
          );
        })}
      </div>
      <SheetActions>
        <Button icon="shuffle" disabled={chosen.size === 0} onClick={() => onStart([...chosen])}>
          {chosen.size === decks.length ? 'Shuffle all decks'
            : `Shuffle ${chosen.size} ${chosen.size === 1 ? 'deck' : 'decks'}`}
        </Button>
      </SheetActions>
    </div>
  );
}

function CreateChoices({ onAi, onPaste, onImport }) {
  return (
    <div className="create-choices">
      <Button onClick={onAi}>Create with AI</Button>
      <Button variant="secondary" className="btn--on-tile" onClick={onPaste}>Paste AI deck prompt</Button>
      <Button variant="secondary" className="btn--on-tile" onClick={onImport}>Import from Google Sheets</Button>
    </div>
  );
}

/** A small deck card that adds a sample deck when tapped. */
function SampleCard({ title, color, onClick, added = false }) {
  const { fill, deep, ink, ink2 } = deckColorVars(color);
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`sample-card ${added ? 'is-added' : ''}`}
      style={{ '--deck-fill': fill, '--deck-deep': deep, '--deck-ink': ink, '--deck-ink-2': ink2 }}
      disabled={busy || added}
      aria-label={added ? `${title}, already added` : `Add the sample deck ${title}`}
      onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}
    >
      <span className="sample-card__title">
        {title}
        {added && <span className="sample-card__added"><Icon name="check" /> Added</span>}
      </span>
      <DeckShape shape={color} />
    </button>
  );
}
