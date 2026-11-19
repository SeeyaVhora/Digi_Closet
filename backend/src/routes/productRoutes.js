const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { saveProduct, getSavedProducts, unsaveProduct } = require('../controllers/productController');

const router = express.Router();

router.use(authenticate);
router.get('/saved', getSavedProducts);
router.post('/saved', saveProduct);
router.delete('/saved/:id', unsaveProduct);

module.exports = router;
