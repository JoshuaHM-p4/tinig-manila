'use strict';

require('dotenv').config();

// ─────────────────────────────────────────────────────────────────────────────
// Optional TLS-verification bypass for corporate/campus networks that perform
// SSL interception (the original symptom we hit during the hackathon).
//
// This is OFF by default. To enable it during local development, set
//   ALLOW_INSECURE_TLS=true
// in backend/.env. It is *force-disabled* whenever NODE_ENV=production so it
// can never silently ship.
// ─────────────────────────────────────────────────────────────────────────────
if (
  process.env.ALLOW_INSECURE_TLS === 'true' &&
  process.env.NODE_ENV !== 'production'
) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn(
    '⚠  ALLOW_INSECURE_TLS=true — TLS certificate verification is DISABLED. ' +
      'Use only for local development on networks with SSL interception.',
  );
} else if (process.env.ALLOW_INSECURE_TLS === 'true') {
  console.warn(
    '⚠  ALLOW_INSECURE_TLS=true was ignored because NODE_ENV=production. ' +
      'TLS verification remains enabled.',
  );
}

const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const twilio = require('twilio');
const path = require('path');
const fs = require('fs');

const {
  speakAndListen,
  speakAndHangup,
  reprompt,
  parseSpeechResult,
  twilioWebhookGuard,
} = require('./voice');

const agent = require('./agent');

// ─────────────────────────────────────────────
// Config & initialisation
// ─────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ─────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────

const DB_PATH = path.join(__dirname, 'db.json');
let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

/**
 * Reload db from disk (useful if we ever hot-patch db.json during demo).
 */
function reloadDb() {
  db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

// ─────────────────────────────────────────────
// In-memory session store
// Map<sessionId, SessionData>
//
// SessionData shape:
// {
//   id: string,
//   channel: 'phone' | 'browser',
//   callSid: string | null,       // Twilio CallSid (phone only)
//   history: Array<{role, content}>,
//   callerProfile: Object | null,
//   dbContext: Object,
//   startTime: Date,
//   lastActivity: Date,
//   intent: string,
//   sentiment: number,
//   sentimentLabel: string,
//   resolved: boolean,
// }
// ─────────────────────────────────────────────

const sessions = new Map();

function createSession(channel = 'browser', callSid = null) {
  const id = callSid || uuidv4();
  const session = {
    id,
    channel,
    callSid,
    history: [],
    callerProfile: null,
    dbContext: {},
    startTime: new Date(),
    lastActivity: new Date(),
    intent: 'general_inquiry',
    sentiment: 50,
    sentimentLabel: 'Neutral',
    resolved: false,
  };
  sessions.set(id, session);
  return session;
}

function getSession(id) {
  return sessions.get(id) || null;
}

function endSession(id) {
  const session = sessions.get(id);
  if (!session) return;
  session.resolved = true;
  session.lastActivity = new Date();

  const durationMs = session.lastActivity - session.startTime;
  const durationSec = Math.round(durationMs / 1000);

  resolvedToday += 1;
  totalResolutionMs += durationMs;

  io.emit('call_ended', {
    sessionId: id,
    channel: session.channel,
    durationSec,
    callerName: session.callerProfile?.name || 'Unknown Caller',
    resolved: true,
  });

  broadcastStats();
  sessions.delete(id);
}

// ─────────────────────────────────────────────
// Stats helpers
// ─────────────────────────────────────────────

let resolvedToday = 0;
let totalResolutionMs = 0;

function computeStats() {
  const activeCalls = [...sessions.values()].filter((s) => !s.resolved).length;
  const avgResolutionSec =
    resolvedToday > 0 ? Math.round(totalResolutionMs / resolvedToday / 1000) : 0;
  return { activeCalls, resolvedToday, avgResolutionSec };
}

function broadcastStats() {
  io.emit('call_stats', computeStats());
}

// ─────────────────────────────────────────────
// Conversational turn (agent + dashboard fan-out)
// ─────────────────────────────────────────────
//
// All AI logic lives in ./agent. This wrapper is the seam where the
// agent's pure return values become WebSocket events for the dashboard.
// Both /api/chat and /twilio/respond go through here so the broadcasts
// stay consistent across channels.
// ─────────────────────────────────────────────

async function runTinigTurn(session, callerMessage) {
  const { reply, newlyVerifiedProfile, analyticsPromise } =
    await agent.getTinigResponse({ session, db, message: callerMessage });

  if (newlyVerifiedProfile) {
    io.emit('caller_profile', {
      sessionId: session.id,
      profile: agent.publicProfile(newlyVerifiedProfile),
    });
  }

  io.emit('transcript', {
    sessionId: session.id,
    channel: session.channel,
    callerName: session.callerProfile?.name || 'Unknown Caller',
    callerMessage,
    tinigReply: reply,
    timestamp: new Date().toISOString(),
  });

  // Broadcast analytics when they land (the agent already swallows its
  // own rejection, but we add a defensive .catch so this never escapes).
  analyticsPromise
    .then((result) => {
      if (!result) return;
      io.emit('analytics_update', {
        sessionId: session.id,
        intent: session.intent,
        sentiment: session.sentiment,
        sentimentLabel: session.sentimentLabel,
      });
    })
    .catch(() => {});

  return reply;
}

// ─────────────────────────────────────────────
// Express app setup
// ─────────────────────────────────────────────

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Required so Twilio signature validation can reconstruct the public URL
// (ngrok / Render / Heroku / Fly all front the app with a TLS-terminating proxy).
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // required for Twilio webhooks

// Serve the built React dashboard (frontend/dist) if it exists.
// In dev, the Vite dev server runs separately on http://localhost:5173.
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
}

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Tinig Manila Backend',
    activeSessions: sessions.size,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// ── TWILIO PHONE ROUTES ───────────────────────
