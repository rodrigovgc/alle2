import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Desktop: drag a deck card straight to a new place in the grid. A drag only
 * starts after the pointer moves 6px, so a plain click still opens the deck.
 */
export function SortableDecks({ decks, onReorder, renderDeck }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const from = decks.findIndex((d) => d.id === active.id);
    const to = decks.findIndex((d) => d.id === over.id);
    onReorder(arrayMove(decks, from, to));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={decks.map((d) => d.id)} strategy={rectSortingStrategy}>
        {decks.map((deck) => <SortableItem key={deck.id} id={deck.id}>{renderDeck(deck)}</SortableItem>)}
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`sortable-deck ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
