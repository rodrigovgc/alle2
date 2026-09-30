import { useEffect } from 'react';

/**
 * Keeps --vvh / --vvtop in sync with the visual viewport, so a fixed screen
 * shrinks with the iOS keyboard instead of being pushed up or scrolled.
 */
export function useVisualViewport(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const root = document.documentElement;
    const vv = window.visualViewport;
    root.classList.add('is-locked');

    const update = () => {
      const h = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      root.style.setProperty('--vvh', `${h}px`);
      root.style.setProperty('--vvtop', `${top}px`);
      // Keyboard open: the home indicator is hidden, so drop the bottom inset.
      const keyboard = vv && window.innerHeight - vv.height > 120;
      root.style.setProperty('--vv-bottom-inset', keyboard ? '0px' : 'env(safe-area-inset-bottom)');
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
      root.style.removeProperty('--vvh');
      root.style.removeProperty('--vvtop');
      root.style.removeProperty('--vv-bottom-inset');
    };
  }, [active]);
}
