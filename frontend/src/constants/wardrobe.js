// Mirrors backend/src/models/ClothingItem.js — keep the two in sync.
export const CATEGORIES = [
  'Tops', 'Shirts', 'T-Shirts', 'Trousers', 'Jeans', 'Skirts', 'Shorts', 'Dresses',
  'Footwear', 'Outerwear', 'Accessories',
];

export const SEASONS = ['Summer', 'Winter', 'Monsoon', 'Spring', 'Autumn', 'All Season'];

export const OCCASIONS = ['College', 'Office', 'Casual', 'Party', 'Date Night', 'Travel', 'Wedding', 'Gym'];

export const STYLES = ['Casual', 'Smart Casual', 'Formal', 'Minimal', 'Streetwear', 'Classic', 'Sporty', 'Ethnic', 'Bohemian'];

export const SLOT_BY_CATEGORY = {
  Tops: 'top', Shirts: 'top', 'T-Shirts': 'top',
  Trousers: 'bottom', Jeans: 'bottom', Skirts: 'bottom', Shorts: 'bottom',
  Dresses: 'dress',
  Outerwear: 'layer',
  Footwear: 'footwear',
  Accessories: 'accessory',
};

const SLOT_ORDER = ['layer', 'top', 'dress', 'bottom', 'footwear', 'accessory'];
export const SLOT_LABELS = {
  layer: 'Layer', top: 'Top', dress: 'Dress', bottom: 'Bottom', footwear: 'Shoes', accessory: 'Accessory',
};

export function sortBySlot(items) {
  return [...items].sort(
    (a, b) => SLOT_ORDER.indexOf(SLOT_BY_CATEGORY[a.category]) - SLOT_ORDER.indexOf(SLOT_BY_CATEGORY[b.category])
  );
}

export const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);
