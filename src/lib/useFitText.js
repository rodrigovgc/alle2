import { useLayoutEffect, useState } from 'react';

const MAX_LEVEL = 5;

/**
 * Steps text down through the --font-size-fit-* tokens until the element's
 * content fits without scrolling. Re-runs when deps change or the box resizes
 * (e.g. the iOS keyboard opens and the card shrinks).
 */
export function useFitText(ref, deps) {
  const [level, setLevel] = useState(0);
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => { setLevel(0); }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight + 1 && level < MAX_LEVEL) setLevel((l) => l + 1);
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let last = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientHeight - last) > 2) { last = el.clientHeight; setTick((t) => t + 1); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return level;
}
