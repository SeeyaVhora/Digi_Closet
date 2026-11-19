import { ImageIcon, Pencil, Trash2 } from 'lucide-react';
import Card from './Card';
import { ColorSwatch } from './ColorSwatch';

export default function ClothingCard({ item, onClick, onEdit, onDelete }) {
  const details = [item.type || item.category, item.brand].filter(Boolean).join(' · ');

  return (
    <Card padding={false} hover className="clothing-card" onClick={() => onClick?.(item)}>
      <div className="clothing-card__image-wrap">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="clothing-card__image" loading="lazy" />
        ) : (
          <ImageIcon className="clothing-card__placeholder" size={32} />
        )}
      </div>
      <div className="clothing-card__body">
        <p className="clothing-card__name" title={item.name}>{item.name}</p>
        <div className="clothing-card__meta">
          <span className="clothing-card__details">{details}</span>
          <span className="clothing-card__colors">
            {item.colors?.slice(0, 2).map((color) => <ColorSwatch key={color} color={color} showLabel={false} />)}
          </span>
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className="clothing-card__actions">
          {onEdit && (
            <button className="clothing-card__action-btn" onClick={(e) => { e.stopPropagation(); onEdit(item); }} aria-label={`Edit ${item.name}`}>
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button className="clothing-card__action-btn clothing-card__action-btn--danger" onClick={(e) => { e.stopPropagation(); onDelete(item); }} aria-label={`Delete ${item.name}`}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
