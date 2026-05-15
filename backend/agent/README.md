# `agent/` — Tinig's AI brain

Reusable helpers for Tinig's conversational layer. Wraps the **Groq stack**
described in the project README (`llama-3.3-70b-versatile` for replies,
`llama-3.1-8b-instant` for fast classification) and consumes the prompts
defined in `prompts/system.js`.

This module is **transport-agnostic** — it does not import socket.io,
express, or twilio. The caller (typically `server.js`) handles all
broadcasts and HTTP responses.

---

## Required env vars (no new ones)

Same as `.env.example`:

| Variable | What for | Where to get it |
|---|---|---|
| `GROQ_API_KEY` | Authenticates every LLM call | [console.groq.com](https://console.groq.com) → API Keys |

That's it. The system prompt, identity prompt, and analytics prompt are
all bundled in `prompts/system.js` — no other configuration is needed.

---

## Quick start

```js
const agent = require('./agent');

// Wherever you handle a new caller utterance:
const { reply, newlyVerifiedProfile, analyticsPromise } =
  await agent.getTinigResponse({ session, db, message });

// `reply` — Tinig's spoken response (plain text, no markdown — safe for TTS)
speak(reply);

// `newlyVerifiedProfile` — set ONLY on the turn identity is first verified
if (newlyVerifiedProfile) {
  dashboard.emit('caller_profile', {
    sessionId: session.id,
    profile: agent.publicProfile(newlyVerifiedProfile),
  });
}

// `analyticsPromise` — resolves AFTER getTinigResponse returns. Mutates
// session.intent / .sentiment / .sentimentLabel on success. Attach a
// .then() if you want to broadcast the values; the helper already
// suppresses its own rejection.
analyticsPromise.then((a) => {
  if (a) dashboard.emit('analytics_update', { sessionId: session.id, ...a });
});
```

---

## API reference

### Orchestrator

```js
const { getTinigResponse, FALLBACK_REPLY, HISTORY_LIMIT } = require('./agent');
```

#### `getTinigResponse({ session, db, message }) → { reply, newlyVerifiedProfile, analyticsPromise }`

Runs one full turn. The `session` object **is mutated**:

- `session.lastActivity` ← now
- `session.history` ← appended (and trimmed to `HISTORY_LIMIT` messages = ~20 turns)
- `session.callerProfile` ← set on first successful verification
- `session.dbContext` ← set on first successful verification
- `session.intent / .sentiment / .sentimentLabel` ← set when `analyticsPromise` resolves

Throws on Groq network / auth / rate-limit errors so the caller can pick
the user-facing fallback text. Use `FALLBACK_REPLY` if you want the same
polite default we use internally.

### Identity

```js
const {
  extractIdentity,
  findCallerProfile,
  buildDbContext,
  publicProfile,
} = require('./agent');
```

#### `extractIdentity(message) → { name, birthdate, confidence } | null`
Calls the fast LLM with `IDENTITY_EXTRACTION_PROMPT` and returns parsed JSON,
or `null` on network / parse failure.

#### `findCallerProfile(db, name, birthdate) → Account | null`
Fuzzy-matches against `db.egovph_accounts`. Tolerant of the many ways a
Filipino senior says their birthdate ("Enero beinte", "January 20", ISO).

#### `buildDbContext(db, accountId) → { benefits, health, appointments, barangay, egovphInfo }`
Pulls per-service mock data for the verified account. Anything not
registered for the account comes back as `null` (the system prompt
template skips empty sections).

#### `publicProfile(account) → SafeProfile | null`
Strips PII not safe for the dashboard / API response (phone, emergency
contact). Use this whenever you broadcast or return a profile.

### Analytics

```js
const { analyseConversation, VALID_INTENTS, VALID_LABELS } = require('./agent');
```

#### `analyseConversation(message) → { intent, sentiment, sentimentLabel } | null`
Calls the fast LLM with `ANALYTICS_PROMPT`. Returns sanitised values:

- `intent` ∈ `VALID_INTENTS` (or `null` if the LLM hallucinated a new one)
- `sentiment` clamped to `[0, 100]`
- `sentimentLabel` ∈ `VALID_LABELS` (or `null`)

You usually don't call this directly — `getTinigResponse` already kicks
it off in parallel and exposes the promise.

### Direct LLM access

```js
const { chat, parseJsonBlob, MAIN_MODEL, FAST_MODEL, getClient } = require('./agent');

const text = await chat({
  model: MAIN_MODEL,
  messages: [
    { role: 'system', content: 'Reply in Tagalog only.' },
    { role: 'user', content: 'Hello po' },
  ],
  temperature: 0.7,
  max_tokens: 200,
});
```

`chat()` is a thin wrapper around `groq.chat.completions.create()`. It
trims the returned content and lets network / 4xx / 5xx errors bubble.

`parseJsonBlob(text)` is the JSON extractor used by identity + analytics —
useful when you write a new fast-model classifier.

`getClient()` returns the shared Groq SDK instance (lazy-constructed on
first use; safe to call even when `GROQ_API_KEY` is unset — actual API
calls will fail but the module won't crash at require-time).

---

## Why this module exists

Before extraction, `server.js` mixed three concerns: HTTP routing, TwiML
generation, and LLM orchestration. Each call to `extractIdentity`,
`findCallerProfile`, and `analyseAndBroadcast` lived inline alongside
the Express handlers — meaning the brain was tangled with the body.

This split lets:

- **`voice/`** own all Twilio TwiML primitives.
- **`agent/`** own all Groq calls and identity logic.
- **`server.js`** stay thin: route → call `agent` / `voice` helpers → respond.

Adding new flows (e.g. an SMS channel, a Slack channel, a webhook for a
3rd-party Filipino welfare app) becomes a matter of wiring a new
transport — the brain stays put.
