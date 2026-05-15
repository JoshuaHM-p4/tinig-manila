'use strict';

const { chat, MAIN_MODEL } = require('./groq');
const { buildTinigSystemPrompt } = require('../prompts/system');
const identity = require('./identity');
const analytics = require('./analytics');

/**
 * One conversational turn for Tinig.
 *
 * Owns the LLM call chain — identity check → main reply → analytics —
 * but stays transport-agnostic: this module never imports socket.io,
 * express, or twilio. The caller wires those side-effects.
 */

// Keep ~20 user/assistant turns. Beyond that Groq starts costing latency
// and Tinig forgetting the first turn is fine for a hotline conversation.
const HISTORY_LIMIT = 40;

const FALLBACK_REPLY =
  'Pasensya na po, hindi ko narinig. Maaari po bang ulitin?';

/**
 * Process one caller message and produce Tinig's response.
 *
 * The `session` object is mutated:
 *   - session.lastActivity ← now
 *   - session.history       appended (and trimmed to HISTORY_LIMIT)
 *   - session.callerProfile set on first successful identity verification
 *   - session.dbContext     set on first successful identity verification
 *   - session.intent, session.sentiment, session.sentimentLabel
 *       updated when the analytics promise resolves (NOT before this
 *       function returns — the caller decides whether to wait).
 *
 * @param {Object} params
 * @param {Object} params.session  Session record from server.js
 * @param {Object} params.db       The loaded db.json (eGovPH mock)
 * @param {string} params.message  The caller's utterance
 *
 * @returns {Promise<{
 *   reply: string,
 *   newlyVerifiedProfile: Object|null,
 *   analyticsPromise: Promise<{intent, sentiment, sentimentLabel}|null>,
 * }>}
 */
async function getTinigResponse({ session, db, message }) {
  session.lastActivity = new Date();

  // ── Identity gate ──────────────────────────────────────────────────────
  // Only run the extraction LLM when we don't already have a profile.
  // First successful match in a session unlocks the personalised system
  // prompt for every subsequent turn.
  let newlyVerifiedProfile = null;
  if (!session.callerProfile) {
    const extracted = await identity.extractIdentity(message);
    if (extracted && (extracted.name || extracted.birthdate)) {
      const profile = identity.findCallerProfile(
        db,
        extracted.name,
        extracted.birthdate
      );
      if (profile) {
        session.callerProfile = profile;
        session.dbContext = identity.buildDbContext(db, profile.id);
        newlyVerifiedProfile = profile;
      }
    }
  }

  // ── Main reply ─────────────────────────────────────────────────────────
  const systemPrompt = buildTinigSystemPrompt(
    session.callerProfile,
    session.dbContext
  );
  const messages = [
    { role: 'system', content: systemPrompt },
    ...session.history,
    { role: 'user', content: message },
  ];

  let reply = await chat({
    model: MAIN_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });
  if (!reply) reply = FALLBACK_REPLY;

  // ── History bookkeeping ────────────────────────────────────────────────
  session.history.push({ role: 'user', content: message });
  session.history.push({ role: 'assistant', content: reply });
  if (session.history.length > HISTORY_LIMIT) {
    session.history = session.history.slice(-HISTORY_LIMIT);
  }

  // ── Analytics (parallel, fire-and-forget by default) ───────────────────
  // We start it AFTER the main reply so we never block the caller waiting
  // for analytics. The caller can .then() / await this promise if they
  // want to broadcast the result.
  const analyticsPromise = analytics
    .analyseConversation(message)
    .then((result) => {
      if (result) {
        if (result.intent) session.intent = result.intent;
        if (result.sentiment != null) session.sentiment = result.sentiment;
        if (result.sentimentLabel) {
          session.sentimentLabel = result.sentimentLabel;
        }
      }
      return result;
    });
  // Attach a passive .catch so an analytics failure never becomes an
  // unhandledRejection — callers can still await/catch on their own copy.
  analyticsPromise.catch(() => {});

  return {
    reply,
    newlyVerifiedProfile,
    analyticsPromise,
  };
}

module.exports = {
  getTinigResponse,
  FALLBACK_REPLY,
  HISTORY_LIMIT,
};
