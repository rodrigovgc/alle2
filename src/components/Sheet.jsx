import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconButton } from './Button.jsx';
import { SPRING } from '../styles/tokens.js';
import { useVisualViewport } from '../lib/useViewport.js';

/** Bottom sheet for forms (add deck, update URL, customise, confirm). */
export function Sheet({ open, onClose, title, children }) {
  // Pin the layer to the visible area so the keyboard never covers the form.
  useVisualViewport(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="sheet-scrim" onClick={onClose} />
          <motion.section
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING.deal}
          >
            <header className="sheet__header">
              <h2 className="sheet__title">{title}</h2>
              <IconButton icon="close" label="Close" onClick={onClose} className="icon-btn--inner" />
            </header>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
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
