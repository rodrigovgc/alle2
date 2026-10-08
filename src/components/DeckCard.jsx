import { useEffect, useRef, useState } from 'react';
import { DeckShape, Icon } from './Icon.jsx';
import { Menu } from './Menu.jsx';
import { deckColorVars, deckShape } from '../styles/tokens.js';

/** Non-interactive copy of a deck card, used as the live preview in Edit deck. */
export function DeckPreview({ deck, titleSlot = null }) {
  const { fill, deep, ink, ink2 } = deckColorVars(deck.color);
  const count = deck.cards?.length ?? 0;
  return (
    <div className={`deck deck--preview ${titleSlot ? 'is-editable' : ''}`} style={{ '--deck-fill': fill, '--deck-deep': deep, '--deck-ink': ink, '--deck-ink-2': ink2 }} aria-hidden={titleSlot ? undefined : 'true'}>
      <div className="deck__surface">
        <span className="deck__meta">
          {deck.front_label}<Icon name="arrow" className="deck__arrow" />{deck.back_label}
        </span>
        {titleSlot || <span className="deck__title">{deck.title || 'Untitled deck'}</span>}
        <span className="deck__count">{count} {count === 1 ? 'card' : 'cards'}</span>
        <DeckShape shape={deckShape(deck)} />
      </div>
    </div>
  );
}

export function DeckCard({ deck, mode, due, onOpen, onUpdateUrl, onCustomize, onShare, onMoveToGroup, onResetProgress, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { fill, deep, ink, ink2 } = deckColorVars(deck.color, mode);
  // Bounce when the colour changes (e.g. Rainbow colours), not on first show.
  const [repaint, setRepaint] = useState(false);
  const firstColor = useRef(deck.color);
  useEffect(() => {
    if (deck.color === firstColor.current) return undefined;
    firstColor.current = deck.color;
    setRepaint(true);
    const t = setTimeout(() => setRepaint(false), 600);
    return () => clearTimeout(t);
  }, [deck.color]);
  const count = deck.cards?.length ?? 0;

  // Update URL only for decks imported from the person's own Google Sheet
  const ownSheet = Boolean(deck.csv_url) && !deck.is_sample;
  const items = [
    ...(ownSheet ? [{ label: 'Update URL', icon: 'link', onSelect: onUpdateUrl }] : []),
    { label: 'Edit deck', icon: 'edit', onSelect: onCustomize },
    { label: 'Share deck', icon: 'share', onSelect: onShare },
    ...(onMoveToGroup ? [{ label: 'Move to group', icon: 'folder', onSelect: onMoveToGroup }] : []),
    { label: 'Reset progress', icon: 'reset', onSelect: onResetProgress },
    { divider: true },
    { label: 'Remove deck', icon: 'trash', danger: true, onSelect: onRemove },
  ];

  return (
    <article className={`deck ${menuOpen ? 'is-raised' : ''} ${repaint ? 'is-repainted' : ''}`} style={{ '--deck-fill': fill, '--deck-deep': deep, '--deck-ink': ink, '--deck-ink-2': ink2 }}>
      <button type="button" className="deck__surface" onClick={onOpen} aria-label={`Study ${deck.title}`}>
        <span className="deck__meta">
          {deck.front_label}
          <Icon name="arrow" className="deck__arrow" />
          {deck.back_label}
        </span>
        <span className="deck__title">{deck.title}</span>
        <span className="deck__count">
          {count} {count === 1 ? 'card' : 'cards'}
          {due > 0 && <span className="deck__due"> · {due} due</span>}
        </span>
        <DeckShape shape={deckShape(deck)} />
      </button>
      <button
        type="button"
        className="deck__more"
        aria-label={`Options for ${deck.title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <Icon name="more" />
      </button>
      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={items}
        className="menu--deck"
        tint={fill}
      />
    </article>
  );
}
