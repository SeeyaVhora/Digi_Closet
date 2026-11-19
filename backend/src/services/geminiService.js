/**
 * Thin wrapper around the Google GenAI SDK.
 *
 * Every AI feature goes through generateJSON() or chat(). Failures are
 * surfaced as AIError with an HTTP status the error middleware can return;
 * nothing here ever substitutes canned or mock output.
 */

const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');

const RETRYABLE = new Set([429, 500, 503, 504]);
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;
// Stop trying once this much time has passed, so users aren't left waiting minutes.
const TOTAL_BUDGET_MS = 60000;
// Image editing is much slower than text.
const IMAGE_REQUEST_TIMEOUT_MS = 120000;
const IMAGE_TOTAL_BUDGET_MS = 150000;

class AIError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'AIError';
    this.statusCode = statusCode;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The SDK aborts on timeout without an HTTP status; treat that like a 504.
const statusOf = (err) => err.status || (err.name === 'AbortError' || /timed? ?out|aborted/i.test(err.message) ? 504 : undefined);

function toAIError(err) {
  if (err instanceof AIError) return err;
  const status = statusOf(err);
  if (/API key not valid|API_KEY_INVALID/i.test(err.message)) {
    return new AIError('The Gemini API key was rejected. Check GEMINI_API_KEY in backend/.env.', 502);
  }
  if (status === 400) return new AIError('Gemini could not process this request. If you uploaded an image, try a clearer JPEG or PNG.', 422);
  if (status === 401 || status === 403) return new AIError('The Gemini API key was rejected. Check GEMINI_API_KEY in backend/.env.', 502);
  if (status === 404) return new AIError('The configured Gemini model is not available for this API key. Check GEMINI_MODEL in backend/.env.', 502);
  if (status === 429 && /limit: 0\b/.test(err.message)) {
    return new AIError(
      'This Gemini API key has no quota for this model. Image generation is not available on the Gemini free tier: enable billing for the key\'s Google Cloud project.',
      503
    );
  }
  if (status === 429) return new AIError('Gemini rate limit reached. Please wait a minute and try again.', 429);
  if (RETRYABLE.has(status)) return new AIError('Gemini is temporarily overloaded. Please try again in a moment.', 503);
  return new AIError(`Gemini request failed: ${err.message}`, 502);
}

class GeminiService {
  constructor() {
    this.isConfigured = env.GEMINI_CONFIGURED;
    this.models = [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL].filter(Boolean);
    if (this.isConfigured) {
      this.client = new GoogleGenAI({
        apiKey: env.GEMINI_API_KEY,
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
      });
    }
  }

  static imagePart(buffer, mimeType) {
    return { inlineData: { data: buffer.toString('base64'), mimeType } };
  }

  /**
   * Calls generateContent. On a transient error (overload, rate limit,
   * timeout) it alternates primary -> fallback -> primary, within an overall
   * time budget. `hasOutput` decides whether a response actually contains
   * what was asked for. Returns the raw SDK response.
   */
  async _generate({
    contents,
    config,
    models = this.models,
    timeoutMs = REQUEST_TIMEOUT_MS,
    budgetMs = TOTAL_BUDGET_MS,
    hasOutput = (response) => Boolean(response.text),
  }) {
    if (!this.isConfigured) {
      throw new AIError('Gemini is not configured. Add GEMINI_API_KEY to backend/.env.', 503);
    }

    const [primary, fallback] = models;
    const attempts = fallback ? [primary, fallback, primary] : [primary, primary];
    const startedAt = Date.now();
    let lastError;

    for (const [index, model] of attempts.entries()) {
      if (index > 0) {
        if (Date.now() - startedAt > budgetMs) break;
        await sleep(RETRY_DELAY_MS);
      }
      try {
        const response = await this.client.models.generateContent({
          model,
          contents,
          config: { ...config, httpOptions: { timeout: timeoutMs } },
        });
        if (!hasOutput(response)) {
          const reason = response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason;
          throw new AIError(`Gemini returned no content${reason ? ` (${reason})` : ''}. Try a different image or wording.`, 422);
        }
        return response;
      } catch (err) {
        lastError = err;
        const status = statusOf(err);
        if (err instanceof AIError || !RETRYABLE.has(status)) throw toAIError(err);
        // A zero quota is a billing setting, not a transient limit; retrying won't help.
        if (status === 429 && /limit: 0\b/.test(err.message) && !fallback) throw toAIError(err);
        console.warn(`Gemini ${model} returned ${status} (attempt ${index + 1}/${attempts.length}).`);
      }
    }
    throw toAIError(lastError);
  }

  /**
   * Structured output: the model is constrained to `schema` (JSON Schema) and
   * the parsed object is returned. Callers still validate semantics such as
   * wardrobe ids, since a schema can't express "must be one of the user's items".
   */
  async generateJSON({ prompt, schema, images = [], systemInstruction, temperature = 0.7 }) {
    const response = await this._generate({
      contents: [{ role: 'user', parts: [{ text: prompt }, ...images] }],
      config: {
        systemInstruction,
        temperature,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
      },
    });

    try {
      return JSON.parse(response.text);
    } catch {
      throw new AIError('Gemini returned malformed JSON. Please try again.', 502);
    }
  }

  /**
   * Image editing / generation: `images` are reference photos (person first,
   * then garments), `prompt` says what to produce. Returns the first image.
   */
  async generateImage({ prompt, images = [] }) {
    const findImage = (response) => response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
    const response = await this._generate({
      contents: [{ role: 'user', parts: [...images, { text: prompt }] }],
      config: { responseModalities: ['IMAGE'], imageConfig: { imageSize: '1K' } },
      models: [env.GEMINI_IMAGE_MODEL, env.GEMINI_IMAGE_FALLBACK_MODEL].filter(Boolean),
      timeoutMs: IMAGE_REQUEST_TIMEOUT_MS,
      budgetMs: IMAGE_TOTAL_BUDGET_MS,
      hasOutput: (res) => Boolean(findImage(res)),
    });
    const { data, mimeType } = findImage(response).inlineData;
    return { buffer: Buffer.from(data, 'base64'), mimeType: mimeType || 'image/png' };
  }

  async chat({ history, message, systemInstruction }) {
    const contents = [
      ...history.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ];
    const response = await this._generate({ contents, config: { systemInstruction, temperature: 0.8 } });
    return response.text.trim();
  }
}

module.exports = new GeminiService();
module.exports.GeminiService = GeminiService;
module.exports.AIError = AIError;
