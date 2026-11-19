require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  MONGODB_URI: process.env.MONGODB_URI,

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
  FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_CONFIGURED: Boolean(process.env.GEMINI_API_KEY),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite',
  // Image editing models used by Virtual Try-On and Style Makeover. These are
  // paid-tier only: the Gemini free tier allows zero image generations.
  GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
  GEMINI_IMAGE_FALLBACK_MODEL: process.env.GEMINI_IMAGE_FALLBACK_MODEL || 'gemini-2.5-flash-image',

  // Which provider generates try-on / makeover images. Only "gemini" today;
  // see services/imageGenerationService.js to add another.
  IMAGE_GENERATION_PROVIDER: process.env.IMAGE_GENERATION_PROVIDER || 'gemini',

  WEATHER_PROVIDER: process.env.WEATHER_PROVIDER || 'open-meteo',

  // Only "serpapi" (Google Shopping via serpapi.com) is implemented today.
  PRODUCT_SEARCH_PROVIDER: process.env.PRODUCT_SEARCH_PROVIDER || 'serpapi',
  PRODUCT_SEARCH_API_KEY: process.env.PRODUCT_SEARCH_API_KEY || '',
  PRODUCT_SEARCH_CONFIGURED: Boolean(process.env.PRODUCT_SEARCH_API_KEY),
};

// Validate required environment variables
const required = ['MONGODB_URI'];
for (const key of required) {
  if (!env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (!env.FIREBASE_AUTH_EMULATOR_HOST && !(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY)) {
  console.warn(
    '⚠️  Firebase Admin is not fully configured. Set FIREBASE_AUTH_EMULATOR_HOST for local dev, ' +
    'or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY for production.'
  );
}

module.exports = env;
