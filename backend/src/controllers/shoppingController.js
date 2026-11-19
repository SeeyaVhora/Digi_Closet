const ClothingItem = require('../models/ClothingItem');
const ShoppingList = require('../models/ShoppingList');
const productSearchService = require('../services/productSearchService');
const stylistService = require('../services/stylistService');

// POST /api/shopping/assistant/search — natural-language product finder
const assistantSearch = async (req, res, next) => {
  try {
    const query = String(req.body.query || '').trim();
    if (query.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Describe what you are looking for, e.g. "black oversized t-shirt under ₹800".',
      });
    }
    if (query.length > 300) {
      return res.status(400).json({ success: false, message: 'Please keep the request under 300 characters.' });
    }

    const filters = await stylistService.parseShoppingQuery(query);
    const search = await productSearchService.search({
      query: filters.searchQuery,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    });

    res.json({ success: true, data: { query, filters, ...search } });
  } catch (error) {
    next(error);
  }
};

// POST /api/shopping/plan — AI budget plan, saved as a shopping list
const plan = async (req, res, next) => {
  try {
    const budget = Math.round(Number(req.body.budget));
    const { goal, style, priorities } = req.body;
    const categories = Array.isArray(req.body.categories) ? req.body.categories.slice(0, 10) : [];

    if (!Number.isFinite(budget) || budget < 200 || budget > 1000000) {
      return res.status(400).json({ success: false, message: 'Enter a budget between ₹200 and ₹10,00,000.' });
    }

    const wardrobeItems = await ClothingItem.find({ owner: req.user._id });
    const result = await stylistService.planBudget({
      budget, goal, categories, style, priorities, wardrobeItems, user: req.user,
    });

    let items = result.items;
    if (productSearchService.isConfigured) {
      items = await Promise.all(items.map(async (item) => {
        try {
          const search = await productSearchService.search({ query: item.searchQuery, maxPrice: item.unitBudget, limit: 3 });
          return { ...item, products: search.products };
        } catch (err) {
          console.warn(`Product lookup failed for "${item.searchQuery}":`, err.message);
          return { ...item, products: [] };
        }
      }));
    }

    const shoppingList = await ShoppingList.create({
      owner: req.user._id,
      title: goal ? goal.slice(0, 80) : 'Shopping plan',
      budget,
      goal: goal || '',
      strategy: result.strategy,
      items,
      allocatedTotal: result.total,
      hasLiveProducts: items.some((i) => i.products?.length),
    });

    res.status(201).json({
      success: true,
      data: {
        shoppingList,
        remainingBudget: budget - result.total,
        productSearchConfigured: productSearchService.isConfigured,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/shopping/saved
const getSavedLists = async (req, res, next) => {
  try {
    const lists = await ShoppingList.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { lists, count: lists.length } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/shopping/saved/:id
const deleteList = async (req, res, next) => {
  try {
    const list = await ShoppingList.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!list) {
      return res.status(404).json({ success: false, message: 'Shopping list not found.' });
    }
    res.json({ success: true, message: 'Shopping list deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { plan, getSavedLists, deleteList, assistantSearch };
