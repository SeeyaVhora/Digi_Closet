const ClothingItem = require('../models/ClothingItem');
const SavedOutfit = require('../models/SavedOutfit');
const stylistService = require('../services/stylistService');
const weatherService = require('../services/weatherService');

const SMART_PRESETS = {
  today: { occasion: 'Everyday', label: "Today's outfit" },
  college: { occasion: 'College', label: 'College' },
  office: { occasion: 'Office', label: 'Office' },
  party: { occasion: 'Party', label: 'Party' },
  casual: { occasion: 'Casual outing', label: 'Casual' },
  travel: { occasion: 'Travel', label: 'Travel' },
};

const POPULATE_SLOTS = ['clothingItems', 'topwear', 'bottomwear', 'layer', 'footwear', 'accessories'];

// Favourites first, then most recent — used as a taste signal for the AI.
async function recentOutfitHistory(ownerId, limit = 8) {
  const outfits = await SavedOutfit.find({ owner: ownerId })
    .sort({ favorite: -1, createdAt: -1 })
    .limit(limit)
    .populate('clothingItems', 'name');
  return outfits.map((o) => ({
    title: o.title,
    favorite: o.favorite,
    itemNames: o.clothingItems.map((i) => i.name),
  }));
}

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

// POST /api/outfits/recommend — AI outfit generator
const recommend = async (req, res, next) => {
  try {
    const { occasion, style, season, colors, city, surprise, excludeCombos } = req.body;

    const [wardrobeItems, recentOutfits, weather] = await Promise.all([
      ClothingItem.find({ owner: req.user._id }),
      recentOutfitHistory(req.user._id),
      city ? weatherService.describe(city) : null,
    ]);

    const outfits = await stylistService.generateOutfits({
      wardrobeItems,
      user: req.user,
      occasion,
      style,
      season,
      colors: asList(colors),
      weather,
      surprise: Boolean(surprise),
      recentOutfits,
      excludeCombos: asList(excludeCombos).filter(Array.isArray),
    });

    res.json({ success: true, data: { outfits, weather, wardrobeCount: wardrobeItems.length } });
  } catch (error) {
    next(error);
  }
};

// POST /api/outfits/smart — weather + preference + history aware picks
const smartRecommend = async (req, res, next) => {
  try {
    const { preset = 'today', city = 'Bengaluru', excludeCombos } = req.body;
    const config = SMART_PRESETS[preset];
    if (!config) {
      return res.status(400).json({ success: false, message: `Unknown preset. Use one of: ${Object.keys(SMART_PRESETS).join(', ')}.` });
    }

    const [wardrobeItems, recentOutfits, weather] = await Promise.all([
      ClothingItem.find({ owner: req.user._id }),
      recentOutfitHistory(req.user._id),
      weatherService.getCurrentWeather({ city }),
    ]);

    const weatherText = weather.found
      ? `${weather.condition}, ${weather.temperatureC}°C, humidity ${weather.humidity}% in ${weather.city}`
      : null;

    const outfits = await stylistService.generateOutfits({
      wardrobeItems,
      user: req.user,
      occasion: config.occasion,
      style: req.user.stylePreferences?.preferredStyles?.[0],
      weather: weatherText,
      recentOutfits,
      excludeCombos: asList(excludeCombos).filter(Array.isArray),
    });

    res.json({
      success: true,
      data: {
        preset,
        label: config.label,
        outfits,
        weather: weather.found ? weather : null,
        usedHistory: recentOutfits.length,
        wardrobeCount: wardrobeItems.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/outfits/saved — save an outfit made of the user's own items
const saveOutfit = async (req, res, next) => {
  try {
    const { title, itemIds, occasion, styleCategory, explanation, styleTips, source, favorite } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one clothing item is required.' });
    }

    const uniqueIds = [...new Set(itemIds.map(String))];
    const ownedItems = await ClothingItem.find({ _id: { $in: uniqueIds }, owner: req.user._id });
    if (ownedItems.length !== uniqueIds.length) {
      return res.status(400).json({ success: false, message: 'One or more items do not belong to your wardrobe.' });
    }

    const slots = stylistService.buildOutfit(uniqueIds, new Map(ownedItems.map((i) => [String(i._id), i])));

    const outfit = await SavedOutfit.create({
      owner: req.user._id,
      title: title || 'My Outfit',
      clothingItems: uniqueIds,
      topwear: slots?.topwearId || null,
      bottomwear: slots?.bottomwearId || null,
      layer: slots?.layerId || null,
      footwear: slots?.footwearId || null,
      accessories: slots?.accessoryIds || [],
      occasion: occasion || null,
      styleCategory: styleCategory || null,
      explanation: explanation || '',
      styleTips: Array.isArray(styleTips) ? styleTips : [],
      missingItems: slots?.missingItems || [],
      favorite: Boolean(favorite),
      source: SavedOutfit.SOURCES.includes(source) ? source : 'manual',
    });

    await outfit.populate(POPULATE_SLOTS);
    res.status(201).json({ success: true, message: 'Outfit saved.', data: { outfit } });
  } catch (error) {
    next(error);
  }
};

// GET /api/outfits/saved
const getSavedOutfits = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    if (req.query.favorite === 'true') filter.favorite = true;
    const outfits = await SavedOutfit.find(filter).populate(POPULATE_SLOTS).sort({ createdAt: -1 });
    res.json({ success: true, data: { outfits, count: outfits.length } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/outfits/saved/:id/favorite
const toggleFavorite = async (req, res, next) => {
  try {
    const outfit = await SavedOutfit.findOne({ _id: req.params.id, owner: req.user._id });
    if (!outfit) {
      return res.status(404).json({ success: false, message: 'Outfit not found.' });
    }
    outfit.favorite = !outfit.favorite;
    await outfit.save();
    await outfit.populate(POPULATE_SLOTS);
    res.json({ success: true, data: { outfit } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/outfits/saved/:id
const deleteOutfit = async (req, res, next) => {
  try {
    const outfit = await SavedOutfit.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!outfit) {
      return res.status(404).json({ success: false, message: 'Outfit not found.' });
    }
    res.json({ success: true, message: 'Outfit deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { recommend, smartRecommend, saveOutfit, getSavedOutfits, toggleFavorite, deleteOutfit };
