import { useEffect, useState } from 'react';

const KEYBOARD_THRESHOLD = 120; // px of viewport lost before we call it a keyboard

/**
 * Keeps --vvh / --vvtop in sync with the visual viewport, so a fixed layer
 * shrinks with the iOS keyboard instead of being pushed up or covered.
 * Returns whether the on-screen keyboard is open.
 */
export function useVisualViewport(active = true) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    const vv = window.visualViewport;
    root.classList.add('is-locked');

    const update = () => {
      const h = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      const keyboard = Boolean(vv) && window.innerHeight - vv.height > KEYBOARD_THRESHOLD;
      root.style.setProperty('--vvh', `${h}px`);
      root.style.setProperty('--vvtop', `${top}px`);
      // The home indicator is hidden under the keyboard, so drop the bottom inset.
      root.style.setProperty('--vv-bottom-inset', keyboard ? '0px' : 'env(safe-area-inset-bottom)');
      setKeyboardOpen(keyboard);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      root.classList.remove('is-locked');
      ['--vvh', '--vvtop', '--vv-bottom-inset'].forEach((v) => root.style.removeProperty(v));
      setKeyboardOpen(false);
    };
  }, [active]);

  return keyboardOpen;
}
