# Tinig Manila

> **Ang Tinig Ninyo, Aming Maririnig.**
> A toll-free AI voice hotline for Filipino senior citizens — powered by Groq, Twilio, and eGovPH.

Tinig Manila is a hackathon MVP that lets any senior pick up a phone, dial a toll-free number, and access government services through a natural Tagalog/Taglish conversation — no app, no OTP, no queue. A real-time React dashboard visualizes every live call.

---

## Project structure

```
tinig-manila/
├── backend/                  Node.js + Express + Socket.io API
│   ├── prompts/system.js     System prompts for Groq (Tagalog/Taglish)
│   ├── db.json               Mock eGovPH database (no real API calls)
│   ├── server.js             Twilio webhooks, REST API, WebSocket bus
│   ├── package.json
│   └── .env.example          Copy to .env and fill in your keys
│
├── frontend/                 React + Vite + Tailwind dashboard
│   ├── public/
│   │   ├── logo.png
│   │   ├── mascot.png
│   │   └── mascot-flying.png
│   ├── src/
│   │   ├── components/       Reusable UI (Mascot, StatCard, Transcript…)
│   │   │   └── layout/       AppShell, Sidebar, TopBar
│   │   ├── pages/            Dashboard, Demo, Analytics, About
│   │   ├── hooks/            useSocket, useDashboardStore
│   │   ├── lib/              api.js, socket.js, format.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js        Proxies /api, /socket.io → :3000
│   └── package.json
│
├── package.json              Monorepo orchestrator (concurrently)
├── .gitignore
└── README.md
```

---

## Quick start

> Requires **Node 18+**.

```bash
# 1. From the repo root, install everything (root + backend + frontend):
npm run install:all

# 2. Configure backend secrets
cp backend/.env.example backend/.env
# Edit backend/.env and add your GROQ_API_KEY (free at https://console.groq.com)

# 3. Start both servers together
npm run dev
```

After `npm run dev`:

- **Dashboard** → http://localhost:5173
- **Backend API** → http://localhost:3000
- **Health check** → http://localhost:3000/health

The Vite dev server proxies `/api/*`, `/socket.io`, `/twilio/*`, and `/health` to the Express backend, so the React app can use same-origin fetch and websocket calls.

---

## What's in the dashboard

The React frontend has four routes, all themed around the Tinig mascot (the blue Philippine bluebird) and the Philippine flag palette (blue · red · yellow · white).

| Route          | What it shows                                                                |
| -------------- | ---------------------------------------------------------------------------- |
| `/`            | **Dashboard** — live stats, active calls, transcripts, caller profile panel |
| `/demo`        | **Demo Chat** — talk to Tinig directly in the browser (no Twilio bill)       |
| `/analytics`   | **Analytics** — intent bar chart, sentiment pie, recent calls table          |
| `/about`       | **About** — mission, tech stack, team                                        |

### Real-time wiring

The dashboard listens to the backend over Socket.io and reacts to:

- `call_started` — new call (phone or browser) → appears in Active Calls
- `transcript` — every turn → live feed + selected call transcript
- `caller_profile` — identity verified → fills the profile card
- `analytics_update` — intent + sentiment refreshed each turn
- `call_ended` — moved into the recent calls history
- `call_stats` — drives the stat cards

---

## Available scripts (root)

| Script                 | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Run **backend + frontend** together (hot reload)      |
| `npm run dev:backend`  | Backend only (Express + nodemon on :3000)             |
| `npm run dev:frontend` | Frontend only (Vite on :5173)                         |
| `npm run build`        | Production build of the React dashboard               |
| `npm run start`        | Run the backend in production mode                    |
| `npm run install:all`  | `npm install` in root, `backend/`, and `frontend/`    |

After `npm run build`, the Express backend will automatically serve the compiled dashboard from `frontend/dist` — so a single `npm start` is enough for deployment.

---

## Backend (recap)

- **Server**: `backend/server.js` — Express + Socket.io
- **AI**: Groq Llama-3.3-70B (main) + Llama-3.1-8B-Instant (identity + analytics)
- **Telephony**: Twilio Voice (`<Gather>` STT + `<Say>` Filipino TTS)
- **Data**: mock `db.json` simulating eGovPH service responses

Endpoints:

| Method | Path                  | Purpose                                  |
| ------ | --------------------- | ---------------------------------------- |
| POST   | `/twilio/incoming`    | Twilio webhook — call received           |
| POST   | `/twilio/respond`     | Twilio webhook — speech transcript ready |
| POST   | `/twilio/status`      | Twilio webhook — call ended              |
| GET    | `/api/session/new`    | Start a browser chat session             |
| POST   | `/api/chat`           | Send a message to Tinig (browser)        |
| POST   | `/api/session/end`    | End a browser session                    |
| GET    | `/api/stats`          | Stats snapshot for polling fallback      |
| GET    | `/api/db/reload`      | Hot-reload `db.json` during demo         |
| GET    | `/health`             | Health check                             |

---

## Twilio + ngrok (optional, for the real phone hotline)

The dashboard works perfectly without Twilio — use `/demo` to interact via the browser.

To wire a real Twilio number to your laptop:

```bash
# 1. Start the backend (port 3000)
npm run dev:backend

# 2. In another shell, expose it to the internet
ngrok http 3000
# Copy the https://....ngrok-free.app URL

# 3. In the Twilio Console → your phone number → Voice configuration:
#    • A CALL COMES IN → Webhook  →  https://<ngrok>/twilio/incoming   (POST)
#    • CALL STATUS CHANGES → Webhook → https://<ngrok>/twilio/status   (POST)
```

Now call your Twilio number from any phone and talk to Tinig.

---

## Design system

- **Palette**: Philippine flag — `#0038A8` (blue) · `#CE1126` (red) · `#FCD116` (yellow) · `#FFFFFF`
- **Fonts**:
  - `Inter` — body
  - `Fraunces` — display headings
  - `Press Start 2P` — pixel accents (matches the mascot's retro pixel-art style)
- **Mascot**: bilingual bluebird with the Philippine sun on its chest. Used as `<Mascot variant="idle" />` and `<Mascot variant="flying" />` from `src/components/Mascot.jsx`.

All design tokens live in `frontend/tailwind.config.js` (`colors.flag`, `colors.sky`, `colors.cream`, `colors.ink`).

---

## License

MIT — see [LICENSE](./LICENSE).
