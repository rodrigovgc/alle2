import { Icon } from './Icon.jsx';

/**
 * A text field exactly as wide as its text, with a pencil right after the
 * last letter. It takes its font from where it's placed (a title, a cell…).
 * Clicking the pencil focuses the field.
 */
export function AutoInput({ value, onChange, className = '', label, placeholder = '', pencil = true, onKeyDown, ...rest }) {
  return (
    <label className={`autoinput ${className}`}>
      <span className="autoinput__field">
        <span className="autoinput__sizer" aria-hidden="true">{value || placeholder || ' '}</span>
        <input
          size={1}
          className="autoinput__input"
          value={value}
          placeholder={placeholder}
          aria-label={label}
          onChange={onChange}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } onKeyDown?.(e); }}
          {...rest}
        />
      </span>
      {pencil && <Icon name="edit" className="autoinput__pencil" />}
    </label>
  );
}
