const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { getPlans, setPlan, deletePlan, setWorn } = require('../controllers/plannerController');

const router = express.Router();

router.use(authenticate);
router.get('/', getPlans);
router.put('/:date', setPlan);
router.delete('/:date', deletePlan);
router.put('/:date/worn', setWorn);

module.exports = router;
