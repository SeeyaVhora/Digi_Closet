/**
 * Editorial page heading: eyebrow label, large serif title, optional action.
 * With an image, `variant` sets the composition so pages don't all share one
 * template: "split" (photo right), "reverse" (photo left), "overlay" (title
 * over a full-width photo) or "stacked" (oversized title above a photo strip).
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  image,
  variant = 'split',
  className = '',
}) {
  return (
    <header className={`page-header ${image ? `page-header--banner page-header--${variant}` : ''} ${className}`}>
      <div className="page-header__text">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        {action && image && <div className="page-header__action">{action}</div>}
      </div>
      {action && !image && <div className="page-header__action">{action}</div>}
      {image && (
        <div className="page-header__image img-zoom">
          <img src={image} alt="" />
        </div>
      )}
    </header>
  );
}
