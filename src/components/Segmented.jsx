/** Segmented control in the Tab style: light beige track, white active segment. */
export function Segmented({ options, value, onChange, labelledBy }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="tabs tabs--light" role="radiogroup" aria-labelledby={labelledBy} style={{ '--count': options.length }}>
      <span className="tabs__thumb" style={{ '--i': index }} aria-hidden="true" />
      {options.map((o) => (
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

