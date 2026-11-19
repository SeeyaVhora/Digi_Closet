const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { aiRateLimiter } = require('../middleware/rateLimitMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const {
  analyzePersonalPalette,
  getPersonalPalette,
  savePersonalPalette,
  deletePersonalPalette,
} = require('../controllers/colorAnalyzerController');

const router = express.Router();

router.use(authenticate);

router.post('/palette/analyze', aiRateLimiter, upload.single('image'), analyzePersonalPalette);
router.get('/palette', getPersonalPalette);
router.put('/palette', savePersonalPalette);
router.delete('/palette', deletePersonalPalette);

module.exports = router;
