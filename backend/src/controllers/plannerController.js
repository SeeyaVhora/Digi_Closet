const mongoose = require('mongoose');
const OutfitPlan = require('../models/OutfitPlan');
const SavedOutfit = require('../models/SavedOutfit');
const ClothingItem = require('../models/ClothingItem');

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 62;
const OUTFIT_SLOTS = ['clothingItems', 'topwear', 'bottomwear', 'layer', 'footwear', 'accessories'];

const isValidDate = (value) => DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const badRequest = (res, message) => res.status(400).json({ success: false, message });

const populatePlan = (query) => query.populate({ path: 'outfit', populate: OUTFIT_SLOTS });

// Every wardrobe item that appears anywhere in an outfit, once.
function outfitItemIds(outfit) {
  const ids = OUTFIT_SLOTS.flatMap((slot) => [].concat(outfit[slot] || []));
  return [...new Set(ids.filter(Boolean).map(String))];
}

// GET /api/planner?from=YYYY-MM-DD&to=YYYY-MM-DD
const getPlans = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!isValidDate(from) || !isValidDate(to) || from > to) return badRequest(res, 'Provide a valid from/to date range.');
    if ((Date.parse(to) - Date.parse(from)) / 86400000 > MAX_RANGE_DAYS) return badRequest(res, `The range can be at most ${MAX_RANGE_DAYS} days.`);

    const plans = await populatePlan(
      OutfitPlan.find({ owner: req.user._id, date: { $gte: from, $lte: to } }).sort({ date: 1 })
    );
    res.json({ success: true, data: { plans } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/planner/:date — { outfitId, occasion? } assigns a saved outfit to the day.
const setPlan = async (req, res, next) => {
  try {
    const { date } = req.params;
    const { outfitId, occasion } = req.body;
    if (!isValidDate(date)) return badRequest(res, 'Invalid date.');
    if (!mongoose.isValidObjectId(outfitId)) return badRequest(res, 'Choose one of your saved outfits.');

    const outfit = await SavedOutfit.exists({ _id: outfitId, owner: req.user._id });
    if (!outfit) return res.status(404).json({ success: false, message: 'Outfit not found.' });

    const existing = await OutfitPlan.findOne({ owner: req.user._id, date });
    if (existing?.worn && String(existing.outfit) !== String(outfitId)) {
      return badRequest(res, 'This day is marked as worn. Unmark it before changing the outfit.');
    }

    const plan = await populatePlan(OutfitPlan.findOneAndUpdate(
      { owner: req.user._id, date },
      { $set: { outfit: outfitId, occasion: typeof occasion === 'string' && occasion.trim() ? occasion.trim() : null } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ));
    res.json({ success: true, data: { plan } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/planner/:date — clears the day. Wear history already recorded is kept.
const deletePlan = async (req, res, next) => {
  try {
    const plan = await OutfitPlan.findOneAndDelete({ owner: req.user._id, date: req.params.date });
    if (!plan) return res.status(404).json({ success: false, message: 'Nothing planned for this day.' });
    res.json({ success: true, message: 'Plan removed.' });
  } catch (error) {
    next(error);
  }
};

// PUT /api/planner/:date/worn — { worn: boolean }. Marking a day worn counts a
// wear for every item in its outfit; unmarking takes it back.
const setWorn = async (req, res, next) => {
  try {
    const { worn } = req.body;
    if (typeof worn !== 'boolean') return badRequest(res, 'Send worn: true or false.');

    const plan = await OutfitPlan.findOne({ owner: req.user._id, date: req.params.date }).populate('outfit');
    if (!plan) return res.status(404).json({ success: false, message: 'Nothing planned for this day.' });
    if (plan.worn === worn) return res.json({ success: true, data: { plan: await populatePlan(OutfitPlan.findById(plan._id)) } });
    // Dates are the user's local dates, which can run up to a day ahead of UTC.
    const latestToday = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    if (worn && plan.date > latestToday) return badRequest(res, 'You can only mark days up to today as worn.');

    const itemIds = plan.outfit ? outfitItemIds(plan.outfit) : [];
    const filter = { _id: { $in: itemIds }, owner: req.user._id };
    if (worn) {
      await ClothingItem.updateMany(filter, { $inc: { wearCount: 1 }, $max: { lastWornAt: new Date(`${plan.date}T12:00:00Z`) } });
    } else {
      await ClothingItem.updateMany({ ...filter, wearCount: { $gt: 0 } }, { $inc: { wearCount: -1 } });
    }
    plan.worn = worn;
    await plan.save();

    res.json({ success: true, data: { plan: await populatePlan(OutfitPlan.findById(plan._id)) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlans, setPlan, deletePlan, setWorn };
