import { ExternalLink, Trash2 } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { formatPrice, marketplaceSearchLinks } from '../utils/shopping';

const PRIORITY = {
  1: { label: 'Essential', variant: 'accent' },
  2: { label: 'Recommended', variant: 'default' },
  3: { label: 'Nice to have', variant: 'default' },
};

function PlanItem({ item, showLinks }) {
  const priority = PRIORITY[item.priority] || PRIORITY[2];
  return (
    <li className="bp-item">
      <div className="bp-item__row">
        <div>
          <p className="bp-item__name">
            {item.quantity > 1 && <span className="bp-item__qty">{item.quantity} × </span>}
            {item.name}
          </p>
          <p className="bp-item__reason">{item.reason}</p>
        </div>
        <div className="bp-item__amount">
          <span>{formatPrice(item.quantity * item.unitBudget)}</span>
          {item.quantity > 1 && <small>{formatPrice(item.unitBudget)} each</small>}
          <Badge size="sm" variant={priority.variant}>{priority.label}</Badge>
        </div>
      </div>

      {item.products?.length > 0 ? (
        <div className="bp-item__products">
          {item.products.map((p) => (
            <a key={p.link} href={p.link} target="_blank" rel="noopener noreferrer" className="bp-product">
              {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" />}
              <span className="bp-product__title">{p.title}</span>
              <span className="bp-product__meta">{formatPrice(p.price)} · {p.merchant}</span>
            </a>
          ))}
        </div>
      ) : showLinks && item.searchQuery && (
        <div className="bp-item__links">
          {marketplaceSearchLinks(item.searchQuery).map((link) => (
            <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer">
              Search {link.platform} <ExternalLink size={11} />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}

export default function ShoppingPlanCard({ list, onDelete, compact = false }) {
  const used = Math.min(100, Math.round((list.allocatedTotal / list.budget) * 100));

  return (
    <Card className="bp-plan">
      <header className="bp-plan__header">
        <div>
          <h3 className="bp-plan__title">{list.title}</h3>
          <p className="bp-plan__date">{new Date(list.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={() => onDelete(list)} aria-label="Delete plan">
            <Trash2 size={15} />
          </Button>
        )}
      </header>

      <div className="bp-budget">
        <div className="bp-budget__numbers">
          <span><strong>{formatPrice(list.allocatedTotal)}</strong> of {formatPrice(list.budget)}</span>
          <span>{formatPrice(list.budget - list.allocatedTotal)} left</span>
        </div>
        <div className="bp-budget__track"><div className="bp-budget__fill" style={{ width: `${used}%` }} /></div>
      </div>

      {!list.hasLiveProducts && (
        <p className="bp-estimate-note">Estimated budget allocation, not live product prices.</p>
      )}

      {!compact && list.strategy && <p className="bp-plan__strategy">{list.strategy}</p>}

      <ul className="bp-items">
        {list.items.map((item, i) => <PlanItem key={`${item.name}-${i}`} item={item} showLinks={!compact} />)}
      </ul>
    </Card>
  );
}
