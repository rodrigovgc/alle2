import { useState } from 'react';
import { DeckShape, Icon } from './Icon.jsx';
import { Menu } from './Menu.jsx';
import { deckColorVars } from '../styles/tokens.js';

export function DeckCard({ deck, mode, due, onOpen, onUpdateUrl, onCustomize, onRemove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { fill, deep } = deckColorVars(deck.color, mode);
  const count = deck.cards?.length ?? 0;

  const items = [
    { label: 'Update URL', onSelect: onUpdateUrl },
    { label: 'Customize cover', onSelect: onCustomize },
    { divider: true },
    { label: 'Remove deck', danger: true, onSelect: onRemove },
  ];

  return (
    <article className={`deck ${menuOpen ? 'is-raised' : ''}`} style={{ '--deck-fill': fill, '--deck-deep': deep }}>
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
        <DeckShape shape={deck.color} />
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
