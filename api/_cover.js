// The 1200×630 cover used as a shared deck's link preview, drawn like the
// app's deck card: the deck's colour and shape, labels, title and card count.
import { SHAPES, LOGO } from '../src/assets/svg.js';

const FILL = { lime: '#E6F7A3', purple: '#CDC9FD', pink: '#FEBDDA', blue: '#BDDDFE', green: '#CBFEBD', yellow: '#FFF4AB', red: '#FEBDBD', beige: '#E8E5DA' };
const DEEP = { lime: '#CBE86F', purple: '#B5B1FC', pink: '#F1ADCA', blue: '#ADCFF1', green: '#AEECB6', yellow: '#EFDC8F', red: '#EFA1A1', beige: '#D9D5C7' };

const h = (type, style, ...children) => ({ type, props: { style: { display: 'flex', ...style }, children: children.flat().filter((c) => c != null && c !== false) } });

function shapeImage(shape, color) {
  const s = SHAPES[shape] || SHAPES[color] || SHAPES.lime;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox}">${s.paths.map((d) => `<path d="${d}" fill="${DEEP[color] || DEEP.lime}"/>`).join('')}</svg>`;
  return { type: 'img', props: { src: `data:image/svg+xml;base64,${btoa(svg)}`, width: 260, height: 260, style: { position: 'absolute', right: 56, bottom: 56 } } };
}

export function coverElement(deck) {
  const color = FILL[deck?.color] ? deck.color : 'lime';
  const title = deck?.title || 'A deck on Alle';
  const size = title.length > 34 ? 60 : title.length > 22 ? 72 : 88;
  const count = deck ? (deck.countLabel || `${deck.card_count} ${deck.card_count === 1 ? 'card' : 'cards'}`) : '';
  const hasLabels = Boolean(deck?.front_label && deck?.back_label);
  const arrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="rgba(12,12,12,0.55)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const arrow = { type: 'img', props: { src: `data:image/svg+xml;base64,${btoa(arrowSvg)}`, width: 30, height: 30, style: { margin: '0 14px' } } };
  // The real Alle logo (same artwork as the app), 43 → 58px tall
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO.viewBox}">${LOGO.paths.map((d) => `<path d="${d}" fill="#0C0C0C"/>`).join('')}</svg>`;
  const logo = { type: 'img', props: { src: `data:image/svg+xml;base64,${btoa(logoSvg)}`, width: 128, height: 58 } };
  return h('div', { width: 1200, height: 630, background: '#F6F4EC', flexDirection: 'column', padding: '52px 64px 64px', fontFamily: 'Inter', color: '#0C0C0C' },
    // Alle wordmark + "shared with you"
    h('div', { alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
      logo,
      h('div', { fontSize: 28, color: '#67645C' }, deck?.tagline || 'A deck shared with you')),
    // The deck card
    h('div', { position: 'relative', flex: 1, borderRadius: 52, background: FILL[color], padding: '52px 60px', flexDirection: 'column', overflow: 'hidden' },
      shapeImage(deck?.shape, color),
      hasLabels ? h('div', { fontSize: 30, color: 'rgba(12,12,12,0.55)', alignItems: 'center' }, deck.front_label, arrow, deck.back_label) : null,
      h('div', { fontSize: size, fontWeight: 700, letterSpacing: -size * 0.035, lineHeight: 1.05, marginTop: 18, maxWidth: 820 }, title),
      count ? h('div', { fontSize: 30, color: 'rgba(12,12,12,0.55)', marginTop: 'auto' }, count) : null));
}
