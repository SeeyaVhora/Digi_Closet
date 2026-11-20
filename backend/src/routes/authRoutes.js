const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { sync } = require('../controllers/authController');

const router = express.Router();

router.use(authenticate);
router.post('/sync', sync);

module.exports = router;
