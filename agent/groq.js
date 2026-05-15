'use strict';

const Groq = require('groq-sdk');

/**
 * Groq client + model constants for Tinig Manila.
 *
 * Stack alignment (see README.md → Tech Stack):
 *   - AI / LLM: Groq (free tier — 14,400 req/day, 30k tokens/min)
 *   - Main model: llama-3.3-70b-versatile  → conversational replies
 *   - Fast model: llama-3.1-8b-instant     → identity extraction + analytics
 *
 * Only env var required:
 *   GROQ_API_KEY  (see .env.example)
 *
 * The client is constructed lazily on first use. If GROQ_API_KEY is unset
 * we still construct a placeholder client so the rest of the server boots
 * (e.g. /health stays up). Real API calls reject and every caller wraps
 * them in try/catch.
 */

const MAIN_MODEL = 'llama-3.3-70b-versatile';
const FAST_MODEL = 'llama-3.1-8b-instant';

let _client = null;

/**
 * Get the shared Groq client. Constructed on first call so the module
 * can be required without a real key (useful for tests + boot-without-secrets).
 *
 * @returns {Groq}
 */
function getClient() {
  if (_client) return _client;
  _client = new Groq({ apiKey: process.env.GROQ_API_KEY || 'unset' });
  return _client;
}

/**
 * Thin wrapper around groq.chat.completions.create().
 *
 * Returns the trimmed assistant message text (or '' when the model gave
 * an empty completion). Callers should still try/catch — network errors,
 * 401s, and rate-limits all surface here as thrown errors.
 *
 * @param {Object} opts
 * @param {string} opts.model
 * @param {Array<{role: string, content: string}>} opts.messages
 * @param {number} [opts.temperature=0.7]
 * @param {number} [opts.max_tokens=300]
 * @returns {Promise<string>}
 */
async function chat({ model, messages, temperature = 0.7, max_tokens = 300 }) {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}

/**
 * Parse a JSON object out of an LLM response that may include surrounding
 * prose, markdown fences, or trailing punctuation. Returns null on failure
 * instead of throwing so callers don't need their own try/catch.
 *
 * @param {string} raw
 * @returns {Object|null}
 */
function parseJsonBlob(raw) {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

module.exports = {
  MAIN_MODEL,
  FAST_MODEL,
  getClient,
  chat,
  parseJsonBlob,
};
