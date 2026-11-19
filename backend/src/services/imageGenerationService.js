/**
 * Image generation provider boundary for Virtual Try-On and Style Makeover.
 *
 * Callers pass a prompt plus reference images ({ buffer, mimeType }, person
 * photo first) and get back one generated image buffer. To switch provider,
 * add an entry to PROVIDERS with the same signature and set
 * IMAGE_GENERATION_PROVIDER in backend/.env; nothing else needs to change.
 */

const env = require('../config/env');
const gemini = require('./geminiService');
const { GeminiService, AIError } = gemini;

const PROVIDERS = {
  gemini: ({ prompt, images }) => gemini.generateImage({
    prompt,
    images: images.map((image) => GeminiService.imagePart(image.buffer, image.mimeType)),
  }),
};

/**
 * @param {{ prompt: string, images: Array<{ buffer: Buffer, mimeType: string }> }} request
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
async function generateImage(request) {
  const provider = PROVIDERS[env.IMAGE_GENERATION_PROVIDER];
  if (!provider) {
    throw new AIError(`Unknown IMAGE_GENERATION_PROVIDER "${env.IMAGE_GENERATION_PROVIDER}".`, 503);
  }
  return provider(request);
}

module.exports = { generateImage };
