const mongoose = require('mongoose');

// A product bookmarked from a live search. Listings live on external sites,
// so we keep a snapshot of what the user saw plus the link back to it.
const savedProductSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    externalId: { type: String, required: true },
    title: { type: String, required: true },
    price: { type: Number, default: null },
    merchant: { type: String, default: '' },
    imageUrl: { type: String, default: null },
    link: { type: String, required: true },
  },
  { timestamps: true }
);

savedProductSchema.index({ owner: 1, externalId: 1 }, { unique: true });

module.exports = mongoose.model('SavedProduct', savedProductSchema);
