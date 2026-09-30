import { useEffect } from 'react';

/**
 * When a field inside the scroll area `ref` gets focus, or the keyboard
 * finishes opening, scroll that area (and only that area) so the field sits
 * in the visible part above the keyboard. Never scrolls the page itself,
 * which is what made screens jump on iOS.
 */
export function useFocusIntoView(ref, active = true) {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return undefined;
    let timer;
    const reveal = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const el = document.activeElement;
        if (!el || !root.contains(el) || !el.matches('input, textarea, select')) return;
        const vv = window.visualViewport;
        const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
        const box = root.getBoundingClientRect();
        const top = box.top;
        const bottom = Math.min(box.bottom, visibleBottom);
        const r = el.getBoundingClientRect();
        const margin = 24;
        if (r.top >= top + margin && r.bottom <= bottom - margin) return; // already visible
        const target = root.scrollTop + (r.top - top) - Math.max(margin, (bottom - top - r.height) / 3);
        root.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      }, 300); // after the keyboard animation
    };
    root.addEventListener('focusin', reveal);
    window.visualViewport?.addEventListener('resize', reveal);
    return () => {
      clearTimeout(timer);
      root.removeEventListener('focusin', reveal);
      window.visualViewport?.removeEventListener('resize', reveal);
    };
  }, [ref, active]);
}
