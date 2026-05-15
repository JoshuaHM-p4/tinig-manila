# `voice/` — Twilio STT + TTS module

Reusable helpers for Tinig's phone hotline. Wraps Twilio's built-in **Speech
Recognition** (`<Gather input="speech" language="fil-PH">`) and **TTS**
(`<Say voice="Google.fil-PH-Standard-A">`) so route handlers stay short.

**100% free-tier.** No new env vars beyond what `.env.example` already lists.

---

## Required env vars (no new ones)

The module uses the credentials already documented in `.env.example`:

| Variable | What for | Where to get it |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | Identifies your Twilio account on outbound API calls | [Twilio Console](https://console.twilio.com) → top of dashboard |
| `TWILIO_AUTH_TOKEN` | Verifies that inbound webhooks really came from Twilio (signature validation) | Same Console page — click "View" |
| `TWILIO_PHONE_NUMBER` | The number you bought with your trial credit | Console → Phone Numbers → Active Numbers |

The TTS voice (`Google.fil-PH-Standard-A`) and the speech recogniser
(`fil-PH`) are **TwiML primitives** — they bill against your normal Twilio
trial credit and need no extra API key.

Optional flags:

| Variable | Effect |
|---|---|
| `TWILIO_VALIDATE=false` | Skip webhook signature checks (local dev only — never set in prod) |
| `NODE_ENV=test` | Also skips signature checks |

---

## Quick start

```js
const { VoiceResponse } = require('twilio').twiml;
const {
  speakAndListen,
  speakAndHangup,
  reprompt,
  parseSpeechResult,
  twilioWebhookGuard,
} = require('./voice');

// Verify every Twilio webhook before doing anything else.
app.post('/twilio/incoming', twilioWebhookGuard(), (req, res) => {
  const twiml = new VoiceResponse();
  speakAndListen(twiml, 'Magandang araw po! Paano po kita matutulungan?', {
    actionUrl: '/twilio/respond',
  });
  res.type('text/xml').send(twiml.toString());
});

app.post('/twilio/respond', twilioWebhookGuard(), async (req, res) => {
  const twiml = new VoiceResponse();
  const { transcript, reliable } = parseSpeechResult(req.body);

  if (!reliable) {
    reprompt(twiml, { actionUrl: '/twilio/respond' });
    return res.type('text/xml').send(twiml.toString());
  }

  const reply = await getTinigResponse(session, transcript); // your LLM call
  speakAndListen(twiml, reply, { actionUrl: '/twilio/respond' });
  res.type('text/xml').send(twiml.toString());
});
```

---

## API reference

### TTS

```js
const { appendSay, sanitizeForSay, chunkForSay } = require('./voice');
```

#### `appendSay(node, text, opts?)`
Appends one or more `<Say>` verbs to a `VoiceResponse` **or** a `<Gather>`
sub-node. Long replies are auto-chunked at sentence boundaries so we stay
under Twilio's per-verb limit.

- `node` — Twilio TwiML node with a `.say()` method
- `text` — raw reply (sanitized internally)
- `opts.voice` / `opts.language` — override `Google.fil-PH-Standard-A` / `fil-PH`

#### `sanitizeForSay(text) → string`
Strips markdown, emojis, and newlines from LLM output so the TTS reads
naturally. (Defense-in-depth; the system prompt already tells Tinig not to
emit markdown, but LLMs slip occasionally.)

#### `chunkForSay(text, maxLen?) → string[]`
Splits at sentence boundaries; hard-cuts only if a single sentence exceeds
`maxLen` (default 3000 chars).

### STT

```js
const { appendGather, parseSpeechResult } = require('./voice');
```

#### `appendGather(twiml, opts?) → GatherNode`
Appends a `<Gather input="speech">` with Tinig's defaults
(`language: 'fil-PH'`, `speechTimeout: 'auto'`, `timeout: 8`, `method: 'POST'`).
Pass `actionUrl` to set the webhook target. Returns the Gather node so you
can `.say()` *inside* it (lets the caller barge in over the prompt).

#### `parseSpeechResult(req.body, opts?)`
Reads `SpeechResult` + `Confidence` from a Twilio webhook payload and
returns:

```js
{
  transcript: string,   // trimmed
  confidence: number,   // 0..1
  reliable: boolean,    // !empty && confidence >= minConfidence
  empty:    boolean,
}
```

Default `minConfidence` is `0.3` (defined in `voice/config.js`). Treat
`!reliable` results as "ask the caller to repeat" rather than forwarding
gibberish to the LLM.

### Composed flows (most common)

```js
const { speakAndListen, speakAndHangup, reprompt } = require('./voice');
```

#### `speakAndListen(twiml, text, { actionUrl, silenceText?, gatherOptions?, voiceOptions? })`
The default Tinig turn: speak a line, then listen for the caller's next
utterance. Includes a built-in silence fallback that reprompts once before
letting the call drop.

#### `speakAndHangup(twiml, text, voiceOptions?)`
For closing messages.

#### `reprompt(twiml, { actionUrl, text?, gatherOptions?, voiceOptions? })`
For low-confidence / empty transcripts.

### Security

```js
const { twilioWebhookGuard } = require('./voice');

app.post('/twilio/incoming', twilioWebhookGuard(), handler);
```

Express middleware that validates the `X-Twilio-Signature` header on every
inbound webhook using `TWILIO_AUTH_TOKEN`. Behind ngrok or a load balancer
it reconstructs the public URL from `X-Forwarded-Proto` / `X-Forwarded-Host`,
which is what Twilio actually signed.

It auto-skips when `NODE_ENV=test` or `TWILIO_VALIDATE=false`.

### Config

```js
const {
  VOICE_DEFAULTS,
  GATHER_DEFAULTS,
  MIN_SPEECH_CONFIDENCE,
  MAX_SAY_CHUNK,
} = require('./voice');
```

Read-only defaults. Change them in `voice/config.js` if Tinig ever needs a
different voice or different timeouts — every helper picks the change up
automatically.

---

## Why this module exists

The original `server.js` wired `twiml.say(...)` and `twiml.gather(...)` directly
into route handlers, with the voice ID and language repeated at every call
site. As we add more turn flows (greeting, identity verification, post-verify
service answers, escalation, hangup), that duplication becomes a place where
defaults silently drift apart. This module is the single source of truth so
the API-route developer can focus on conversation flow, not TwiML attributes.
