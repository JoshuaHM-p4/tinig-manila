# Tinig Manila — Dashboard

React + Vite + Tailwind frontend for the Tinig Manila AI voice hotline.

## Run

From this folder:

```bash
npm install
npm run dev      # http://localhost:5173
```

Or from the repo root:

```bash
npm run dev      # starts backend + frontend together
```

The Vite dev server proxies `/api`, `/socket.io`, `/twilio`, and `/health` to the
Express backend on `http://localhost:3000` (see `vite.config.js`).

## Structure

```
src/
├── App.jsx                       Routes
├── main.jsx                      Entry point
├── index.css                     Tailwind + design tokens
├── components/
│   ├── Mascot.jsx                Pixel-art bluebird mascot
│   ├── StatCard.jsx              KPI card
│   ├── SentimentMeter.jsx        Gradient sentiment bar
│   ├── CallerProfileCard.jsx     Caller identity card
│   ├── ActiveCallsList.jsx       Live calls sidebar list
│   ├── TranscriptView.jsx        Chat bubble transcript
│   ├── LiveFeed.jsx              Rolling transcript feed
│   └── layout/
│       ├── AppShell.jsx          Sidebar + topbar wrapper
│       ├── Sidebar.jsx           Brand + nav
│       └── TopBar.jsx            Page title + connection status
├── pages/
│   ├── Dashboard.jsx             Live ops overview
│   ├── Demo.jsx                  Chat with Tinig in browser
│   ├── Analytics.jsx             Intent + sentiment charts
│   └── About.jsx                 Mission, tech, team
├── hooks/
│   ├── useSocket.js              Socket connection + events
│   └── useDashboardStore.js      Centralised live state
└── lib/
    ├── api.js                    REST client
    ├── socket.js                 socket.io-client instance
    └── format.js                 Duration/time/intent helpers
```

## Theme

Theme tokens live in `tailwind.config.js`:

- `colors.flag.{blue, blue-deep, red, yellow, ...}` — Philippine flag palette
- `colors.sky.{50…900}` — mascot blue scale
- `colors.cream.{50…200}` — warm off-white surfaces
- `colors.ink.{DEFAULT, soft, muted}` — text colors
- `boxShadow.{soft, pop, pixel, pixel-sm}` — depth + pixel-art aesthetic
- `animation.{bobble, wiggle, pulse-ring, fade-up, shimmer}` — mascot life

Fonts (loaded via Google Fonts in `index.html`):
- `Inter` (sans), `Fraunces` (display), `Press Start 2P` (pixel accents).

## Build

```bash
npm run build      # outputs to dist/
```

After building, the Express backend will auto-serve `frontend/dist` from
`http://localhost:3000`, so production deployment is a single Node process.
