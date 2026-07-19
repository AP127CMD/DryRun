# Nu's Dry Run (AP127_DryRun) — Claude Code Context

DA40 CS cross-country **chair-flight (dry run) trainer** for CATC Hua Hin student pilot.
Static site + one CF Pages Function (password gate) — no build step, no framework.

- **Live:** https://ap127-dryrun.pages.dev (CF Pages, direct upload — NOT git-integrated)
- **GitHub:** AP127CMD/DryRun
- **Deploy:** `npx wrangler pages deploy /Users/nugui/AP127_DryRun --project-name ap127-dryrun --branch main`

## Auth
`functions/_middleware.js` — password gate, HMAC-signed 30-day HttpOnly cookie `nudr_auth`.
Password = Pages secret `DRYRUN_PASSWORD` (fallback default `NuDA40-1907` in the file).
Change: `printf 'X' | npx wrangler pages secret put DRYRUN_PASSWORD --project-name ap127-dryrun` + redeploy.
Local python server serves NO functions → app opens without login in dev (by design).

## Files
- `index.html` — all markup, 6 tabs (DRY RUN·MAP / NAV LOG / ATC / G1000 / PERF·W&B / LESSONS)
- `js/data.js` — ALL content: airports (VTPH/VTBP/VTBK), 4 routes with waypoints+comments+reporting
  points, ATC scripts per route (ground/enroute[frac]/arrival), in-flight activities, phase
  checklists, lessons, DA40 CS perf + W&B (SAMPLE values, disclaimered)
- `js/app.js` — Leaflet map (Esri sat tiles), draw/divert modes, nav-log build+localStorage
  recording, sim engine (setInterval, NOT rAF — background-tab safe), event modals, TTS,
  perf/fuel/W&B calcs, lessons
- `js/edit.js` — EDIT tab: aircraft/route/waypoint/ATC-script/VOR editors (write-through to
  DATA + `saveDATA()`), FPL text parser (`lat,lon` or `VOR/RDL/DIST`, alt+spd+RP flags),
  config export/import/reset, advanced JSON editor
- `js/g1000.js` — canvas PFD (tapes/AI/HSI+CDI), `G1000.set(state)` API
- `css/style.css` — glass-cockpit theme, B612 fonts, magenta=active-route (G1000 convention)

## Key decisions
- Sim driven by `setInterval` + real-clock dt (cap 1 s) so throttled/background tabs keep pace
- `autoFit` flag: map auto-fits active route on resize until user touches the map
  (fixes hidden-tab-load → wrong zoom)
- Nav log records to `localStorage` key `navlog:<routeId>`; drawn waypoints in `userWpts`
- Wind triangle + VAR 0.5°W computed in `routeLegs()`; per-waypoint `spd` overrides cruise TAS
- **Config layer**: `data.js` builds factory defaults, then `nudryrun:config` (localStorage)
  replaces DATA in place; `saveDATA()`/`resetDATA()`; map notes in `mapNotes` key
- PDF export = print-to-PDF: `exportPDF()` fills `#brief`, body class `printing-brief`,
  print CSS shows only the brief
- All hours language = block time (durMin)

## Verify after changes
1. `python3 -m http.server 7455 --directory /Users/nugui/AP127_DryRun` (or launch.json `ap127-dryrun`)
2. Load page — no console errors; map fits route XC-1; press START → ATIS modal chain →
   airborne; at ~14% posrep builder modal fires
3. NAV LOG tab: table populated, inputs persist after reload
4. PERF tab: W&B canvas painted, fuel plan totals sane
5. Deploy, then spot-check live URL
