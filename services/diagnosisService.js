const Anthropic = require('@anthropic-ai/sdk');
const config    = require('../config');
const logger    = require('../utils/logger');

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BASE64_BYTES   = 4 * 1024 * 1024; // 4 MB
const TIMEOUT_MS         = 30_000;           // 30 seconds

const sanitizeMimeType = (mimeType) => {
  if (ALLOWED_MIME_TYPES.includes(mimeType)) return mimeType;
  if (mimeType === 'image/jpg' || mimeType.includes('jpeg')) return 'image/jpeg';
  if (mimeType.includes('png'))  return 'image/png';
  if (mimeType.includes('gif'))  return 'image/gif';
  if (mimeType.includes('webp')) return 'image/webp';
  return null; // reject anything else
};

const parseAIResponse = (rawText) => {
  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    logger.warn('AI returned unparseable response', { snippet: rawText.slice(0, 200) });
    return null;
  }
};

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('Claude API timeout'), { statusCode: 504 })), ms)
    ),
  ]);

// ─── Image diagnosis ──────────────────────────────────────────────────────────

const diagnoseCrop = async (imageBase64, mimeType) => {
  // Validate mime type
  const safeMimeType = sanitizeMimeType(mimeType);
  if (!safeMimeType) {
    const err = new Error('Unsupported image type. Use JPEG, PNG, WEBP, or GIF.');
    err.statusCode = 400;
    throw err;
  }

  // Validate size
  const byteLength = Buffer.byteLength(imageBase64, 'base64');
  if (byteLength > MAX_BASE64_BYTES) {
    const err = new Error('Image too large for analysis (max 4 MB)');
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await withTimeout(
      client.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 1024,
        system: `You are an expert agricultural pathologist specializing in African and Ghanaian crops.
Analyze the uploaded crop image and respond ONLY with a valid JSON object in this exact format:
{
  "cropIdentified": "string — the crop type if identifiable, else Unknown",
  "diseaseIdentified": "string — name of the disease or condition detected",
  "confidence": "High | Medium | Low",
  "severity": "Mild | Moderate | Severe",
  "description": "string — 2-3 sentence plain-language explanation of what is wrong",
  "causes": ["array of likely causes"],
  "treatmentSteps": ["array of actionable step-by-step treatment instructions"],
  "preventionTips": ["array of prevention tips"],
  "recommendedProductTypes": ["array of specific product types the farmer should buy"]
}
Do not include any text outside the JSON object. If the image is unclear, still attempt a best-guess and set confidence to Low.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: safeMimeType, data: imageBase64 } },
            { type: 'text',  text: 'Analyze this crop image and return the diagnosis JSON.' },
          ],
        }],
      }),
      TIMEOUT_MS
    );

    const result = parseAIResponse(response.content[0].text);
    if (!result) {
      const err = new Error('Diagnosis service temporarily unavailable');
      err.statusCode = 503;
      throw err;
    }
    return result;
  } catch (err) {
    if (err.statusCode) throw err; // re-throw our own errors
    logger.error('Anthropic API error (image)', { message: err.message });
    const serviceErr = new Error('Diagnosis service temporarily unavailable');
    serviceErr.statusCode = 503;
    throw serviceErr;
  }
};

// ─── Text diagnosis ───────────────────────────────────────────────────────────

const diagnoseCropByText = async (textDescription, cropType) => {
  // Sanitize: strip HTML, cap length
  const sanitized = textDescription
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 1000);

  try {
    const response = await withTimeout(
      client.messages.create({
        model:      'claude-sonnet-4-5',
        max_tokens: 1024,
        system: `You are an expert agricultural pathologist specializing in African and Ghanaian crops.
A farmer has described symptoms they are observing on their crop. Based on the description, respond ONLY with a valid JSON object in this exact format:
{
  "cropIdentified": "string — the crop type based on context, or what the farmer stated",
  "diseaseIdentified": "string — most likely disease or condition based on the description",
  "confidence": "High | Medium | Low",
  "severity": "Mild | Moderate | Severe",
  "description": "string — 2-3 sentence plain-language explanation of what is likely wrong",
  "causes": ["array of likely causes"],
  "treatmentSteps": ["array of actionable step-by-step treatment instructions"],
  "preventionTips": ["array of prevention tips"],
  "recommendedProductTypes": ["array of specific product types the farmer should buy"]
}
Do not include any text outside the JSON object. If the description is vague, still attempt a best-guess and set confidence to Low.`,
        messages: [{
          role: 'user',
          content: `Crop type: ${cropType}\n\nFarmer's description of symptoms:\n${sanitized}`,
        }],
      }),
      TIMEOUT_MS
    );

    const result = parseAIResponse(response.content[0].text);
    if (!result) {
      const err = new Error('Diagnosis service temporarily unavailable');
      err.statusCode = 503;
      throw err;
    }
    return result;
  } catch (err) {
    if (err.statusCode) throw err;
    logger.error('Anthropic API error (text)', { message: err.message });
    const serviceErr = new Error('Diagnosis service temporarily unavailable');
    serviceErr.statusCode = 503;
    throw serviceErr;
  }
};

module.exports = { diagnoseCrop, diagnoseCropByText };
