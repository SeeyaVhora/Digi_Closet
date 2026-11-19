const mongoose = require('mongoose');

const matchedProductSchema = new mongoose.Schema(
  {
    title: String,
    price: Number,
    merchant: String,
    imageUrl: String,
    link: String,
  },
  { _id: false }
);

const shoppingListItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    unitBudget: { type: Number, required: true },
    priority: { type: Number, default: 2 },
    reason: { type: String, default: '' },
    searchQuery: { type: String, default: '' },
    // Real listings found within unitBudget, when a product provider is configured.
    products: { type: [matchedProductSchema], default: [] },
  },
  { _id: false }
);

const shoppingListSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'My Shopping List' },
    budget: { type: Number, required: true },
    goal: { type: String, default: '' },
    strategy: { type: String, default: '' },
    items: { type: [shoppingListItemSchema], default: [] },
    allocatedTotal: { type: Number, default: 0 },
    // false = the amounts are AI budget estimates, not real product prices.
    hasLiveProducts: { type: Boolean, default: false },
  },
  { timestamps: true }
);

shoppingListSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
