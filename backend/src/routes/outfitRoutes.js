const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { aiRateLimiter } = require('../middleware/rateLimitMiddleware');
const {
  recommend, smartRecommend, saveOutfit, getSavedOutfits, toggleFavorite, deleteOutfit,
} = require('../controllers/outfitController');

const router = express.Router();

router.use(authenticate);
router.post('/recommend', aiRateLimiter, recommend);
router.post('/smart', aiRateLimiter, smartRecommend);
router.get('/saved', getSavedOutfits);
router.post('/saved', saveOutfit);
router.put('/saved/:id/favorite', toggleFavorite);
router.delete('/saved/:id', deleteOutfit);

module.exports = router;