// ─────────────────────────────────────────────
//
// Every webhook is guarded by twilioWebhookGuard() so a third party can't
// POST fake call transcripts to our endpoints. The guard auto-skips when
// NODE_ENV=test or TWILIO_VALIDATE=false.
//
// TwiML generation is delegated to the helpers in ./voice — keep routes
// small and let the voice module own all <Say> / <Gather> details.
// ─────────────────────────────────────────────

const GREETING_TEXT =
  'Magandang araw po! ' +
  'Ako po si Tinig, ang inyong katulong para sa mga serbisyong pang-gobyerno ng Tinig Manila. ' +
  'Paano po kita matutulungan ngayon?';

const SYSTEM_ERROR_TEXT =
  'Pasensya na po, may problema sa aming sistema. Pakisubukan muli mamaya.';

const GROQ_ERROR_TEXT =
  'Pasensya na po, may problema kami sa kasalukuyan. Pakisubukan muli.';

const FAREWELL_PROMPT =
  'Mayroon pa po ba kayong ibang katanungan? Kung wala na, maraming salamat at magpaalam na po.';

/**
 * POST /twilio/incoming
 * Twilio fires this when a call is received.
 * We greet the caller and start listening.
 */
app.post('/twilio/incoming', twilioWebhookGuard(), (req, res) => {
  const callSid = req.body.CallSid || uuidv4();
  const session = createSession('phone', callSid);

  io.emit('call_started', {
    sessionId: session.id,
    channel: 'phone',
    timestamp: new Date().toISOString(),
  });

  broadcastStats();

  const twiml = new VoiceResponse();
  speakAndListen(twiml, GREETING_TEXT, {
    actionUrl: '/twilio/respond',
    silenceText: agent.FALLBACK_REPLY,
  });

  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /twilio/respond
 * Twilio fires this with the caller's speech transcription.
 * We call Groq, then speak the reply and keep listening for the next turn.
 */
app.post('/twilio/respond', twilioWebhookGuard(), async (req, res) => {
  const callSid = req.body.CallSid;
  const session = getSession(callSid);
  const twiml = new VoiceResponse();

  if (!session) {
    speakAndHangup(twiml, SYSTEM_ERROR_TEXT);
    return res.type('text/xml').send(twiml.toString());
  }

  const { transcript, reliable } = parseSpeechResult(req.body);

  if (!reliable) {
    reprompt(twiml, { actionUrl: '/twilio/respond' });
    return res.type('text/xml').send(twiml.toString());
  }

  let reply;
  try {
    reply = await runTinigTurn(session, transcript);
  } catch (err) {
    console.error('[agent] response error:', err.message);
    reply = GROQ_ERROR_TEXT;
  }

  speakAndListen(twiml, reply, {
    actionUrl: '/twilio/respond',
    silenceText: FAREWELL_PROMPT,
  });

  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /twilio/status
 * Twilio fires this on every call status transition (StatusCallback).
 * We tear the session down on any terminal status.
 */
app.post('/twilio/status', twilioWebhookGuard(), (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(callStatus)) {
    endSession(callSid);
  }

  res.sendStatus(204);
});

/**
 * POST /twilio/fallback
 * Configure this as the "Primary handler fails" fallback URL in the
 * Twilio Console. If /twilio/incoming or /twilio/respond ever errors,
 * Twilio will retry against this endpoint so the caller hears something
 * polite instead of dead air.
 */
app.post('/twilio/fallback', twilioWebhookGuard(), (req, res) => {
  const twiml = new VoiceResponse();
  speakAndHangup(twiml, SYSTEM_ERROR_TEXT);
  res.type('text/xml').send(twiml.toString());
});

// ─────────────────────────────────────────────
// ── BROWSER CHAT API ─────────────────────────
// ─────────────────────────────────────────────

/**
 * GET /api/session/new
 * Creates a new browser chat session.
 * Returns { sessionId }
 */
app.get('/api/session/new', (req, res) => {
  const session = createSession('browser');

  io.emit('call_started', {
    sessionId: session.id,
    channel: 'browser',
    timestamp: new Date().toISOString(),
  });

  broadcastStats();

  res.json({ sessionId: session.id });
});

/**
 * POST /api/chat
 * Browser demo endpoint.
 * Body: { message: string, sessionId: string }
 * Returns: { reply: string, callerProfile: object|null, intent: string, sentiment: number, sentimentLabel: string }
 */
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' });
  }

  let session = getSession(sessionId);

  if (!session) {
    // Auto-create session if somehow lost
    session = createSession('browser');
    session.id = sessionId;
    sessions.set(sessionId, session);
  }

  let reply;
  try {
    reply = await runTinigTurn(session, message);
  } catch (err) {
    console.error('[agent] response error:', err.message);
    reply = agent.FALLBACK_REPLY;
  }

  res.json({
    reply,
    callerProfile: agent.publicProfile(session.callerProfile),
    intent: session.intent,
    sentiment: session.sentiment,
    sentimentLabel: session.sentimentLabel,
  });
});

