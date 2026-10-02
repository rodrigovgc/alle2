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

/**
 * A colour and a shape for a new deck that no existing deck uses. Keeps the
 * preferred one (e.g. a sample deck's own colour) when it's still free. Once
 * all 8 are taken, picks the least used, and never repeats an exact
 * colour + shape pair while one of the 64 is left.
 */
export function pickDeckLook(decks, preferred = {}) {
  const count = (key) => (list) => list.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map(key.map((k) => [k, 0])));
  const colorUse = count(DECK_COLORS)(decks.map((d) => d.color).filter((c) => DECK_COLORS.includes(c)));
  const shapeUse = count(DECK_SHAPES)(decks.map((d) => deckShape(d)));
  const leastUsed = (use, prefer) => {
    const min = Math.min(...use.values());
    if (prefer && use.get(prefer) === min) return prefer;
    return [...use.keys()].find((k) => use.get(k) === min);
  };
  const color = leastUsed(colorUse, preferred.color);
  // Shape: least used, and not already paired with this colour.
  const taken = new Set(decks.filter((d) => d.color === color).map((d) => deckShape(d)));
  const shapeOrder = [...shapeUse.entries()]
    .sort((a, b) => a[1] - b[1] || (b[0] === (preferred.shape ?? color)) - (a[0] === (preferred.shape ?? color)));
  const shape = (shapeOrder.find(([k]) => !taken.has(k)) ?? shapeOrder[0])[0];
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

export const SESSION_SIZE = 20;
export const NEW_CARDS_PER_SESSION = 6;
export const LEITNER_INTERVALS_DAYS = [1, 2, 4, 8, 16];
