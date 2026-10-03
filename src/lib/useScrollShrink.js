import { useEffect, useState } from 'react';

/**
 * Tracks scroll direction so a floating control can shrink when the user scrolls
 * down and grow back when they scroll up (iOS 26 nav behaviour). Returns true
 * when it should be compact. Ignores tiny moves and the rubber-band top.
 */
export function useScrollShrink(threshold = 8) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 40) setCompact(false);               // near the top: full size
        else if (y - last > threshold) setCompact(true);   // scrolling down
        else if (last - y > threshold) setCompact(false);  // scrolling up
        last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return compact;
}
