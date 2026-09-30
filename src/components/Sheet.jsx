import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { IconButton } from './Button.jsx';
import { SPRING } from '../styles/tokens.js';
import { useVisualViewport } from '../lib/useViewport.js';
import { useFocusIntoView } from '../lib/useFocusIntoView.js';

/**
 * Full-screen panel for forms (add deck, update URL, customise, confirm).
 * Opaque, so nothing shows behind it or around the keyboard. The header stays
 * put; only the body scrolls, and it always ends at the top of the keyboard.
 */
export function Sheet({ open, onClose, title, children }) {
  const reduce = useReducedMotion();
  useVisualViewport(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-layer"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={reduce ? { opacity: 0 } : { y: '100%' }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: '100%' }}
          transition={SPRING.deal}
        >
          <SheetFrame title={title} onClose={onClose}>{children}</SheetFrame>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetFrame({ title, onClose, children }) {
  const scrollRef = useRef(null);
  useFocusIntoView(scrollRef);
  return (
    <section className="sheet">
      <header className="sheet__header">
        <h2 className="sheet__title">{title}</h2>
        <IconButton icon="close" label="Close" onClick={onClose} className="icon-btn--inner" />
      </header>
      <div className="sheet__scroll" ref={scrollRef}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

/** Buttons at the end of a sheet form. They stick above the keyboard. */
export function SheetActions({ children }) {
  return <div className="sheet__actions">{children}</div>;
}
