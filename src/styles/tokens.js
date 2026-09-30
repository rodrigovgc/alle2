// JS companion to tokens.css. It never repeats a colour value — it only names
// the CSS custom properties, so tokens.css stays the single source of truth.
// Motion springs live here because Framer Motion needs them as numbers.

export const DECK_COLORS = ['lime', 'purple', 'pink', 'blue', 'green', 'yellow', 'red', 'beige'];

export const DECK_COLOR_LABELS = {
  lime: 'Lime', purple: 'Purple', pink: 'Pink', blue: 'Blue',
  green: 'Green', yellow: 'Yellow', red: 'Red', beige: 'Beige',
};

/** CSS values for a deck's fill + deep colour, honouring colour mode. */
export function deckColorVars(color, mode = 'colorful') {
  if (mode === 'monochrome') {
    return { fill: 'var(--deck-mono)', deep: 'var(--deck-mono-deep)' };
  }
  const key = DECK_COLORS.includes(color) ? color : 'lime';
  return { fill: `var(--deck-${key})`, deep: `var(--deck-${key}-deep)` };
}

export const nextDeckColor = (count) => DECK_COLORS[count % DECK_COLORS.length];

export const SPRING = {
  // Card being dealt off / on the table
  deal: { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 },
  // Stack cards moving up a slot
  stack: { type: 'spring', stiffness: 380, damping: 36 },
  // Menus and sheets
  pop: { type: 'spring', stiffness: 520, damping: 38 },
};

export const SESSION_SIZE = 20;
export const NEW_CARDS_PER_SESSION = 6;
export const LEITNER_INTERVALS_DAYS = [1, 2, 4, 8, 16];
