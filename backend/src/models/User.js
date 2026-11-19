const mongoose = require('mongoose');

const stylePreferencesSchema = new mongoose.Schema(
  {
    preferredStyles: { type: [String], default: [] },
    favoriteColors: { type: [String], default: [] },
    dislikedColors: { type: [String], default: [] },
    preferredBrands: { type: [String], default: [] },
    preferredCategories: { type: [String], default: [] },
    preferredSizes: { type: [String], default: [] },
    aesthetics: { type: [String], default: [] },
    preferredOccasions: { type: [String], default: [] },
    budgetMin: { type: Number, default: null },
    budgetMax: { type: Number, default: null },
    preferredStores: { type: [String], default: [] },
  },
  { _id: false }
);

const physicalProfileSchema = new mongoose.Schema(
  {
    height: { type: String, default: null },
    weight: { type: String, default: null },
    faceShape: { type: String, default: null },
    clothingSizes: { type: String, default: null },
    fitPreferences: { type: String, default: null },
    consentGiven: { type: Boolean, default: false },
  },
  { _id: false }
);

const colorSwatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    hex: { type: String, required: true },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const colorCombinationSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    usage: { type: String, default: '' },
    hexes: { type: [String], default: [] },
  },
  { _id: false }
);

// Only the derived palette is stored; the face photo used to create it is not.
const personalColorPaletteSchema = new mongoose.Schema(
  {
    season: {
      type: String,
      enum: ['Spring', 'Summer', 'Autumn', 'Winter', 'Unknown'],
      default: 'Unknown',
    },
    undertone: {
      type: String,
      enum: ['warm', 'cool', 'neutral', 'uncertain'],
      default: 'uncertain',
    },
    contrast: { type: String, enum: ['low', 'medium', 'high', null], default: null },
    summary: { type: String, default: '' },
    lightingNote: { type: String, default: '' },
    recommendedColors: { type: [colorSwatchSchema], default: [] },
    neutralColors: { type: [colorSwatchSchema], default: [] },
    experimentColors: { type: [colorSwatchSchema], default: [] },
    avoidColors: { type: [colorSwatchSchema], default: [] },
    combinations: { type: [colorCombinationSchema], default: [] },
    source: { type: String, enum: ['ai', 'custom'], default: 'ai' },
    analyzedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    onboardingCompleted: { type: Boolean, default: false },
    stylePreferences: { type: stylePreferencesSchema, default: () => ({}) },
    physicalProfile: { type: physicalProfileSchema, default: () => ({}) },
    colorPalette: { type: personalColorPaletteSchema, default: () => ({}) },
    privacySettings: {
      allowPhysicalDataUse: { type: Boolean, default: false },
      allowAIPersonalization: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
