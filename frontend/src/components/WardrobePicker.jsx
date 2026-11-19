import { Check, ImageIcon } from 'lucide-react';

export default function WardrobePicker({ items, selected, onToggle }) {
  return (
    <div className="fc-picker">
      {items.map((item) => {
        const isSelected = selected.includes(item._id);
        return (
          <button
            key={item._id}
            type="button"
            className={`fc-picker__item ${isSelected ? 'fc-picker__item--selected' : ''}`}
            onClick={() => onToggle(item._id)}
            aria-pressed={isSelected}
            title={item.name}
          >
            <span className="fc-picker__image">
              {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <ImageIcon size={20} />}
              {isSelected && <span className="fc-picker__check"><Check size={12} /></span>}
            </span>
            <span className="fc-picker__name">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}
