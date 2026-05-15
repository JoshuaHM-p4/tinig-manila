'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Groq = require('groq-sdk');
const twilio = require('twilio');
const path = require('path');
const fs = require('fs');

const {
  buildTinigSystemPrompt,
  IDENTITY_EXTRACTION_PROMPT,
  ANALYTICS_PROMPT,
} = require('./prompts/system');

// ─────────────────────────────────────────────
// Config & initialisation
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_FAST_MODEL = 'llama-3.1-8b-instant'; // used for identity extraction & analytics

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

  io.emit('call_ended', {
    sessionId: id,
    channel: session.channel,
    durationSec,
    callerName: session.callerProfile?.name || 'Unknown Caller',
    resolved: true,
  });

  updateStatsBar();
  sessions.delete(id);
}

// ─────────────────────────────────────────────
// Stats helpers
// ─────────────────────────────────────────────

let resolvedToday = 0;
let totalResolutionMs = 0;

function updateStatsBar() {
  resolvedToday++;
  const activeCalls = [...sessions.values()].filter((s) => !s.resolved).length;
  const avgSec =
    resolvedToday > 0 ? Math.round(totalResolutionMs / resolvedToday / 1000) : 0;

  io.emit('call_stats', {
    activeCalls,
    resolvedToday,
    avgResolutionSec: avgSec,
  });
}

// ─────────────────────────────────────────────
// Identity verification
// ─────────────────────────────────────────────

/**
 * Attempt to extract name + birthdate from a caller's message using the fast LLM.
 * Returns { name, birthdate, confidence } or null on failure.
 */
