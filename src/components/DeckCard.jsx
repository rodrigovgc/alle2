import { useState } from 'react';
import { DeckShape, Icon } from './Icon.jsx';
import { Menu } from './Menu.jsx';
import { deckColorVars, deckShape } from '../styles/tokens.js';

/** Non-interactive copy of a deck card, used as the live preview in Customize cover. */
export function DeckPreview({ deck }) {
  const { fill, deep, ink, ink2 } = deckColorVars(deck.color);
  const count = deck.cards?.length ?? 0;
  return (
    <div className="deck deck--preview" style={{ '--deck-fill': fill, '--deck-deep': deep, '--deck-ink': ink, '--deck-ink-2': ink2 }} aria-hidden="true">
      <div className="deck__surface">
        <span className="deck__meta">
          {deck.front_label}<Icon name="arrow" className="deck__arrow" />{deck.back_label}
        </span>
        <span className="deck__title">{deck.title || 'Untitled deck'}</span>
        <span className="deck__count">{count} {count === 1 ? 'card' : 'cards'}</span>
        <DeckShape shape={deckShape(deck)} />
      </div>
    </div>
  );
}

export function DeckCard({ deck, mode, due, onOpen, onUpdateUrl, onCustomize, onResetProgress, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { fill, deep, ink, ink2 } = deckColorVars(deck.color, mode);
  const count = deck.cards?.length ?? 0;

  const items = [
    { label: 'Update URL', icon: 'link', onSelect: onUpdateUrl },
    { label: 'Customize cover', icon: 'palette', onSelect: onCustomize },
    { label: 'Reset progress', icon: 'reset', onSelect: onResetProgress },
    { divider: true },
    { label: 'Remove deck', icon: 'trash', danger: true, onSelect: onRemove },
  ];

  return (
    <article className={`deck ${menuOpen ? 'is-raised' : ''}`} style={{ '--deck-fill': fill, '--deck-deep': deep, '--deck-ink': ink, '--deck-ink-2': ink2 }}>
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
