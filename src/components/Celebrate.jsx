import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DeckShape } from './Icon.jsx';
import { DECK_COLORS, deckColorVars } from '../styles/tokens.js';

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * A burst of tiny deck cards thrown up from behind the score, falling back
 * with a tumble. More cards for a better round. Nothing with reduced motion.
 */
export function Celebrate({ ratio = 1 }) {
  const reduce = useReducedMotion();
  const pieces = useMemo(() => {
    const count = Math.round(14 + ratio * 26);
    return Array.from({ length: count }, (_, i) => {
      const color = DECK_COLORS[i % DECK_COLORS.length];
      const angle = rand(-1.25, 1.25);            // mostly upward fan
      const power = rand(180, 360);
      return {
        id: i,
        color,
        x: Math.sin(angle) * power * 1.3,
        peak: -Math.cos(angle) * power - rand(40, 120),
        fall: rand(420, 700),
        rotate: rand(-540, 540),
        delay: rand(0, 0.25),
        duration: rand(1.6, 2.4),
        scale: rand(0.7, 1.15),
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
              x: [0, p.x * 0.7, p.x],
              y: [0, p.peak, p.fall],
              rotate: [0, p.rotate * 0.4, p.rotate],
              scale: [0, p.scale, p.scale],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              times: [0, 0.35, 1],
              ease: ['easeOut', 'easeIn'],
            }}
          >
            <DeckShape shape={p.color} />
          </motion.span>
        );
      })}
    </div>
  );
}
