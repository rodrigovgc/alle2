const OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'learning', label: 'Learning' },
  { value: 'hard', label: 'Hard' },
];

export const RATING_VALUES = OPTIONS.map((o) => o.value);

/** Rating tab control (Tab spec). Picks a rating; Next commits it. */
export function RatingTabs({ value, onChange }) {
  const index = OPTIONS.findIndex((o) => o.value === value);
  return (
    <div className="tabs" role="radiogroup" aria-label="How did that feel?">
      <span className="tabs__thumb" style={{ '--i': index }} aria-hidden="true" />
      {OPTIONS.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          aria-keyshortcuts={String(i + 1)}
          className={`tabs__item ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
