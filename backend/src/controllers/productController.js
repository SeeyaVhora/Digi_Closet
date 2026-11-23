const SavedProduct = require('../models/SavedProduct');

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

// POST /api/products/saved — bookmark a product from a live search result
const saveProduct = async (req, res, next) => {
  try {
    const { id, title, price, merchant, imageUrl, link } = req.body;
    if (!id || !title || !isHttpUrl(link)) {
      return res.status(400).json({ success: false, message: 'A product id, title and valid link are required.' });
    }

    const saved = await SavedProduct.findOneAndUpdate(
      { owner: req.user._id, externalId: String(id) },
      {
        title: String(title).slice(0, 200),
        price: Number.isFinite(Number(price)) ? Number(price) : null,
        merchant: String(merchant || '').slice(0, 80),
        imageUrl: isHttpUrl(imageUrl) ? imageUrl : null,
        link,
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, message: 'Product saved.', data: { saved } });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/saved
const getSavedProducts = async (req, res, next) => {
  try {
    const saved = await SavedProduct.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { saved, count: saved.length } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/saved/:id
const unsaveProduct = async (req, res, next) => {
  try {
    const saved = await SavedProduct.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!saved) {
      return res.status(404).json({ success: false, message: 'Saved product not found.' });
    }
    res.json({ success: true, message: 'Removed from saved products.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { saveProduct, getSavedProducts, unsaveProduct };
