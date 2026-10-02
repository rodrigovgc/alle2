import { Icon } from './Icon.jsx';

/** Primary CTA: full-width black pill, lime label. */
export function Button({ children, icon, variant = 'primary', className = '', ...rest }) {
  return (
    <button type="button" className={`btn btn--${variant} ${className}`} {...rest}>
      {icon && <Icon name={icon} className="btn__icon" />}
      <span>{children}</span>
    </button>
  );
}

/** Simple filled circle. No glass. */
export function IconButton({ icon, label, className = '', ...rest }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
