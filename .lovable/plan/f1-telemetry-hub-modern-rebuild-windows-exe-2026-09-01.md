# F1 Telemetry Hub — Modern Rebuild + Windows .exe

## What your app is today

A Windows desktop race assistant for EA SPORTS F1 25 / F1 2026 that listens to the game's UDP telemetry (port 20777) and turns it into:

- **Solo Engineer** — live command banner (ATTACK / DEFEND / BOX…), "Why am I losing time?" diagnosis, delta + micro-sectors, timing, ERS, tyre and fuel panels, race pace tracking
- **Split Screen** — two local players on one shared session
- **Pre-Race** — circuit/distance/tyre/weather selection, Brendon Leigh setup library, ranked pit plans
- **Live Strategy** — ranked pit strategies with rejoin prediction, wear projections, confidence
- **Sessions & Reports** — lap-by-lap history, stint degradation, decision timeline, exports
- **Driver Profile** — per-session-type learning (TT / Practice / Quali / Race), track-specific strengths
- **Championship & Race Control** — standings, phase handling (SC / VSC / red flag)

The engine logic is solid; the experience is a plain WebView window. We rebuild the whole front end as a fast, beautiful app and ship it both as a web app and as a real Windows `.exe`.

## Two ways to run it

1. **Web app** — everything works in the browser, driven by a realistic built-in race simulator (20 cars, tyre wear, ERS, weather, safety cars) so every screen is explorable with zero setup.
2. **Desktop `.exe`** — the same app packaged with Electron. The desktop build has a real advantage: it can open UDP port 20777 itself, so it reads live telemetry straight from the game with **no Python, no bridge script, no install steps**. Just launch the exe, enable UDP telemetry in F1, and it goes LIVE.

## Visual refurbishment

A committed "pit wall at night" direction, replacing the current flat WebView look:

- Near-black layered surfaces with subtle carbon-weave and grid texture, thin luminous dividers
- Race-red primary accent, telemetry green/amber/red status scale, compound-accurate tyre colors
- Condensed display typeface for headings and calls, tabular mono numerals for all live data so digits never jitter
- Glowing LIVE pulse, animated delta bar, sweeping micro-sector strip, rev-light style header bar
- Motion: numbers roll, the command banner slams in on change, panels stagger on mount — fast and mechanical, never bouncy
- Density-first dashboard that fits 1920×1080 without scrolling, degrading cleanly to smaller windows

Before building, I'll show you 3 rendered design directions for the main cockpit dashboard so you pick the look.

## Pages

1. **Live / Solo Engineer** (`/`) — command banner, loss diagnosis, delta + micro-sector strip, timing tower, car state (ERS / fuel / damage), four-corner tyre card, race-pace graph, pit call
2. **Split Screen** (`/split`) — two drivers side by side
3. **Pre-Race** (`/pre-race`) — race context wizard, setup values, ranked pit plans
4. **Strategy** (`/strategy`) — ranked alternatives with projected time, finish wear, rejoin, confidence, evidence
5. **Sessions** (`/sessions`) — session list and full report (laps, sectors, stints, decision timeline)
6. **Driver Profile** (`/profile`) — learned strengths and weaknesses per session type and per track
7. **Championship** (`/championship`) — driver and constructor standings

## Technical plan

- Port the core engines from Python to TypeScript: strategy optimizer, pace tracker with outlier filtering, delta and micro-sectors, ERS/tyre call logic, race-control state machine, loss diagnosis
- Track data, projected track maps, and the setup library ported to typed modules
- Simulation engine as the shared data layer so every page has believable live data
- Session history persisted locally (IndexedDB) so Sessions and Driver Profile accumulate across runs — the desktop app stays fully offline
- Electron packaging: `electron/main.cjs` opens a `dgram` UDP socket on 20777, decodes F1 25 / 2026 packets, and streams them to the UI over IPC; Vite built with `base: './'`
- Windows build produced with `@electron/packager --platform=win32`, delivered as a zip containing `F1TelemetryHub.exe` (unsigned; Windows SmartScreen will need "Run anyway" the first time)
- Every route gets proper SEO head metadata

## Build order

1. Design directions for the cockpit, then the design system and app shell
2. Simulation engine + shared telemetry store
3. Live / Solo Engineer dashboard
4. Strategy and Pre-Race
5. Sessions, Driver Profile, Championship
6. Split Screen
7. Electron shell with native UDP listener + connection panel (WAITING / LIVE, packet rate, setup guide)
8. Package the Windows `.exe`, polish, responsiveness, metadata
