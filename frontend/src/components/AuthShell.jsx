import Wordmark from './Wordmark';

/**
 * Split layout for sign in / register: an editorial photo panel beside the
 * form. The photo panel is hidden on small screens.
 */
export default function AuthShell({ image, quote, eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      <aside className="auth-shell__visual">
        <img src={image} alt="" />
        <div className="auth-shell__visual-text">
          <Wordmark tone="light" />
          <p className="auth-shell__quote">{quote}</p>
        </div>
      </aside>
      <main className="auth-shell__main">
        <Wordmark className="auth-shell__mobile-mark" />
        <div className="auth-shell__panel">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="auth-shell__title">{title}</h1>
          {subtitle && <p className="auth-shell__subtitle">{subtitle}</p>}
          {children}
          {footer && <p className="auth-shell__footer">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

/** Email / phone switch shown above the sign-in form. */
export function AuthMethodTabs({ method, onChange }) {
  return (
    <div className="auth-tabs" role="tablist" aria-label="Sign-in method">
      {[['email', 'Email'], ['phone', 'Phone number']].map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={method === value}
          className={`auth-tabs__tab ${method === value ? 'auth-tabs__tab--active' : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
