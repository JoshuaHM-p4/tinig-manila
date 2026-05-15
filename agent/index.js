'use strict';

/**
 * Agent module — barrel export.
 *
 * Wraps Tinig Manila's AI brain: Groq client, identity verification,
 * call analytics, and the per-turn response orchestrator.
 *
 * Stack (see README.md → Tech Stack):
 *   - Groq llama-3.3-70b-versatile  → conversational replies
 *   - Groq llama-3.1-8b-instant     → identity extraction + analytics
 *   - prompts/system.js             → Tagalog system prompt + analytics prompt
 *
 * See ./README.md for a full integration guide.
 */

const groq = require('./groq');
const identity = require('./identity');
const analytics = require('./analytics');
const respond = require('./respond');

module.exports = {
  // Stack constants
  MAIN_MODEL: groq.MAIN_MODEL,
  FAST_MODEL: groq.FAST_MODEL,

  // High-level orchestrator
  getTinigResponse: respond.getTinigResponse,
  FALLBACK_REPLY: respond.FALLBACK_REPLY,
  HISTORY_LIMIT: respond.HISTORY_LIMIT,

  // Identity helpers
  extractIdentity: identity.extractIdentity,
  findCallerProfile: identity.findCallerProfile,
  buildDbContext: identity.buildDbContext,
  publicProfile: identity.publicProfile,

  // Analytics helpers
  analyseConversation: analytics.analyseConversation,
  VALID_LABELS: analytics.VALID_LABELS,
  VALID_INTENTS: analytics.VALID_INTENTS,

  // Direct LLM access (for one-off completions / tests)
  chat: groq.chat,
  parseJsonBlob: groq.parseJsonBlob,
  getClient: groq.getClient,
};
