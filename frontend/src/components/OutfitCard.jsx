import { Heart, ImageIcon, Check, Bookmark, Trash2 } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { SLOT_BY_CATEGORY, SLOT_LABELS, sortBySlot } from '../constants/wardrobe';

function OutfitPiece({ item }) {
  return (
    <figure className="outfit-piece">
      <div className="outfit-piece__image">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} loading="lazy" /> : <ImageIcon size={22} />}
      </div>
      <figcaption>
        <span className="outfit-piece__slot">{SLOT_LABELS[SLOT_BY_CATEGORY[item.category]]}</span>
        <span className="outfit-piece__name" title={item.name}>{item.name}</span>
      </figcaption>
    </figure>
  );
}

/**
 * `items` are full wardrobe items (with imageUrl). Saved outfits pass their
 * populated clothingItems; freshly generated ones resolve ids on the page.
 */
export default function OutfitCard({
  outfit, items, onSave, saved = false, saving = false, onFavoriteToggle, onDelete,
}) {
  const pieces = sortBySlot(items || outfit.clothingItems || []);
  const meta = [outfit.styleCategory, outfit.occasion].filter(Boolean);

  return (
    <Card className="outfit-card">
      <header className="outfit-card__header">
        <div>
          <h3 className="outfit-card__title">{outfit.title}</h3>
          {meta.length > 0 && <p className="outfit-card__meta">{meta.join(' · ')}</p>}
        </div>
        {onFavoriteToggle && (
          <button
            className={`outfit-card__favorite ${outfit.favorite ? 'outfit-card__favorite--active' : ''}`}
            onClick={() => onFavoriteToggle(outfit)}
            aria-label={outfit.favorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart size={18} fill={outfit.favorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </header>

      <div className="outfit-card__pieces">
        {pieces.map((item) => <OutfitPiece key={item._id} item={item} />)}
      </div>

      {outfit.explanation && <p className="outfit-card__explanation">{outfit.explanation}</p>}

      {outfit.styleTips?.length > 0 && (
        <ul className="outfit-card__tips">
          {outfit.styleTips.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
      )}

      {outfit.missingItems?.length > 0 && (
        <p className="outfit-card__missing">No {outfit.missingItems.join(', ').toLowerCase()} in your wardrobe for this look.</p>
      )}

      {(onSave || onDelete) && (
        <footer className="outfit-card__footer">
          {onSave && (
            <Button size="sm" variant={saved ? 'secondary' : 'primary'} disabled={saved} loading={saving} onClick={() => onSave(outfit)}>
              {saved ? <><Check size={14} /> Saved</> : <><Bookmark size={14} /> Save outfit</>}
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" onClick={() => onDelete(outfit)}>
              <Trash2 size={14} /> Remove
            </Button>
          )}
        </footer>
      )}
    </Card>
  );
}
