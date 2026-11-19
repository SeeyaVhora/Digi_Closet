const ClothingItem = require('../models/ClothingItem');
const stylistService = require('../services/stylistService');

function parseIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw).split(',').map((id) => id.trim()).filter(Boolean);
  }
}

// POST /api/fashion/analyze — multipart: optional `image`, optional `itemIds`
// (JSON array of the user's wardrobe ids), optional `occasion`.
const analyze = async (req, res, next) => {
  try {
    const { occasion } = req.body;
    const itemIds = parseIds(req.body.itemIds);

    const wardrobeItems = await ClothingItem.find({ owner: req.user._id });
    const selectedItems = wardrobeItems.filter((item) => itemIds.includes(String(item._id)));

    if (!req.file && selectedItems.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Upload an outfit photo or select at least two items from your wardrobe.',
      });
    }

    const result = await stylistService.critiqueOutfit({
      image: req.file && { buffer: req.file.buffer, mimeType: req.file.mimetype },
      selectedItems,
      wardrobeItems,
      occasion,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { analyze };
