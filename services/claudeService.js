const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Diagnose a crop disease from a leaf image URL using Claude vision.
 * Returns a structured JSON object with disease info.
 */
async function diagnoseCrop(imageUrl, cropType) {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: `You are an expert agricultural pathologist. Analyze this ${cropType} leaf image and respond ONLY with a valid JSON object in this exact format, no other text:
{
  "diseaseName": "string (e.g. Late Blight, Healthy, Leaf Spot)",
  "severity": "low | medium | high",
  "confidence": number (0-100),
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "treatment": "string — specific actionable treatment steps",
  "prevention": "string — how to prevent recurrence"
}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].text.trim();

  // Strip markdown code fences if Claude wrapped the JSON
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`Claude returned invalid JSON: ${text}`);
  }

  // Validate required fields
  const required = ['diseaseName', 'severity', 'confidence', 'symptoms', 'treatment', 'prevention'];
  for (const field of required) {
    if (parsed[field] === undefined) {
      throw new Error(`Claude response missing field: ${field}`);
    }
  }

  // Normalise severity to lowercase
  parsed.severity = parsed.severity.toLowerCase();
  if (!['low', 'medium', 'high'].includes(parsed.severity)) {
    parsed.severity = 'medium';
  }

  return parsed;
}

module.exports = { diagnoseCrop };
