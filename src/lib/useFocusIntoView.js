import { useEffect } from 'react';

/**
 * When a field inside `ref` gets focus, or the keyboard finishes opening,
 * scroll that field to the middle of its scroll area so the keyboard never
 * covers it.
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
        if (el && root.contains(el) && el.matches('input, textarea, select')) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 320); // after the keyboard animation
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