/**
 * POST /api/session/end
 * Manually end a browser session.
 * Body: { sessionId: string }
 */
app.post('/api/session/end', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) endSession(sessionId);
  res.sendStatus(204);
});

/**
 * GET /api/stats
 * Returns current stats snapshot for dashboard polling fallback.
 */
app.get('/api/stats', (_req, res) => {
  res.json(computeStats());
});

/**
 * GET /api/db/reload
 * Hot-reload the JSON database (useful during demo).
 */
app.get('/api/db/reload', (_req, res) => {
  try {
    reloadDb();
    res.json({ ok: true, message: 'Database reloaded from disk.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// SPA fallback — serve index.html for any non-API GET so React Router
// (BrowserRouter) can handle deep links and page refreshes in production.
// Only registered when a built frontend exists; otherwise dev requests
// fall through to Express's default 404 as before.
// ─────────────────────────────────────────────

if (fs.existsSync(FRONTEND_DIST)) {
  const INDEX_HTML = path.join(FRONTEND_DIST, 'index.html');

  app.get('*', (req, res, next) => {
    // Never shadow API, Twilio webhooks, WebSocket upgrade, or health endpoints.
    if (
      req.path.startsWith('/api/') ||
      req.path.startsWith('/twilio/') ||
      req.path.startsWith('/socket.io/') ||
      req.path === '/health'
    ) {
      return next();
    }
    res.sendFile(INDEX_HTML, (err) => {
      if (err) next(err);
    });
  });
}

// ─────────────────────────────────────────────
// WebSocket connection handling
// ─────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] Dashboard connected: ${socket.id}`);

  // Send current stats immediately on connect so a fresh dashboard
  // sees real numbers instead of zeros.
  socket.emit('call_stats', computeStats());

  socket.on('disconnect', () => {
    console.log(`[WS] Dashboard disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────
// 404 + error handlers (must be registered LAST)
// ─────────────────────────────────────────────

app.use((req, res, _next) => {
  // Twilio webhooks expect TwiML on success; an unknown POST from Twilio
  // would otherwise get a JSON body that the caller can't hear. Return a
  // polite TwiML hangup for unknown /twilio/* paths.
  if (req.path.startsWith('/twilio/')) {
    const twiml = new VoiceResponse();
    speakAndHangup(twiml, SYSTEM_ERROR_TEXT);
    return res.type('text/xml').status(404).send(twiml.toString());
  }
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[express] unhandled error:', err);

  if (req.path.startsWith('/twilio/')) {
    const twiml = new VoiceResponse();
    speakAndHangup(twiml, SYSTEM_ERROR_TEXT);
    return res.type('text/xml').status(500).send(twiml.toString());
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

const server = httpServer.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║         TINIG MANILA — Backend Server                ║');
  console.log('║         Ang Tinig Ninyo, Aming Maririnig             ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Env:       ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Server:    http://${HOST}:${PORT}`);
  console.log(`  Health:    http://${HOST}:${PORT}/health`);
  console.log(`  Chat API:  POST http://${HOST}:${PORT}/api/chat`);
  console.log(`  Twilio:    POST http://${HOST}:${PORT}/twilio/incoming`);
  console.log('');
  console.log('  Twilio Webhooks (set in Twilio Console):');
  console.log('    Incoming: https://<public-host>/twilio/incoming');
  console.log('    Status:   https://<public-host>/twilio/status');
  console.log('    Fallback: https://<public-host>/twilio/fallback');
  console.log('');

  if (!process.env.GROQ_API_KEY) {
    console.warn('  [warn] GROQ_API_KEY not set — AI responses will fail.');
  }
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.warn('  [warn] TWILIO_ACCOUNT_SID not set — phone calls will not work.');
  }
  if (!process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VALIDATE !== 'false') {
    console.warn(
      '  [warn] TWILIO_AUTH_TOKEN not set — Twilio webhook signature validation will be skipped.'
    );
  }

  console.log('');
});

// ─────────────────────────────────────────────
// Graceful shutdown — needed so PaaS (Render, Fly, Heroku, K8s) can
// drain in-flight calls instead of cutting them mid-sentence.
// ─────────────────────────────────────────────

function shutdown(signal) {
  console.log(`\n[server] received ${signal}, shutting down gracefully...`);

  const forceTimer = setTimeout(() => {
    console.error('[server] graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  io.close(() => console.log('[server] socket.io closed'));

  server.close((err) => {
    if (err) {
      console.error('[server] error during close:', err);
      process.exit(1);
    }
    console.log('[server] http closed, bye.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] uncaught exception:', err);
});
