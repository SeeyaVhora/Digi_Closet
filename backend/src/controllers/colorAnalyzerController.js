const stylistService = require('../services/stylistService');

const HEX = /^#[0-9A-Fa-f]{6}$/;

const sanitizeSwatches = (list) => (Array.isArray(list) ? list : [])
  .filter((s) => s && typeof s.name === 'string' && HEX.test(s.hex))
  .slice(0, 12)
  .map((s) => ({ name: s.name.trim().slice(0, 40), hex: s.hex.toUpperCase(), note: String(s.note || '').slice(0, 200) }));

const hasPalette = (palette) => palette?.recommendedColors?.length > 0;

// POST /api/colors/palette/analyze — the photo is analysed in memory and
// never written to disk or the database. Requires explicit consent.
const analyzePersonalPalette = async (req, res, next) => {
  try {
    if (req.body.consent !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Please confirm you consent to sending this photo to Google Gemini for analysis.',
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a clear face photo.' });
    }

    const palette = await stylistService.analyzeColorPalette({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    res.json({ success: true, data: { palette } });
  } catch (error) {
    next(error);
  }
};

// GET /api/colors/palette
const getPersonalPalette = async (req, res, next) => {
  try {
    const palette = req.user.colorPalette;
    res.json({ success: true, data: { palette: hasPalette(palette) ? palette : null } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/colors/palette — save an AI palette or a manually edited one
const savePersonalPalette = async (req, res, next) => {
  try {
    const body = req.body || {};
    const palette = {
      season: ['Spring', 'Summer', 'Autumn', 'Winter'].includes(body.season) ? body.season : 'Unknown',
      undertone: ['warm', 'cool', 'neutral', 'uncertain'].includes(body.undertone) ? body.undertone : 'uncertain',
      contrast: ['low', 'medium', 'high'].includes(body.contrast) ? body.contrast : null,
      summary: String(body.summary || '').slice(0, 600),
      lightingNote: String(body.lightingNote || '').slice(0, 300),
      recommendedColors: sanitizeSwatches(body.recommendedColors),
      neutralColors: sanitizeSwatches(body.neutralColors),
      experimentColors: sanitizeSwatches(body.experimentColors),
      avoidColors: sanitizeSwatches(body.avoidColors),
      combinations: (Array.isArray(body.combinations) ? body.combinations : []).slice(0, 6).map((c) => ({
        name: String(c.name || '').slice(0, 60),
        usage: String(c.usage || '').slice(0, 200),
        hexes: (c.hexes || []).filter((h) => HEX.test(h)).slice(0, 4),
      })).filter((c) => c.hexes.length >= 2),
      source: body.source === 'ai' ? 'ai' : 'custom',
      analyzedAt: new Date(),
    };

    if (!hasPalette(palette)) {
      return res.status(400).json({ success: false, message: 'A palette needs at least one recommended colour.' });
    }

    req.user.colorPalette = palette;
    await req.user.save();
    res.json({ success: true, message: 'Colour palette saved.', data: { palette: req.user.colorPalette } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/colors/palette
const deletePersonalPalette = async (req, res, next) => {
  try {
    req.user.colorPalette = {};
    await req.user.save();
    res.json({ success: true, message: 'Colour palette removed.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { analyzePersonalPalette, getPersonalPalette, savePersonalPalette, deletePersonalPalette };
