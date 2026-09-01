# F1 Telemetry Hub — Rebuild as a Modern Web App

## What your app is today

A Windows desktop race assistant for EA SPORTS F1 25 / F1 2026 that listens to the game's UDP telemetry (port 20777) and turns it into:

- **Solo Engineer** — live command banner (ATTACK / DEFEND / BOX…), "Why am I losing time?" diagnosis, delta + micro-sectors, timing, ERS, tyre and fuel panels, race pace tracking
- **Split Screen** — two local players on one shared session
- **Pre-Race** — circuit/distance/tyre/weather selection, Brendon Leigh setup library, ranked pit plans
- **Live Strategy** — ranked pit strategies with rejoin prediction, wear projections, confidence
- **Sessions & Reports** — lap-by-lap history, stint degradation, decision timeline, exports
- **Driver Profile** — per-session-type learning (TT / Practice / Quali / Race), track-specific strengths
- **Championship & Race Control** — standings, phase handling (SC/VSC/red flag)

The Python code is solid but the experience is a basic WebView desktop window. We'll rebuild it as a polished, fast, beautiful **web app** that keeps every feature and adds a far better visual design.

## How the web version will work

Browsers can't read UDP packets directly, so the plan has two modes:

1. **Demo / Simulation mode (works instantly)** — a realistic live race simulator drives all dashboards with synthetic 60 Hz telemetry (20 cars, tyre wear, ERS, weather, safety cars). Everything is explorable with zero setup. Also great for showcasing the app.
2. **Live mode via a small bridge** — a single lightweight Python script (`bridge.py`, derived from your existing telemetry parser) runs next to the game, listens on UDP 20777, and forwards decoded telemetry to the web app over WebSocket. Clear setup instructions built into the app.

## Design direction

Dark "pit wall at night" aesthetic: near-black surfaces, race-red accent, telemetry-green/amber status colors, tabular racing numerals, subtle scanline/grid textures, glowing live indicators. Distinct typography (condensed display + mono for data). Fully responsive, desktop-first dashboard that fits 1920×1080 without scrolling, collapsing cleanly on smaller screens.

## Pages

1. **Live / Solo Engineer** (`/`) — command banner, loss diagnosis, delta + micro-sector strip, timing tower, car state (ERS/fuel/damage), four-corner tyre card, race pace graph, pit window call
2. **Split Screen** (`/split`) — two drivers side by side
3. **Pre-Race** (`/pre-race`) — race setup wizard + setup values + ranked pit plans
4. **Strategy** (`/strategy`) — ranked alternative strategies with projected time, finish wear, rejoin, confidence
5. **Sessions** (`/sessions`) — session list + full report view (laps, sectors, stints, timeline)
6. **Driver Profile** (`/profile`) — learned strengths/weaknesses per session type and per track
7. **Championship** (`/championship`) — driver/constructor standings

## Technical plan

- Port the core engines from Python to TypeScript: strategy engine, pace tracker/outlier filtering, delta + micro-sectors, ERS/tyre call logic, race-control state machine, loss diagnosis
- Track data (circuit info, projected track maps, setup library) ported to typed JSON/TS modules
- Demo mode: seeded simulation engine producing believable live sessions; Session reports persist in the database (Lovable Cloud) so Sessions/Profile accumulate history
- Live mode: `bridge.py` (single file, derived from `f1_26_split_telemetry.py`) + WebSocket ingest endpoint + "Connection" panel showing WAITING/LIVE status, packet rate, and setup instructions
- Every route gets proper SEO head metadata

## Build order

1. Design system + app shell (sidebar nav, top status bar, fonts, tokens)
2. Demo simulation engine (shared data layer all pages consume)
3. Live / Solo Engineer dashboard
4. Strategy + Pre-Race pages
5. Sessions + Driver Profile + Championship
6. Split Screen
7. Live telemetry bridge + connection panel
8. Polish: animations, responsiveness, SEO metadata, final review
