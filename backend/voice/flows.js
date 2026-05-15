'use strict';

const { appendSay } = require('./tts');
const { appendGather } = require('./stt');

/**
 * Composed TwiML flows — the patterns the API-route developer will use most.
 *
 * These wrap the STT/TTS primitives so a route handler can be one or two
 * lines:
 *
 *   const twiml = new VoiceResponse();
 *   speakAndListen(twiml, replyText, { actionUrl: '/twilio/respond' });
 *   res.type('text/xml').send(twiml.toString());
 */

/**
 * Speak some text and then listen for the caller's next utterance.
 *
 * The <Say> is nested *inside* the <Gather> so the caller can barge in over
 * the prompt — important for senior callers who already know what they want
 * and don't need to hear the whole bot speak first.
 *
 * Also appends a fallback <Say> + final <Gather> outside the first <Gather>
 * so the call doesn't dead-end if the caller stays silent.
 *
 * @param {object} twiml         - VoiceResponse from the Twilio SDK
 * @param {string} promptText    - What Tinig should speak
 * @param {object} opts
 * @param {string} opts.actionUrl - URL Twilio posts the next transcript to
 * @param {string} [opts.silenceText]
 *   Fallback message when the caller stays silent for the whole gather window.
 *   Defaults to a polite Tagalog reprompt.
 * @param {object} [opts.gatherOptions] - Override <Gather> attributes
 * @param {object} [opts.voiceOptions]  - Override <Say> attributes
 * @returns {object} the twiml response (for chaining)
 */
function speakAndListen(twiml, promptText, opts) {
  const {
    actionUrl,
    silenceText = 'Pasensya na po, hindi ko narinig. Maaari po bang ulitin?',
    gatherOptions = {},
    voiceOptions = {},
  } = opts || {};

  if (!actionUrl) {
    throw new Error('speakAndListen: opts.actionUrl is required');
  }

  const gather = appendGather(twiml, { actionUrl, ...gatherOptions });
  appendSay(gather, promptText, voiceOptions);

  // If the first gather times out with no speech, reprompt once and listen
  // again before letting the call drop.
  appendSay(twiml, silenceText, voiceOptions);
  appendGather(twiml, { actionUrl, ...gatherOptions });

  return twiml;
}

/**
 * Speak a closing message and hang up.
 *
 * @param {object} twiml
 * @param {string} text
 * @param {object} [voiceOptions]
 */
function speakAndHangup(twiml, text, voiceOptions = {}) {
  appendSay(twiml, text, voiceOptions);
  twiml.hangup();
  return twiml;
}

/**
 * Reprompt the caller — used when STT confidence is too low or the transcript
 * is empty. Wraps the reprompt text in a new <Gather> so we keep listening.
 *
 * @param {object} twiml
 * @param {object} opts
 * @param {string} opts.actionUrl
 * @param {string} [opts.text]
 * @param {object} [opts.gatherOptions]
 * @param {object} [opts.voiceOptions]
 */
function reprompt(twiml, opts) {
  const {
    actionUrl,
    text = 'Pasensya na po, hindi ko narinig. Maaari po bang ulitin?',
    gatherOptions = {},
    voiceOptions = {},
  } = opts || {};

  if (!actionUrl) {
    throw new Error('reprompt: opts.actionUrl is required');
  }

  const gather = appendGather(twiml, { actionUrl, ...gatherOptions });
  appendSay(gather, text, voiceOptions);
  return twiml;
}

module.exports = {
  speakAndListen,
  speakAndHangup,
  reprompt,
};
