const User = require('../models/User');

// GET /api/profile
const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: { profile: req.user },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, stylePreferences, physicalProfile, onboardingCompleted, privacySettings } = req.body;

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
      if (!trimmed || trimmed.length > 60) {
        return res.status(400).json({ success: false, message: 'Enter a name between 1 and 60 characters.' });
      }
      req.user.name = trimmed;
    }

    if (stylePreferences) {
      req.user.stylePreferences = { ...req.user.stylePreferences.toObject(), ...stylePreferences };
    }

    if (physicalProfile) {
      req.user.physicalProfile = { ...req.user.physicalProfile.toObject(), ...physicalProfile };
    }

    if (privacySettings) {
      req.user.privacySettings = { ...req.user.privacySettings, ...privacySettings };
    }

    if (typeof onboardingCompleted === 'boolean') {
      req.user.onboardingCompleted = onboardingCompleted;
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { profile: req.user },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/profile — removes sensitive style/physical data, keeps account.
const deleteProfileData = async (req, res, next) => {
  try {
    req.user.stylePreferences = {};
    req.user.physicalProfile = {};
    req.user.onboardingCompleted = false;
    await req.user.save();

    res.json({
      success: true,
      message: 'Profile preferences and physical data deleted.',
      data: { profile: req.user },
    });
  } catch (error) {
    next(error);
  }
};

const ClothingItem = require('../models/ClothingItem');
const SavedOutfit = require('../models/SavedOutfit');
const ShoppingList = require('../models/ShoppingList');
const SavedProduct = require('../models/SavedProduct');
const Conversation = require('../models/Conversation');
const Look = require('../models/Look');
const OutfitPlan = require('../models/OutfitPlan');
const imageService = require('../services/imageService');
const { auth: firebaseAuth } = require('../config/firebaseAdmin');

// GET /api/profile/export — exports all user data (profile, wardrobe, outfits, shopping lists)
const exportUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [wardrobe, outfits, shoppingLists, savedProducts, looks, outfitPlans] = await Promise.all([
      ClothingItem.find({ owner: userId }).lean(),
      SavedOutfit.find({ owner: userId }).lean(),
      ShoppingList.find({ owner: userId }).lean(),
      SavedProduct.find({ owner: userId }).lean(),
      Look.find({ owner: userId }).lean(),
      OutfitPlan.find({ owner: userId }).lean(),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        onboardingCompleted: req.user.onboardingCompleted,
        stylePreferences: req.user.stylePreferences,
        physicalProfile: req.user.physicalProfile,
        privacySettings: req.user.privacySettings,
        createdAt: req.user.createdAt,
      },
      wardrobe: {
        count: wardrobe.length,
        items: wardrobe,
      },
      outfits: {
        count: outfits.length,
        items: outfits,
      },
      shoppingLists: {
        count: shoppingLists.length,
        items: shoppingLists,
      },
      savedProducts: {
        count: savedProducts.length,
        items: savedProducts,
      },
      looks: {
        count: looks.length,
        items: looks,
      },
      outfitPlans: {
        count: outfitPlans.length,
        items: outfitPlans,
      },
    };

    res.json({
      success: true,
      message: 'User data exported successfully.',
      data: exportPayload,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/profile/account — removes user and all associated closet data
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Remove the user's photos too: looks (photos of the user) and wardrobe images.
    const [looks, items] = await Promise.all([
      Look.find({ owner: userId }, 'sourceImagePath resultPath').lean(),
      ClothingItem.find({ owner: userId, imagePath: { $type: 'string' } }, 'imagePath').lean(),
    ]);
    const images = new Set([
      ...looks.flatMap((look) => [look.sourceImagePath, look.resultPath]),
      ...items.map((item) => item.imagePath),
    ]);
    await Promise.all([...images].map((p) => imageService.deleteImage(p).catch(() => {})));

    await Promise.all([
      ClothingItem.deleteMany({ owner: userId }),
      SavedOutfit.deleteMany({ owner: userId }),
      ShoppingList.deleteMany({ owner: userId }),
      SavedProduct.deleteMany({ owner: userId }),
      Conversation.deleteMany({ owner: userId }),
      Look.deleteMany({ owner: userId }),
      OutfitPlan.deleteMany({ owner: userId }),
      User.findByIdAndDelete(userId),
    ]);

    // Delete the Firebase sign-in account last; otherwise the user can sign
    // straight back in and a blank profile is recreated.
    try {
      await firebaseAuth.deleteUser(req.firebaseUser.uid);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        console.error('Failed to delete Firebase account:', err.message);
        return res.status(500).json({
          success: false,
          message: 'Your closet data was deleted, but the sign-in account could not be removed. Please try again.',
        });
      }
    }

    res.json({
      success: true,
      message: 'Account and all associated closet data deleted permanently.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, deleteProfileData, exportUserData, deleteAccount };

