'use strict';

/**
 * Default voice + speech-recognition settings for Tinig Manila.
 *
 * One file → one source of truth. If we ever swap voices or tweak timeouts,
 * change them here and every TwiML helper picks it up.
 *
 * All values are free-tier Twilio primitives — no extra API keys required.
 *   - <Say voice="Google.fil-PH-Standard-A">  → built-in Filipino TTS
 *   - <Gather input="speech" language="fil-PH"> → built-in Filipino STT
 */

const VOICE_DEFAULTS = Object.freeze({
  voice: 'Google.fil-PH-Standard-A',
  language: 'fil-PH',
});

const GATHER_DEFAULTS = Object.freeze({
  input: 'speech',
  language: 'fil-PH',
  speechTimeout: 'auto',
  timeout: 8,
  method: 'POST',
  // speechModel: 'phone_call' is the default for Twilio's speech recognition,
  // optimised for narrowband audio. Override per-call if needed.
});

/**
 * Default confidence floor below which we treat the Twilio transcript as
 * unreliable and reprompt instead of forwarding to the LLM.
 */
const MIN_SPEECH_CONFIDENCE = 0.3;

/**
 * Maximum length of a single <Say> chunk. Twilio's hard limit is 4096 chars;
 * we stay well under to avoid edge cases and keep TTS responsive.
 */
const MAX_SAY_CHUNK = 3000;

module.exports = {
  VOICE_DEFAULTS,
  GATHER_DEFAULTS,
  MIN_SPEECH_CONFIDENCE,
  MAX_SAY_CHUNK,
};
