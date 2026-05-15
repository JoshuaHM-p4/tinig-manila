'use strict';

const { GATHER_DEFAULTS, MIN_SPEECH_CONFIDENCE } = require('./config');

/**
 * Speech-to-Text helpers for Twilio's built-in <Gather input="speech"> verb.
 *
 * Twilio handles the entire STT pipeline server-side and posts back a form
 * payload containing `SpeechResult` and `Confidence` to whatever `action`
 * URL we register. The route developer just reads `req.body.SpeechResult`.
 */

/**
 * Append a <Gather input="speech"> to a TwiML response.
 *
 * @param {object} twiml        - VoiceResponse from the Twilio SDK
 * @param {object} [opts]       - Override gather attributes
 * @param {string} [opts.actionUrl]
 *   URL Twilio will POST the transcript to (e.g. '/twilio/respond').
 *   Maps to the TwiML `action` attribute.
 * @returns {object} The Gather node, so you can `.say(...)` inside it or
 *   chain more verbs. (Speaking inside the Gather is the common pattern —
 *   the caller can barge in over the prompt instead of waiting for it.)
 */
function appendGather(twiml, opts = {}) {
  const { actionUrl, ...rest } = opts;
  const attrs = { ...GATHER_DEFAULTS, ...rest };
  if (actionUrl) attrs.action = actionUrl;
  return twiml.gather(attrs);
}

/**
 * Extract a clean STT result from a Twilio webhook request body.
 *
 * Twilio posts `SpeechResult` (transcript) and `Confidence` (0..1) on every
 * <Gather input="speech"> callback. This helper normalises both and decides
 * whether the transcript is reliable enough to forward to the LLM.
 *
 * @param {object} reqBody          - req.body from an Express handler
 * @param {object} [opts]
 * @param {number} [opts.minConfidence=MIN_SPEECH_CONFIDENCE]
 * @returns {{
 *   transcript: string,
 *   confidence: number,
 *   reliable: boolean,
 *   empty: boolean,
 * }}
 */
function parseSpeechResult(reqBody = {}, opts = {}) {
  const minConfidence = opts.minConfidence ?? MIN_SPEECH_CONFIDENCE;
  const transcript = (reqBody.SpeechResult || '').toString().trim();
  const confidence = parseFloat(reqBody.Confidence ?? '0') || 0;
  const empty = transcript.length === 0;
  const reliable = !empty && confidence >= minConfidence;
  return { transcript, confidence, reliable, empty };
}

module.exports = {
  appendGather,
  parseSpeechResult,
};
