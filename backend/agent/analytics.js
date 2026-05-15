'use strict';

const { chat, parseJsonBlob, FAST_MODEL } = require('./groq');
const { ANALYTICS_PROMPT } = require('../prompts/system');

/**
 * Call analytics — intent classification + sentiment scoring.
 *
 * Runs the fast Groq model on the caller's latest message (NOT the whole
 * history — single-utterance signal is more interpretable on a live dashboard).
 *
 * Output is sanity-checked:
 *   - sentiment clamped to [0, 100]
 *   - sentiment_label only accepted from a known closed set
 *   - any malformed JSON / network failure resolves to null instead of throwing
 */

const VALID_LABELS = new Set([
  'Distressed',
  'Confused',
  'Neutral',
  'Content',
  'Satisfied',
]);

const VALID_INTENTS = new Set([
  'egovph_registration',
  'senior_benefits',
  'health_services',
  'appointment_booking',
  'barangay_services',
  'identity_verification',
  'general_inquiry',
  'unclear',
]);

/**
 * @param {string} message - The caller's latest utterance
 * @returns {Promise<{intent: string|null, sentiment: number|null, sentimentLabel: string|null}|null>}
 */
async function analyseConversation(message) {
  try {
    const raw = await chat({
      model: FAST_MODEL,
      messages: [
        { role: 'system', content: ANALYTICS_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.1,
      max_tokens: 80,
    });
    const parsed = parseJsonBlob(raw);
    if (!parsed) return null;

    const intent = VALID_INTENTS.has(parsed.intent) ? parsed.intent : null;

    const sentiment =
      typeof parsed.sentiment === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.sentiment)))
        : null;

    const sentimentLabel = VALID_LABELS.has(parsed.sentiment_label)
      ? parsed.sentiment_label
      : null;

    return { intent, sentiment, sentimentLabel };
  } catch {
    return null;
  }
}

module.exports = {
  analyseConversation,
  VALID_LABELS,
  VALID_INTENTS,
};
