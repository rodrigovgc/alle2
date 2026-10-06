import { useEffect, useRef, useState } from 'react';

const TRIGGER = 64;   // px of pull needed to refresh
const MAX = 96;       // pull stops growing here

/** Running as a home-screen app (no browser pull-to-refresh there). */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/**
 * Pull down at the very top to refresh, like a native app. Only active when
 * Alle runs from the home screen; in a normal browser tab the browser's own
 * pull-to-refresh already does this. Returns { pull, refreshing }.
 */
export function usePullToRefresh(onRefresh, enabled = true) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!enabled || !isStandalone()) return undefined;
    const onStart = (e) => {
      if (window.scrollY > 0 || refreshing || document.documentElement.classList.contains('is-locked')) return;
      start.current = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) { pullRef.current = 0; setPull(0); return; }
      const p = Math.min(MAX, dy * 0.5); // resistance, like iOS
      pullRef.current = p; setPull(p);
    };
    const onEnd = async () => {
      if (start.current == null) return;
      start.current = null;
      if (pullRef.current >= TRIGGER) {
        setRefreshing(true); setPull(TRIGGER);
        try { await onRefresh(); } finally {
          setRefreshing(false); setPull(0); pullRef.current = 0;
        }
      } else { setPull(0); pullRef.current = 0; }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, onRefresh, refreshing]);

  return { pull, refreshing, progress: Math.min(1, pull / TRIGGER) };
}
