const express = require('express');
const mongoose = require('mongoose');
const env = require('../config/env');

const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const wardrobeRoutes = require('./wardrobeRoutes');
const productRoutes = require('./productRoutes');
const outfitRoutes = require('./outfitRoutes');
const fashionCriticRoutes = require('./fashionCriticRoutes');
const colorAnalyzerRoutes = require('./colorAnalyzerRoutes');
const shoppingRoutes = require('./shoppingRoutes');
const tryOnRoutes = require('./tryOnRoutes');
const chatRoutes = require('./chatRoutes');
const weatherRoutes = require('./weatherRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/wardrobe', wardrobeRoutes);
router.use('/products', productRoutes);
router.use('/outfits', outfitRoutes);
router.use('/fashion', fashionCriticRoutes);
router.use('/colors', colorAnalyzerRoutes);
router.use('/shopping', shoppingRoutes);
router.use('/try-on', tryOnRoutes);
router.use('/chat', chatRoutes);
router.use('/weather', weatherRoutes);

// Health check
router.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected ? 'Digi Closet API is running.' : 'API is up but the database is not connected.',
    database: dbConnected ? 'connected' : 'disconnected',
    gemini: env.GEMINI_CONFIGURED ? env.GEMINI_MODEL : 'not configured',
    productSearch: env.PRODUCT_SEARCH_CONFIGURED ? env.PRODUCT_SEARCH_PROVIDER : 'not configured',
  });
});

module.exports = router;