async function extractIdentity(message) {
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_FAST_MODEL,
      messages: [
        { role: 'system', content: IDENTITY_EXTRACTION_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fuzzy-match extracted identity against db.json accounts.
 * Returns the full account record or null.
 */
function findCallerProfile(name, birthdate) {
  if (!name) return null;

  const normalise = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .trim();

  const normName = normalise(name);

  for (const account of db.egovph_accounts) {
    const dbName = normalise(account.name);

    // Name match: exact or both-direction substring
    const nameMatch =
      dbName === normName ||
      dbName.includes(normName) ||
      normName.includes(dbName);

    if (!nameMatch) continue;

    // Birthdate match (if provided)
    if (birthdate) {
      // Try ISO date comparison
      const bdMatch = account.birthdate === birthdate;

      // Try alias comparison
      const normBd = normalise(birthdate);
      const aliasMatch = (account.birthdate_aliases || []).some(
        (a) => normalise(a) === normBd || normBd.includes(normalise(a))
      );

      if (bdMatch || aliasMatch) return account;

      // Partial year/month/day match from ISO string
      const parts = account.birthdate.split('-'); // ['1952','01','20']
      const yearMatch = birthdate.includes(parts[0]);
      const monthNames = [
        '', 'enero', 'pebrero', 'marso', 'abril', 'mayo', 'hunyo',
        'hulyo', 'agosto', 'setyembre', 'oktubre', 'nobyembre', 'disyembre',
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
      ];
      const monthIdx = parseInt(parts[1], 10);
      const monthTagalog = monthNames[monthIdx] || '';
      const monthEng = monthNames[monthIdx + 12] || '';
      const dayNum = parseInt(parts[2], 10).toString();

      const monthMatch =
        normBd.includes(monthTagalog) ||
        normBd.includes(monthEng) ||
        normBd.includes(parts[1]);
      const dayMatch = normBd.includes(dayNum) || normBd.includes(parts[2]);

      if (yearMatch && monthMatch) return account;
      if (monthMatch && dayMatch) return account;
    } else {
      // Name-only match (lower confidence, still proceed for demo)
      return account;
    }
  }

  return null;
}

/**
 * Build the dbContext object for a verified caller.
 */
function buildDbContext(accountId) {
  return {
    benefits: db.senior_benefits[accountId] || null,
    health: db.health_services[accountId] || null,
    appointments: db.appointment_booking[accountId] || null,
    barangay: db.barangay_services[accountId] || null,
    egovphInfo: db.egovph_info,
  };
}

// ─────────────────────────────────────────────
// Analytics (fire-and-forget)
// ─────────────────────────────────────────────

async function analyseAndBroadcast(session, callerMessage) {
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_FAST_MODEL,
      messages: [
        { role: 'system', content: ANALYTICS_PROMPT },
        { role: 'user', content: callerMessage },
      ],
      temperature: 0.1,
      max_tokens: 80,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const { intent, sentiment, sentiment_label: sentimentLabel } = JSON.parse(jsonMatch[0]);

    session.intent = intent || session.intent;
    session.sentiment = typeof sentiment === 'number' ? sentiment : session.sentiment;
    session.sentimentLabel = sentimentLabel || session.sentimentLabel;

    io.emit('analytics_update', {
      sessionId: session.id,
      intent: session.intent,
      sentiment: session.sentiment,
      sentimentLabel: session.sentimentLabel,
    });
  } catch {
    // Non-critical — silently swallow
  }
}

// ─────────────────────────────────────────────
// Core AI response generator
// ─────────────────────────────────────────────

/**
 * Given a session and a new caller message, produce Tinig's response.
 *
 * Side-effects:
 *  - Updates session.history
 *  - Updates session.callerProfile if identity verified for the first time
 *  - Emits WebSocket events: transcript, caller_profile, analytics_update
 *
 * @returns {string} Tinig's spoken response (plain text, no markdown).
 */
async function getTinigResponse(session, callerMessage) {
  session.lastActivity = new Date();

  // ── Identity verification check ──────────────────────────────────────────
  if (!session.callerProfile) {
    const extracted = await extractIdentity(callerMessage);

    if (extracted && (extracted.name || extracted.birthdate)) {
      const profile = findCallerProfile(extracted.name, extracted.birthdate);

      if (profile) {
        session.callerProfile = profile;
        session.dbContext = buildDbContext(profile.id);

        // Broadcast profile to dashboard
        io.emit('caller_profile', {
          sessionId: session.id,
          profile: {
            name: profile.name,
            egovphStatus: profile.egovph_status,
            seniorCitizenId: profile.senior_citizen_id,
            city: profile.city,
            barangay: profile.barangay,
            registeredServices: profile.registered_services,
            preferredLanguage: profile.preferred_language,
          },
        });
      }
    }
  }

  // ── Build messages array ──────────────────────────────────────────────────
  const systemPrompt = buildTinigSystemPrompt(
    session.callerProfile,
    session.dbContext
  );

  const messages = [
    { role: 'system', content: systemPrompt },
    ...session.history,
    { role: 'user', content: callerMessage },
  ];

  // ── Call Groq ─────────────────────────────────────────────────────────────
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 300,
  });

  const reply = completion.choices[0]?.message?.content?.trim() ||
    'Pasensya na po, hindi ko narinig. Maaari po bang ulitin?';

  // ── Update history ────────────────────────────────────────────────────────
  session.history.push({ role: 'user', content: callerMessage });
  session.history.push({ role: 'assistant', content: reply });

  // Keep history manageable (last 20 turns = 40 messages)
  if (session.history.length > 40) {
    session.history = session.history.slice(-40);
  }

  // ── Broadcast transcript to dashboard ────────────────────────────────────
  io.emit('transcript', {
    sessionId: session.id,
    channel: session.channel,
    callerName: session.callerProfile?.name || 'Unknown Caller',
    callerMessage,
    tinigReply: reply,
    timestamp: new Date().toISOString(),
  });

  // ── Fire analytics in background ─────────────────────────────────────────
  analyseAndBroadcast(session, callerMessage).catch(() => {});

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // required for Twilio webhooks

// Serve static files from project root (for index.html / dashboard.html later)
app.use(express.static(path.join(__dirname)));

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

/**
 * POST /twilio/incoming
 * Twilio fires this when a call is received.
 * We greet the caller and start listening.
 */
app.post('/twilio/incoming', (req, res) => {
  const callSid = req.body.CallSid || uuidv4();

  const session = createSession('phone', callSid);

  io.emit('call_started', {
    sessionId: session.id,
    channel: 'phone',
    timestamp: new Date().toISOString(),
  });

  updateStatsBar();

  const twiml = new VoiceResponse();

  const greeting =
    'Magandang araw po! ' +
    'Ako po si Tinig, ang inyong katulong para sa mga serbisyong pang-gobyerno ng Tinig Manila. ' +
    'Paano po kita matutulungan ngayon?';

  const gather = twiml.gather({
    input: 'speech',
    language: 'fil-PH',
    action: '/twilio/respond',
    method: 'POST',
    speechTimeout: 'auto',
    timeout: 8,
  });

  gather.say({ voice: 'Google.fil-PH-Standard-A', language: 'fil-PH' }, greeting);

  // Fallback if no speech detected
  twiml.say(
    { voice: 'Google.fil-PH-Standard-A', language: 'fil-PH' },
    'Pasensya na po, hindi ko narinig. Tatawagin po kayo muli.'
  );
  twiml.hangup();

  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /twilio/respond
 * Twilio fires this with the caller's speech transcription.
 * We call Groq, then speak the reply.
 */
app.post('/twilio/respond', async (req, res) => {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult || '';
  const confidence = parseFloat(req.body.Confidence || '0');

  const session = getSession(callSid);
  const twiml = new VoiceResponse();

  if (!session) {
    twiml.say(
      { voice: 'Google.fil-PH-Standard-A', language: 'fil-PH' },
      'Pasensya na po, may problema sa aming sistema. Pakisubukan muli.'
    );
    twiml.hangup();
    return res.type('text/xml').send(twiml.toString());
  }

  if (!speechResult || confidence < 0.3) {
    const gather = twiml.gather({
      input: 'speech',
      language: 'fil-PH',
      action: '/twilio/respond',
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 8,
    });
    gather.say(
      { voice: 'Google.fil-PH-Standard-A', language: 'fil-PH' },
      'Pasensya na po, hindi ko narinig. Maaari po bang ulitin?'
    );
    return res.type('text/xml').send(twiml.toString());
  }

  let reply;
  try {
    reply = await getTinigResponse(session, speechResult);
  } catch (err) {
    console.error('Groq error:', err.message);
    reply = 'Pasensya na po, may problema kami sa kasalukuyan. Pakisubukan muli.';
  }

  const gather = twiml.gather({
    input: 'speech',
    language: 'fil-PH',
    action: '/twilio/respond',
    method: 'POST',
    speechTimeout: 'auto',
    timeout: 10,
  });

  gather.say({ voice: 'Google.fil-PH-Standard-A', language: 'fil-PH' }, reply);

  // Fallback after silence
  twiml.say(
    { voice: 'Google.fil-PH-Standard-A', language: 'fil-PH' },
    'Mayroon pa po ba kayong ibang katanungan? Kung wala na, maraming salamat at magpaalam na po.'
  );
  twiml.gather({
    input: 'speech',
    language: 'fil-PH',
    action: '/twilio/respond',
    method: 'POST',
    speechTimeout: 'auto',
    timeout: 6,
  });

  res.type('text/xml').send(twiml.toString());
});

/**
 * POST /twilio/status
 * Twilio fires this when a call ends (StatusCallback).
 */
app.post('/twilio/status', (req, res) => {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  if (['completed', 'failed', 'busy', 'no-answer'].includes(callStatus)) {
    endSession(callSid);
  }

  res.sendStatus(204);
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

  updateStatsBar();

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
    reply = await getTinigResponse(session, message);
  } catch (err) {
    console.error('Groq error:', err.message);
    reply = 'Pasensya na po, may problema kami sa kasalukuyan. Pakisubukan muli.';
  }

  res.json({
    reply,
    callerProfile: session.callerProfile
      ? {
          name: session.callerProfile.name,
          egovphStatus: session.callerProfile.egovph_status,
          seniorCitizenId: session.callerProfile.senior_citizen_id,
          city: session.callerProfile.city,
          barangay: session.callerProfile.barangay,
          registeredServices: session.callerProfile.registered_services,
        }
      : null,
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
  const activeCalls = [...sessions.values()].filter((s) => !s.resolved).length;
  const avgSec =
    resolvedToday > 0 ? Math.round(totalResolutionMs / resolvedToday / 1000) : 0;

  res.json({
    activeCalls,
    resolvedToday,
    avgResolutionSec: avgSec,
  });
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
// WebSocket connection handling
// ─────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[WS] Dashboard connected: ${socket.id}`);

  // Send current stats immediately on connect
  const activeCalls = [...sessions.values()].filter((s) => !s.resolved).length;
  socket.emit('call_stats', {
    activeCalls,
    resolvedToday,
    avgResolutionSec:
      resolvedToday > 0 ? Math.round(totalResolutionMs / resolvedToday / 1000) : 0,
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Dashboard disconnected: ${socket.id}`);
  });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║         TINIG MANILA — Backend Server                ║');
  console.log('║         Ang Tinig Ninyo, Aming Maririnig             ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Server:    http://localhost:${PORT}`);
  console.log(`  Health:    http://localhost:${PORT}/health`);
  console.log(`  Chat API:  POST http://localhost:${PORT}/api/chat`);
  console.log(`  Twilio:    POST http://localhost:${PORT}/twilio/incoming`);
  console.log('');
  console.log('  Twilio Webhooks (set in Twilio Console):');
  console.log('    Incoming: https://<ngrok-url>/twilio/incoming');
  console.log('    Status:   https://<ngrok-url>/twilio/status');
  console.log('');

  if (!process.env.GROQ_API_KEY) {
    console.warn('  ⚠  GROQ_API_KEY not set — AI responses will fail.');
  }
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.warn('  ⚠  TWILIO_ACCOUNT_SID not set — phone calls will not work.');
  }

  console.log('');
});
