const express = require('express');
const { getWeather } = require('../controllers/weatherController');

const router = express.Router();

// Weather route is public (proxies Open-Meteo)
router.get('/', getWeather);

module.exports = router;
