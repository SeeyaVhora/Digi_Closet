const mongoose = require('mongoose');

const CATEGORIES = [
  'Tops', 'Shirts', 'T-Shirts', 'Trousers', 'Jeans', 'Skirts', 'Shorts', 'Dresses',
  'Footwear', 'Outerwear', 'Accessories',
];

const SEASONS = ['Summer', 'Winter', 'Monsoon', 'Spring', 'Autumn', 'All Season'];

// Which part of an outfit each category fills. Used by outfit validation and
// the frontend, so keep it the single source of truth.
const SLOT_BY_CATEGORY = {
  Tops: 'top', Shirts: 'top', 'T-Shirts': 'top',
  Trousers: 'bottom', Jeans: 'bottom', Skirts: 'bottom', Shorts: 'bottom',
  Dresses: 'dress',
  Outerwear: 'layer',
  Footwear: 'footwear',
  Accessories: 'accessory',
};

const clothingItemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    category: { type: String, required: true, enum: CATEGORIES },
    type: { type: String, default: null, trim: true, maxlength: 60 },
    imageUrl: { type: String, default: null },
    imagePath: { type: String, default: null },
    // colors[0] is the main colour, colors[1] the secondary one.
    colors: { type: [String], default: [] },
    pattern: { type: String, default: null },
    season: { type: [String], default: [] },
    style: { type: String, default: null },
    occasions: { type: [String], default: [] },
    size: { type: String, default: null },
    fit: { type: String, default: null },
    brand: { type: String, default: null },
    notes: { type: String, default: '', maxlength: 500 },
    // Updated when the user marks a planned day as worn (Outfit Planner).
    wearCount: { type: Number, default: 0, min: 0 },
    lastWornAt: { type: Date, default: null },
    aiSuggested: {
      category: { type: String, default: null },
      colors: { type: [String], default: [] },
      style: { type: String, default: null },
      accepted: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

clothingItemSchema.index({ owner: 1, category: 1 });
clothingItemSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('ClothingItem', clothingItemSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.SEASONS = SEASONS;
module.exports.SLOT_BY_CATEGORY = SLOT_BY_CATEGORY;
