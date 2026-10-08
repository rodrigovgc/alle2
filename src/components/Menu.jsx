import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from './Icon.jsx';

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
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
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
                  disabled={item.disabled}
                  title={item.disabled ? item.hint : undefined}
                  onClick={() => { if (item.disabled) return; onClose(); item.onSelect(); }}
                >
                  {hasChecks ? (
                    <span className="menu__check">{item.checked && <Icon name="check" />}</span>
                  ) : item.icon ? (
                    <span className="menu__icon"><Icon name={item.icon} /></span>
                  ) : null}
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
