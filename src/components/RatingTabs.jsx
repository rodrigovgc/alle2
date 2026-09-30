import { useState } from 'react';

const OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'learning', label: 'Learning' },
  { value: 'hard', label: 'Hard' },
];

/**
 * Rating control from the Tab spec. Tapping a segment rates the card and
 * moves on in one step. The highlighted segment is the suggestion based on
 * the answer; the highlight slides to whatever was tapped before advancing.
 */
export function RatingActions({ suggested, onRate, disabled }) {
  const [picked, setPicked] = useState(null);
  const active = picked ?? suggested;
  const index = OPTIONS.findIndex((o) => o.value === active);

  function pick(value) {
    if (picked || disabled) return;
    setPicked(value);
    setTimeout(() => onRate(value), 140); // let the highlight land first
  }

  return (
    <div className="tabs" role="group" aria-label="How did that feel? Pick one to continue">
      <span className="tabs__thumb" style={{ '--i': index }} aria-hidden="true" />
      {OPTIONS.map((o, i) => (
        <button
          key={o.value}
          type="button"
          className={`tabs__item ${active === o.value ? 'is-active' : ''}`}
          aria-keyshortcuts={String(i + 1)}
          onClick={() => pick(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const RATING_VALUES = OPTIONS.map((o) => o.value);
