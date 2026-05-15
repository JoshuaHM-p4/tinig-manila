'use strict';

/**
 * Voice module — barrel export.
 *
 * Tinig Manila's Twilio STT (<Gather input="speech">) and TTS (<Say>) helpers.
 * All free-tier — no API keys beyond TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.
 *
 * See ./README.md for a full integration guide for API-route developers.
 */

const config = require('./config');
const tts = require('./tts');
const stt = require('./stt');
const flows = require('./flows');
const security = require('./security');

module.exports = {
  // Config (read-only defaults)
  ...config,

  // TTS
  appendSay: tts.appendSay,
  sanitizeForSay: tts.sanitizeForSay,
  chunkForSay: tts.chunkForSay,

  // STT
  appendGather: stt.appendGather,
  parseSpeechResult: stt.parseSpeechResult,

  // Composed flows
  speakAndListen: flows.speakAndListen,
  speakAndHangup: flows.speakAndHangup,
  reprompt: flows.reprompt,

  // Security
  twilioWebhookGuard: security.twilioWebhookGuard,
};
