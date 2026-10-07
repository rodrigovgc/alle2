// JS companion to tokens.css. It never repeats a colour value — it only names
// the CSS custom properties, so tokens.css stays the single source of truth.
// Motion springs live here because Framer Motion needs them as numbers.

export const DECK_COLORS = ['lime', 'purple', 'pink', 'blue', 'green', 'yellow', 'red', 'beige'];

export const DECK_COLOR_LABELS = {
  lime: 'Lime', purple: 'Purple', pink: 'Pink', blue: 'Blue',
  green: 'Green', yellow: 'Yellow', red: 'Red', beige: 'Beige',
};

export const DECK_SHAPES = [...DECK_COLORS];   // shape keys match Shape.svg cells

/** 'none' is a per-deck choice that looks like the home Monochrome mode. */
export const NO_COLOR = 'none';

/** CSS values for a deck's fill + deep colour, honouring colour mode. */
export function deckColorVars(color, mode = 'colorful') {
  // ink: text colour on the card. Pastels keep dark ink in both themes;
  // monochrome cards follow the theme.
  if (mode === 'monochrome' || color === NO_COLOR) {
    return { fill: 'var(--deck-mono)', deep: 'var(--deck-mono-deep)', ink: 'var(--color-foreground)', ink2: 'var(--grey-400)' };
  }
  const key = DECK_COLORS.includes(color) ? color : 'lime';
  return { fill: `var(--deck-${key})`, deep: `var(--deck-${key}-deep)`, ink: 'var(--ink)', ink2: 'var(--ink-2)' };
}

/** A deck's shape: its own choice, else the shape that belongs to its colour. */
export const deckShape = (deck) =>
  deck.shape || (DECK_COLORS.includes(deck.color) ? deck.color : 'beige');

/** Read a numeric token (e.g. --stack-offset: 8px → 8) for JS animation. */
export function tokenNumber(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

/** Resolve a colour token to its value, for animations that interpolate colour. */
export function tokenColor(name, fallback = 'transparent') {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const nextDeckColor = (count) => DECK_COLORS[count % DECK_COLORS.length];

/** The order new decks take their colours in. Beige is never suggested; it's
 *  only a choice in Edit deck. */
export const RAINBOW = ['yellow', 'green', 'blue', 'red', 'purple', 'lime', 'pink'];

/**
 * Colour and shape for a new deck: the next rainbow colour after the last
 * deck in the list, so the home screen keeps its rainbow. The shape is the
 * least used one, never repeating the same colour + shape pair while possible.
 */
export function pickDeckLook(decks) {
  const last = [...decks].reverse().find((d) => RAINBOW.includes(d.color));
  const color = last ? RAINBOW[(RAINBOW.indexOf(last.color) + 1) % RAINBOW.length] : RAINBOW[0];
  const shapeUse = new Map(DECK_SHAPES.map((k) => [k, 0]));
  decks.forEach((d) => { const k = deckShape(d); if (shapeUse.has(k)) shapeUse.set(k, shapeUse.get(k) + 1); });
  const taken = new Set(decks.filter((d) => d.color === color).map((d) => deckShape(d)));
  // Least used first; on a tie, the shape that "belongs" to this colour.
  const order = [...shapeUse.entries()].sort((a, b) => a[1] - b[1] || (b[0] === color) - (a[0] === color));
  const shape = (order.find(([k]) => !taken.has(k)) ?? order[0])[0];
  return { color, shape };
}

export const SPRING = {
  // Card being dealt off / on the table
  deal: { type: 'spring', stiffness: 210, damping: 30, mass: 1 },
  // Stack cards moving up a slot
  stack: { type: 'spring', stiffness: 380, damping: 36 },
  // Search pill expanding into a field
  morph: { type: 'spring', stiffness: 420, damping: 40 },
  // Menus
  pop: { type: 'spring', stiffness: 520, damping: 38 },
  // Sheets: no bounce, settles cleanly
  sheet: { type: 'spring', stiffness: 360, damping: 40, mass: 1 },
  // Turning the card over
  flip: { type: 'spring', stiffness: 260, damping: 28 },
};

export const SESSION_SIZE = 10;
export const NEW_CARDS_PER_SESSION = 10;
export const LEITNER_INTERVALS_DAYS = [1, 2, 4, 8, 16];
