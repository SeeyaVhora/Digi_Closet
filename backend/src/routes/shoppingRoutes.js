const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { aiRateLimiter } = require('../middleware/rateLimitMiddleware');
const { plan, getSavedLists, deleteList, assistantSearch } = require('../controllers/shoppingController');

const router = express.Router();

router.use(authenticate);
router.post('/assistant/search', aiRateLimiter, assistantSearch);
router.post('/plan', aiRateLimiter, plan);
router.get('/saved', getSavedLists);
router.delete('/saved/:id', deleteList);

module.exports = router;
