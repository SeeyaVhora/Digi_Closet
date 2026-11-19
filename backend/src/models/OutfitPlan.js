const mongoose = require('mongoose');

// One planned outfit per user per calendar day. `date` is the user's local
// date as YYYY-MM-DD, so plans don't shift with time zones.
const outfitPlanSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    outfit: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedOutfit', required: true },
    occasion: { type: String, default: null, trim: true, maxlength: 40 },
    worn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

outfitPlanSchema.index({ owner: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('OutfitPlan', outfitPlanSchema);
