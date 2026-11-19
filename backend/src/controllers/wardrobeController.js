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

// Stores the photo sent along with a create/update request.
function storeWardrobeImage(req) {
  return imageService.storeImage(req.file.buffer, {
    uid: req.firebaseUser.uid,
    folder: 'wardrobe',
    mimetype: req.file.mimetype,
  });
}

// Deletes a stored image without failing the request; a leftover file is
// harmless, a failed response after a successful database write is not.
function discardImage(storedPath) {
  if (!storedPath) return;
  imageService.deleteImage(storedPath).catch((err) => console.warn('Image cleanup failed:', err.message));
}

// POST /api/wardrobe — JSON, or multipart with an `image` file and the item
// fields as JSON in `data`, so the photo and the record are saved together.
const addItem = async (req, res, next) => {
  let stored = null;
  try {
    const {
      name, description, category, type, imageUrl, imagePath, colors, pattern,
      season, style, occasions, size, fit, brand, notes, aiSuggested,
    } = req.body;

    let image = { url: null, path: null };
    if (req.file) {
      stored = await storeWardrobeImage(req);
      image = stored;
    } else {
      // Image uploaded earlier via /upload-image; only accept the caller's own files.
      const ownedPath = ownedImagePath(req.firebaseUser.uid, imagePath, imageUrl);
      if (ownedPath) image = { url: imageUrl, path: ownedPath };
    }

    const item = await ClothingItem.create({
      owner: req.user._id,
      name,
      description: description || '',
      category,
      type: type || null,
      imageUrl: image.url,
      imagePath: image.path,
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
    discardImage(stored?.path);
    next(error);
  }
};

// PUT /api/wardrobe/:id — accepts the same JSON or multipart body as POST.
// Send `imageUrl: null` to remove the photo.
const updateItem = async (req, res, next) => {
  let stored = null;
  try {
    const item = await ClothingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    if (String(item.owner) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this item.' });
    }

    const updatable = [
      'name', 'description', 'category', 'type', 'colors', 'pattern',
      'season', 'style', 'occasions', 'size', 'fit', 'brand', 'notes',
    ];
    for (const field of updatable) {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
      }
    }

    const previousPath = item.imagePath;
    const { imageUrl, imagePath } = req.body;
    if (req.file) {
      stored = await storeWardrobeImage(req);
      item.imageUrl = stored.url;
      item.imagePath = stored.path;
    } else if (imageUrl === null || imageUrl === '') {
      item.imageUrl = null;
      item.imagePath = null;
    } else if (imageUrl !== undefined && imageUrl !== item.imageUrl) {
      const ownedPath = ownedImagePath(req.firebaseUser.uid, imagePath, imageUrl);
      if (!ownedPath) {
        return res.status(400).json({ success: false, message: 'Invalid image reference.' });
      }
      item.imageUrl = imageUrl;
      item.imagePath = ownedPath;
    }

    await item.save();
    if (previousPath && previousPath !== item.imagePath) discardImage(previousPath);

    res.json({
      success: true,
      message: 'Item updated.',
      data: { item },
    });
  } catch (error) {
    discardImage(stored?.path);
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

    await item.deleteOne();
    // imagePath is only ever written by the server after an ownership check,
    // so it is safe to delete even if the owner's Firebase UID has since changed.
    discardImage(item.imagePath || ownedImagePath(req.firebaseUser.uid, null, item.imageUrl));

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
