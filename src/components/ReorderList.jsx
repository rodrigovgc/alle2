import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { DeckShape, Icon } from './Icon.jsx';
import { deckColorVars, deckShape } from '../styles/tokens.js';

/**
 * Reorder mode: compact deck rows dragged by their handle. Only the handle
 * starts a drag, so the list still scrolls normally on a phone.
 */
export function ReorderList({ decks, mode, onChange }) {
  return (
    <Reorder.Group as="div" axis="y" values={decks} onReorder={onChange} className="reorder-list">
      {decks.map((deck) => <Row key={deck.id} deck={deck} mode={mode} />)}
    </Reorder.Group>
  );
}

function Row({ deck, mode }) {
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const { fill, deep, ink, ink2 } = deckColorVars(deck.color, mode);
  return (
    <Reorder.Item
      as="div"
      value={deck}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className={`reorder-row ${dragging ? 'is-dragging' : ''}`}
      style={{ '--deck-fill': fill, '--deck-deep': deep, '--deck-ink': ink, '--deck-ink-2': ink2 }}
      whileDrag={{ scale: 1.02 }}
    >
      <span className="reorder-row__shape"><DeckShape shape={deckShape(deck)} /></span>
      <span className="reorder-row__title">{deck.title}</span>
      <button
        type="button"
        className="reorder-row__handle"
        aria-label={`Drag to move ${deck.title}`}
        onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
      >
        <Icon name="grip" />
      </button>
    </Reorder.Item>
  );
}
