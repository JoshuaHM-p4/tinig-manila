'use strict';

const { VOICE_DEFAULTS, MAX_SAY_CHUNK } = require('./config');

/**
 * Text-to-Speech helpers for Twilio's built-in <Say> verb.
 *
 * Tinig speaks Tagalog/Taglish through Google's fil-PH neural-ish voice.
 * All output flows through `sanitizeForSay` so the LLM occasionally producing
 * markdown, emojis, or stray XML can never break TwiML.
 */

/**
 * Clean an LLM reply so it can be safely spoken by Twilio.
 *
 *   - Strips markdown emphasis (`*bold*`, `_italics_`, backticks, headings)
 *   - Strips most emoji code points
 *   - Collapses whitespace and normalises newlines into sentence breaks
 *   - Leaves XML escaping to the Twilio SDK (it auto-escapes string args)
 *
 * @param {string} text
 * @returns {string} TTS-safe text
 */
function sanitizeForSay(text) {
  if (text == null) return '';
  let out = String(text);

  // Drop markdown code fences and inline code backticks.
  out = out.replace(/```[\s\S]*?```/g, ' ').replace(/`+/g, '');

  // Drop emphasis tokens but keep the content.
  out = out
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2');

  // Drop leading markdown headings and list bullets.
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '').replace(/^\s*[-*+]\s+/gm, '');

  // Drop most emoji + pictographic code points.
  // Covers BMP miscellaneous symbols and the supplementary emoji planes.
  out = out.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
    ''
  );

  // Newlines → sentence breaks so TTS pauses naturally.
  out = out.replace(/\r\n?/g, '\n').replace(/\n+/g, '. ');

  // Collapse whitespace and double-period artefacts.
  out = out.replace(/\.\s*\./g, '.').replace(/\s{2,}/g, ' ').trim();

  return out;
}

/**
 * Split a long string into TTS-safe chunks at sentence boundaries
 * (or hard-cut at MAX_SAY_CHUNK if a single sentence is too long).
 *
 * @param {string} text
 * @param {number} [maxLen=MAX_SAY_CHUNK]
 * @returns {string[]}
 */
function chunkForSay(text, maxLen = MAX_SAY_CHUNK) {
  const clean = sanitizeForSay(text);
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const chunks = [];
  let buf = '';
  // Split on sentence-ish punctuation while preserving the delimiter.
  const parts = clean.split(/(?<=[.!?])\s+/);

  for (const part of parts) {
    if ((buf + ' ' + part).trim().length > maxLen) {
      if (buf) chunks.push(buf.trim());
      if (part.length > maxLen) {
        // Hard-cut an overlong sentence.
        for (let i = 0; i < part.length; i += maxLen) {
          chunks.push(part.slice(i, i + maxLen));
        }
        buf = '';
      } else {
        buf = part;
      }
    } else {
      buf = (buf + ' ' + part).trim();
    }
  }
  if (buf) chunks.push(buf.trim());
  return chunks;
}

/**
 * Append one or more <Say> verbs to a TwiML node (a VoiceResponse OR a
 * <Gather> sub-node — both expose `.say()`).
 *
 * Long text is automatically chunked into multiple <Say> verbs so we never
 * exceed Twilio's per-verb character limit.
 *
 * @param {object} node   - VoiceResponse or Gather node from the Twilio SDK
 * @param {string} text   - Reply text (typically from the LLM)
 * @param {object} [opts] - Override voice / language on a per-call basis
 * @returns {object} the same node (for chaining)
 */
function appendSay(node, text, opts = {}) {
  const sayOpts = { ...VOICE_DEFAULTS, ...opts };
  for (const chunk of chunkForSay(text)) {
    node.say(sayOpts, chunk);
  }
  return node;
}

module.exports = {
  sanitizeForSay,
  chunkForSay,
  appendSay,
};
