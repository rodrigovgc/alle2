import { Button } from '../components/Button.jsx';

function message(correct, total) {
  if (!total) return 'Nothing to review.';
  const r = correct / total;
  if (r === 1) return 'Every card, first try.';
  if (r >= 0.8) return 'Strong round. The few you missed come back tomorrow.';
  if (r >= 0.5) return 'Good progress. Misses return sooner, so they’ll stick.';
  return 'A tough set. These cards will be back tomorrow for another go.';
}

export function Done({ correct, total, onDone }) {
  return (
    <main className="done">
      <div className="done__center">
        <p className="done__score" aria-label={`${correct} out of ${total} correct`}>
          {correct}<span className="done__total">/{total}</span>
        </p>
        <p className="done__message">{message(correct, total)}</p>
      </div>
      <div className="done__footer">
        <Button onClick={onDone}>Done</Button>
      </div>
    </main>
  );
}
