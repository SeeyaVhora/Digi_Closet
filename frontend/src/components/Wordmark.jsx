import { Link } from 'react-router-dom';

/** The DIGICLOSET wordmark. `tone="light"` for use on dark or photo backgrounds. */
export default function Wordmark({ to = '/', tone = 'dark', className = '' }) {
  return (
    <Link to={to} className={`wordmark wordmark--${tone} ${className}`} aria-label="DigiCloset home">
      DIGI<span>CLOSET</span>
    </Link>
  );
}
