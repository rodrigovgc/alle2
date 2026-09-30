import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DeckShape } from './Icon.jsx';
import { DECK_COLORS, deckColorVars, tokenNumber } from '../styles/tokens.js';

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * A burst of tiny deck cards thrown up from behind the score, falling back
 * with a tumble. More cards for a better round. Nothing with reduced motion.
 */
export function Celebrate({ ratio = 1 }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(() => {
    // Keep every card on screen: size the throw to the space around the score
    // (the burst starts at the middle of the screen), and fade out before an edge.
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
    const pw = tokenNumber('--size-confetti-w', 40);
    const ph = tokenNumber('--size-confetti-h', 54);
    const roomX = Math.max(60, vw / 2 - pw);            // to each side
    const roomUp = Math.max(120, vh / 2 - ph - 60);      // below the status bar
    const roomDown = Math.max(120, vh / 2 - ph - 90);    // above the Done button
    const count = Math.round(14 + ratio * 22);
    return Array.from({ length: count }, (_, i) => {
      const color = DECK_COLORS[i % DECK_COLORS.length];
      const side = rand(-1, 1);
      return {
        id: i,
        color,
        x: side * roomX,
        peak: -rand(0.45, 1) * roomUp,
        fall: rand(0.2, 0.9) * roomDown,
        rotate: rand(-360, 360),
        delay: rand(0, 0.2),
        duration: rand(1.5, 2.1),
        scale: rand(0.75, 1.05),
      };
    });
  }, [ratio]);

  if (reduce) return null;

  return (
    <div className="celebrate" aria-hidden="true">
      {pieces.map((p) => {
        const { fill, deep } = deckColorVars(p.color);
        return (
          <motion.span
            key={p.id}
            className="celebrate__card"
            style={{ '--deck-fill': fill, '--deck-deep': deep }}
            initial={{ x: 0, y: 0, rotate: 0, scale: 0, opacity: 1 }}
            animate={{
              x: [0, p.x * 0.75, p.x],
              y: [0, p.peak, p.fall],
              rotate: [0, p.rotate * 0.4, p.rotate],
              scale: [0, p.scale, p.scale],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              times: [0, 0.4, 1],
              ease: ['easeOut', 'easeIn'],
              opacity: { duration: p.duration, delay: p.delay, times: [0, 0.65, 1] },
            }}
          >
            <DeckShape shape={p.color} />
          </motion.span>
        );
      })}
    </div>
  );
}
