const mongoose = require('mongoose');

const SOURCES = ['outfit-recommendation', 'smart-recommendation', 'occasion-styling', 'fashion-critic', 'manual'];

const savedOutfitSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    clothingItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
    topwear: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem', default: null },
    bottomwear: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem', default: null },
    layer: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem', default: null },
    footwear: { type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem', default: null },
    accessories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClothingItem' }],
    occasion: { type: String, default: null },
    styleCategory: { type: String, default: null },
    explanation: { type: String, default: '' },
    styleTips: { type: [String], default: [] },
    missingItems: { type: [String], default: [] },
    previewUrl: { type: String, default: null },
    favorite: { type: Boolean, default: false },
    source: {
      type: String,
      enum: SOURCES,
      default: 'manual',
    },
  },
  { timestamps: true }
);

savedOutfitSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('SavedOutfit', savedOutfitSchema);
module.exports.SOURCES = SOURCES;
