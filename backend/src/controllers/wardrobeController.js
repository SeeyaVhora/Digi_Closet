const ClothingItem = require('../models/ClothingItem');
const imageService = require('../services/imageService');
const stylistService = require('../services/stylistService');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only accept storage paths inside the caller's own folder, so a crafted
// imagePath/imageUrl can never point a later delete at someone else's file.
function ownedImagePath(uid, imagePath, imageUrl) {
  const candidate = imagePath || (imageUrl?.startsWith('/uploads/') ? imageUrl.slice('/uploads/'.length) : null);
  if (!candidate || candidate.includes('..')) return null;
  return candidate.startsWith(`${uid}/`) || candidate.startsWith(`users/${uid}/`) ? candidate : null;
}

// GET /api/wardrobe
const getItems = async (req, res, next) => {
  try {
    const { category, search, sort, season, occasion, color } = req.query;

    const filter = { owner: req.user._id };
    if (category) filter.category = category;
    if (season) filter.season = season;
    if (occasion) filter.occasions = { $regex: `^${escapeRegex(occasion)}$`, $options: 'i' };
    if (color) filter.colors = { $regex: `^${escapeRegex(color)}$`, $options: 'i' };
    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: 'i' };
      filter.$or = ['name', 'brand', 'colors', 'type', 'style', 'occasions'].map((field) => ({ [field]: pattern }));
    }

    let sortSpec = { createdAt: -1 };
    if (sort === 'name') sortSpec = { name: 1 };
    if (sort === 'category') sortSpec = { category: 1 };
    if (sort === 'oldest') sortSpec = { createdAt: 1 };

    const items = await ClothingItem.find(filter).sort(sortSpec);

    res.json({
      success: true,
      data: { items, count: items.length },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/wardrobe/:id
const getItemById = async (req, res, next) => {
  try {
    const item = await ClothingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    if (String(item.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view this item.' });
    }
    res.json({ success: true, data: { item } });
  } catch (error) {
    next(error);
  }
};

// POST /api/wardrobe/classify — Gemini tags an uploaded photo; the user
// reviews and edits the suggestion before anything is saved.
const classifyImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }
    const suggestion = await stylistService.analyzeClothingImage({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });
    res.json({ success: true, data: { suggestion } });
  } catch (error) {
    next(error);
  }
};

// POST /api/wardrobe/upload-image — uploads the image file and returns a URL
// to be used when creating/updating a wardrobe item.
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }
    const { url, path } = await imageService.storeImage(req.file.buffer, {
      uid: req.firebaseUser.uid,
      folder: 'wardrobe',
      mimetype: req.file.mimetype,
    });
    res.status(201).json({ success: true, data: { imageUrl: url, imagePath: path } });
  } catch (error) {
    next(error);
  }
};

// POST /api/wardrobe
const addItem = async (req, res, next) => {
  try {
    const {
      name, description, category, type, imageUrl, imagePath, colors, pattern,
      season, style, occasions, size, fit, brand, notes, aiSuggested,
    } = req.body;

    const item = await ClothingItem.create({
      owner: req.user._id,
      name,
      description: description || '',
      category,
      type: type || null,
      imageUrl: imageUrl || null,
      imagePath: ownedImagePath(req.firebaseUser.uid, imagePath, imageUrl),
      colors: colors || [],
      pattern: pattern || null,
      season: season || [],
      style: style || null,
      occasions: occasions || [],
      size: size || null,
      fit: fit || null,
      brand: brand || null,
      notes: notes || '',
      aiSuggested: aiSuggested || undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Item added to wardrobe.',
      data: { item },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/wardrobe/:id
const updateItem = async (req, res, next) => {
  try {
    const item = await ClothingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    if (String(item.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this item.' });
    }

    const updatable = [
      'name', 'description', 'category', 'type', 'imageUrl', 'colors', 'pattern',
      'season', 'style', 'occasions', 'size', 'fit', 'brand', 'notes',
    ];
    for (const field of updatable) {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
      }
    }
    if (req.body.imageUrl !== undefined) {
      item.imagePath = ownedImagePath(req.firebaseUser.uid, req.body.imagePath, req.body.imageUrl);
    }

    await item.save();

    res.json({
      success: true,
      message: 'Item updated.',
      data: { item },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/wardrobe/:id
const deleteItem = async (req, res, next) => {
  try {
    const item = await ClothingItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (String(item.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this item.' });
    }

    const storedPath = ownedImagePath(req.firebaseUser.uid, item.imagePath, item.imageUrl);
    if (storedPath) {
      imageService.deleteImage(storedPath).catch((err) => console.warn('Image cleanup failed:', err.message));
    }

    await item.deleteOne();

    res.json({
      success: true,
      message: 'Item removed from wardrobe.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getItems,
  getItemById,
  classifyImage,
  uploadImage,
  addItem,
  updateItem,
  deleteItem,
};
