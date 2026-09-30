import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon.jsx';
import { SPRING } from '../styles/tokens.js';

/**
 * Popover menu. items: [{ label, onSelect, checked?, danger?, divider? }]
 * Positioned by the parent via className/style; closes on outside tap or Escape.
 */
export function Menu({ open, onClose, items, className = '', style, tint }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const hasChecks = items.some((i) => i.checked !== undefined);

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="menu-scrim" onClick={onClose} />
          <motion.div
            role="menu"
            className={`menu ${className}`}
            style={{ ...style, ...(tint ? { '--menu-tint': tint } : null) }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={SPRING.pop}
          >
            {items.map((item, i) =>
              item.divider ? (
                <hr key={i} className="menu__divider" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role={hasChecks ? 'menuitemradio' : 'menuitem'}
                  aria-checked={hasChecks ? !!item.checked : undefined}
                  className={`menu__item ${item.danger ? 'menu__item--danger' : ''}`}
                  onClick={() => { onClose(); item.onSelect(); }}
                >
                  {hasChecks && (
                    <span className="menu__check">{item.checked && <Icon name="check" />}</span>
                  )}
                  {item.label}
                </button>
              ),
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
