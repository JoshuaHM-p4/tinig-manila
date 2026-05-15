# Tinig Manila 🇵🇭
**Ang Tinig Ninyo, Aming Maririnig**
*Toll-Free AI Voice Hotline for Filipino Senior Citizens*

---

## What This Is

Tinig Manila is a backend server that powers **Tinig** — a conversational Tagalog AI agent that helps Filipino senior citizens access eGovPH government services by simply calling any phone.

Two modes:
- **Phone hotline** — real callers dial a Twilio number, speak naturally in Tagalog/Taglish, and get spoken responses via Twilio's built-in Filipino TTS.
- **Browser demo** — a web page uses the Web Speech API to capture voice, sends it to `/api/chat`, and speaks the AI reply with the browser's built-in TTS.

Everything is **free-tier only** — Groq (free AI), Twilio trial ($15.50 credit), no paid APIs.

---

## Quick Start

### 1. Get your free API keys

| Service | How to get | Cost |
|---------|-----------|------|
| **Groq** | Sign up at [console.groq.com](https://console.groq.com) → API Keys → Create | Free (14,400 req/day) |
| **Twilio** | Sign up at [twilio.com](https://twilio.com) → get Account SID + Auth Token | Free trial ($15.50 credit) |
| **Twilio Phone Number** | Twilio Console → Phone Numbers → Buy a Number (use trial credit) | ~$1/month from trial credit |

### 2. Clone and install

```bash
git clone <your-repo-url>
cd tinig-manila
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in your GROQ_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
```

### 4. Start the server

```bash
npm start
# or, for development with auto-restart:
npm run dev
```

You should see:
```
╔══════════════════════════════════════════════════════╗
║         TINIG MANILA — Backend Server                ║
║         Ang Tinig Ninyo, Aming Maririnig             ║
╚══════════════════════════════════════════════════════╝

  Server:    http://localhost:3000
  Health:    http://localhost:3000/health
  Chat API:  POST http://localhost:3000/api/chat
  Twilio:    POST http://localhost:3000/twilio/incoming
```

### 5. Expose your server for Twilio (ngrok)

Twilio needs a public HTTPS URL to fire webhooks to your local server.

```bash
# Install ngrok from https://ngrok.com (free account required)
ngrok http 3000
```

Copy the HTTPS URL (e.g. `https://abcd1234.ngrok-free.app`).

### 6. Configure Twilio webhooks

1. Go to [Twilio Console](https://console.twilio.com) → Phone Numbers → Manage → Active Numbers
2. Click your phone number
3. Under **Voice & Fax** → **A Call Comes In**:
   - Webhook: `https://abcd1234.ngrok-free.app/twilio/incoming`
   - Method: `HTTP POST`
4. Under **Call Status Changes**:
   - Webhook: `https://abcd1234.ngrok-free.app/twilio/status`
   - Method: `HTTP POST`
5. Save.

### 7. Make the demo call

Dial your Twilio number from any phone. Tinig will greet you in Tagalog!

---

## API Reference

### Browser Chat

#### `GET /api/session/new`
Creates a new chat session.

**Response:**
```json
{ "sessionId": "uuid-here" }
```

#### `POST /api/chat`
Send a message and get Tinig's reply.

**Request:**
```json
{
  "message": "Pwede ko bang malaman ang aking senior benefits?",
  "sessionId": "uuid-here"
}
```

**Response:**
```json
{
  "reply": "Para po matulungan ko kayo, maaari po bang malaman ang inyong buong pangalan at kaarawan?",
  "callerProfile": null,
  "intent": "senior_benefits",
  "sentiment": 55,
  "sentimentLabel": "Neutral"
}
```

After identity verification (`callerProfile` will be populated):
```json
{
  "reply": "Aktibo po ang inyong eGovPH account. Naka-enroll kayo sa Social Pension...",
  "callerProfile": {
    "name": "Rosa Dela Cruz",
    "egovphStatus": "VERIFIED",
    "seniorCitizenId": "SC-2025-45821",
    "city": "Batangas City",
    "barangay": "Barangay San Isidro",
    "registeredServices": ["Senior Benefits", "Health Assistance", "Appointment Booking", "Barangay Services"]
  },
  "intent": "senior_benefits",
  "sentiment": 75,
  "sentimentLabel": "Content"
}
```

#### `POST /api/session/end`
End a session.

**Request:**
```json
{ "sessionId": "uuid-here" }
```

#### `GET /api/stats`
Get current call statistics.

**Response:**
```json
{ "activeCalls": 1, "resolvedToday": 3, "avgResolutionSec": 134 }
```

### Utilities

#### `GET /health`
Server health check.

#### `GET /api/db/reload`
Hot-reload `db.json` from disk (useful to patch demo data without restarting).

---

## WebSocket Events (Socket.io)

Connect to the server at `ws://localhost:3000` using Socket.io.

| Event | Direction | Payload |
|-------|-----------|---------|
| `call_started` | Server → Dashboard | `{ sessionId, channel, timestamp }` |
| `transcript` | Server → Dashboard | `{ sessionId, channel, callerName, callerMessage, tinigReply, timestamp }` |
| `caller_profile` | Server → Dashboard | `{ sessionId, profile: { name, egovphStatus, seniorCitizenId, city, barangay, registeredServices } }` |
| `analytics_update` | Server → Dashboard | `{ sessionId, intent, sentiment, sentimentLabel }` |
| `call_ended` | Server → Dashboard | `{ sessionId, channel, durationSec, callerName, resolved }` |
| `call_stats` | Server → Dashboard | `{ activeCalls, resolvedToday, avgResolutionSec }` |

---

## Demo Script (Hackathon 13-Step Flow)

1. Start server: `npm start`
2. Run ngrok: `ngrok http 3000`
3. Set Twilio webhooks to ngrok URL (see Step 6 above)
4. Open dashboard: `http://localhost:3000/dashboard.html` *(coming soon)*
5. Hand judge a phone — dial your Twilio number

**Demo caller: Rosa Dela Cruz**

| Turn | Who | Says |
|------|-----|------|
| 1 | Tinig | "Magandang araw po! Ako po si Tinig..." |
| 2 | Judge | "Pwede ko bang tingnan ang aking senior citizen benefits?" |
| 3 | Tinig | "Para po matulungan ko kayo, maaari po bang malaman ang inyong buong pangalan at kaarawan?" |
| 4 | Judge | "Rosa Dela Cruz, Enero beinte, nineteen fifty-two." |
| 5 | Tinig | "Aktibo po ang inyong eGovPH account. Naka-enroll kayo sa Social Pension na isang libong piso bawat buwan..." |
| 6 | Judge | "May appointment ba ako?" |
| 7 | Tinig | "Mayroon po kayong appointment sa Batangas City Health Center sa Hunyo kinse, alas nuwebe ng umaga..." |

---

## Mock Database — Demo Profiles

| Name | Birthdate | eGovPH Status | City |
|------|-----------|---------------|------|
| **Rosa Dela Cruz** | Enero 20, 1952 | VERIFIED | Batangas City |
| Pedro Santos | Hulyo 4, 1948 | VERIFIED | Quezon City |
| Nena Reyes | Disyembre 8, 1955 | PENDING | Marikina City |
| Ernesto Villanueva | Marso 25, 1950 | VERIFIED | Caloocan City |

**Rosa Dela Cruz** is the primary demo profile — all 5 service categories are fully populated for her.

---

## File Structure

```
tinig-manila/
├── server.js          ← Express + Twilio webhooks + chat API + WebSocket
├── package.json
├── .env.example       ← Copy to .env and fill in keys
├── .env               ← NOT committed to git
├── db.json            ← Mock eGovPH database
├── prompts/
│   └── system.js      ← Tinig's system prompt + analytics prompts
└── README.md
```

---

## Tech Stack (100% Free for Demo)

| Layer | Tool | Why |
|-------|------|-----|
| AI / LLM | Groq (llama-3.3-70b) | Free tier, fast, handles Tagalog |
| Phone | Twilio trial | Free $15.50 credit, inbound calls work |
| Phone TTS | Twilio `<Say voice="Google.fil-PH-Standard-A">` | Built into Twilio, free |
| Phone STT | Twilio `<Gather input="speech" language="fil-PH">` | Built into Twilio, free |
| Browser STT | Web Speech API | Browser native, zero cost |
| Browser TTS | Web Speech Synthesis API | Browser native, zero cost |
| Backend | Node.js + Express | Fast, lightweight |
| Real-time | Socket.io | Live dashboard updates |
| Tunnel | ngrok free tier | Expose localhost to Twilio |
| Database | db.json (hardcoded) | Zero latency, zero cost |

---

*Built for every Filipino. © 2026 Tinig Manila.*
