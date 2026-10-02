import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Button } from '../components/Button.jsx';
import { Celebrate } from '../components/Celebrate.jsx';

function message(correct, total) {
  if (!total) return 'Nothing to review.';
  const r = correct / total;
  if (r === 1) return 'Every card, first try.';
  if (r >= 0.8) return 'Strong round. The few you missed come back tomorrow.';
  if (r >= 0.5) return 'Good progress. Misses return sooner, so they’ll stick.';
  return 'A tough set. These cards will be back tomorrow for another go.';
}

/** Counts up to the score so the number lands with the burst. */
function useCountUp(target, skip) {
  const [n, setN] = useState(skip ? target : 0);
  useEffect(() => {
    if (skip || !target) { setN(target); return undefined; }
    let raf;
    const start = performance.now();
    const dur = 700;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, skip]);
  return n;
}

export function Done({ correct, total, onDone }) {
  const reduce = useReducedMotion();
  const shown = useCountUp(correct, reduce);
  const ratio = total ? correct / total : 0;

  return (
    <main className="done">
      <div className="done__center">
        {correct > 0 && <Celebrate ratio={ratio} />}
        <p className="done__score" aria-label={`${correct} out of ${total} correct`}>
          {shown}<span className="done__total">/{total}</span>
        </p>
        <p className="done__message">{message(correct, total)}</p>
      </div>
      <div className="done__footer">
        <Button onClick={onDone}>Done</Button>
      </div>
    </main>
  );
}
