const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { upload, parseJsonField } = require('../middleware/uploadMiddleware');
const { validate, wardrobeSchema } = require('../middleware/validateMiddleware');
const {
  getItems, getItemById, classifyImage, uploadImage, addItem, updateItem, deleteItem,
} = require('../controllers/wardrobeController');

const router = express.Router();

router.use(authenticate);
router.get('/', getItems);
router.post('/classify', upload.single('image'), classifyImage);
router.post('/upload-image', upload.single('image'), uploadImage);
router.post('/', upload.single('image'), parseJsonField, validate(wardrobeSchema), addItem);
router.get('/:id', getItemById);
router.put('/:id', upload.single('image'), parseJsonField, updateItem);
router.delete('/:id', deleteItem);

module.exports = router;
