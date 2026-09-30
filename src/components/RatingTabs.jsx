const OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'learning', label: 'Learning' },
  { value: 'hard', label: 'Hard' },
];

export function RatingTabs({ value, onChange }) {
  const index = OPTIONS.findIndex((o) => o.value === value);
  return (
    <div className="tabs" role="radiogroup" aria-label="How did that feel?">
      <span className="tabs__thumb" style={{ '--i': index }} aria-hidden="true" />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`tabs__item ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
