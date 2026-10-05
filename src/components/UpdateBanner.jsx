import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNewVersion } from '../lib/useNewVersion.js';
import { Icon } from './Icon.jsx';

/** "A new version of Alle is ready" with a Refresh button. Dismissible. */
export function UpdateBanner() {
  const available = useNewVersion();
  const [dismissed, setDismissed] = useState(false);
  const reduce = useReducedMotion();
  const show = available && !dismissed;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="update-banner"
          role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <span className="update-banner__text">New version available</span>
          <button type="button" className="update-banner__refresh" onClick={() => window.location.reload()}>Refresh</button>
          <button type="button" className="update-banner__close" aria-label="Not now" onClick={() => setDismissed(true)}>
            <Icon name="close" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
