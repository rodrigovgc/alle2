import { useMemo, useRef, useState } from 'react';
import { Logo, Icon, DeckShape } from '../components/Icon.jsx';
import { Button, IconButton } from '../components/Button.jsx';
import { DeckCard, DeckPreview } from '../components/DeckCard.jsx';
import { Menu } from '../components/Menu.jsx';
import { Sheet, Field, SheetActions } from '../components/Sheet.jsx';
import { SampleBanner } from '../components/Banner.jsx';
import { fetchDeckFromUrl } from '../lib/csv.js';
import { LANGUAGES, inferLang } from '../lib/speech.js';
import { DECK_COLORS, DECK_COLOR_LABELS, DECK_SHAPES, NO_COLOR, deckColorVars, deckShape, nextDeckColor } from '../styles/tokens.js';

export function Home({
  decks, loading, dueByDeck, colorMode, showBanner,
  onDismissBanner, onColorMode, onStudyDeck, onShuffle,
  onAddDeck, onUpdateDeck, onRemoveDeck, onSignOut,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(null); // { type, deck? }
  const searchRef = useRef(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((d) =>
      [d.title, d.front_label, d.back_label].some((s) => s?.toLowerCase().includes(q)));
  }, [decks, query]);

  const close = () => setSheet(null);

  return (
    <main className="home">
      <header className="home__header">
        {searching ? (
          <div className="search">
            <Icon name="search" className="search__icon" />
            <input
              ref={searchRef}
              className="search__input"
              type="search"
              placeholder="Search decks"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="search__cancel"
              onClick={() => { setSearching(false); setQuery(''); }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <Logo />
            <div className="home__actions">
              <IconButton icon="plus" label="Add deck" onClick={() => setSheet({ type: 'add' })} />
              <div className="pill">
                <button type="button" className="pill__btn" aria-label="Search decks" onClick={() => setSearching(true)}>
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
              </div>
              <Menu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                className="menu--home"
                items={[
                  { label: 'Colorful', checked: colorMode === 'colorful', onSelect: () => onColorMode('colorful') },
                  { label: 'Monochrome', checked: colorMode === 'monochrome', onSelect: () => onColorMode('monochrome') },
                  { divider: true },
                  { label: 'Sign out', danger: true, onSelect: onSignOut },
                ]}
              />
            </div>
          </>
        )}
      </header>

      <h1 className="home__title">My study decks</h1>

      {showBanner && <SampleBanner onDismiss={onDismissBanner} />}

      <section className="deck-list" aria-busy={loading}>
        {loading && !decks.length && <div className="deck deck--skeleton" aria-hidden="true" />}
        {!loading && !decks.length && (
          <div className="empty">
            <p className="empty__title">No decks yet</p>
            <p className="empty__body">Publish a Google Sheet as CSV, then add it here.</p>
            <Button variant="secondary" icon="plus" onClick={() => setSheet({ type: 'add' })}>Add a deck</Button>
          </div>
        )}
        {!!decks.length && !visible.length && (
          <p className="empty__body">No decks match “{query}”.</p>
        )}
        {visible.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            mode={colorMode}
            due={dueByDeck[deck.id] || 0}
            onOpen={() => onStudyDeck(deck)}
            onUpdateUrl={() => setSheet({ type: 'url', deck })}
            onCustomize={() => setSheet({ type: 'cover', deck })}
            onRemove={() => setSheet({ type: 'remove', deck })}
          />
        ))}
      </section>

      {decks.length > 0 && (
        <div className="home__cta">
          <Button icon="shuffle" onClick={onShuffle}>Shuffle decks</Button>
        </div>
      )}

      <Sheet open={sheet?.type === 'add'} onClose={close} title="Add a deck">
        <DeckUrlForm
          submitLabel="Add deck"
          onSubmit={async (parsed, extra) => {
            await onAddDeck({
              title: extra.title || parsed.backLabel,
              csv_url: parsed.csvUrl,
              front_label: parsed.frontLabel,
              back_label: parsed.backLabel,
              lang: inferLang(parsed.backLabel),
              color: nextDeckColor(decks.length),
              cards: parsed.cards,
            });
            close();
          }}
          withTitle
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = deckColorVars(color);

  return (
    <form
      className="sheet__body"
      onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try {
          await onSubmit({ title: title.trim() || deck.title, color, shape, lang });
        } catch (err) {
          setError(/shape/.test(err.message)
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
            const { fill, deep } = deckColorVars(c);
            const label = c === NO_COLOR ? 'No colour' : DECK_COLOR_LABELS[c];
            return (
              <label key={c} className={`color ${c === NO_COLOR ? 'color--none' : ''}`} style={{ '--deck-fill': fill, '--deck-deep': deep }}>
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
