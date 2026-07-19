# Nu's Dry Run — DA40 Cross-Country Chair-Flight Trainer

Interactive web app for **dry-running (chair-flying) VFR cross-country training flights**
out of Hua Hin (VTPH) in the DA40 CS, built for the AP127 ecosystem (CATC Hua Hin).

**Live:** https://ap127-dryrun.pages.dev

> ⚠ **Training aid only — not for real-world navigation.** All frequencies, coordinates
> and performance figures are illustrative; verify with current AIP Thailand, NOTAMs and
> the aircraft AFM.

## Routes
| # | Route | Cruise |
|---|-------|--------|
| XC-1 | VTPH → VTBP (Bang Phra) via Cha-am · Phetchaburi · Mae Klong · Samut Sakhon · Chao Phraya mouth · Si Racha | 4,500 ft |
| XC-2 | VTBP → VTPH (return) | 5,500 ft |
| XC-3 | VTPH → VTBK (Kamphaeng Saen) via Cha-am · Phetchaburi · Ratchaburi · Nakhon Pathom | 4,500 ft |
| XC-4 | VTBK → VTPH (return) | 5,500 ft |

## Features
- **DRY RUN · MAP** — Esri satellite map (Leaflet), magenta active route with named
  waypoints, compulsory **reporting points** (blue squares), per-waypoint briefing
  comments, airport rings with freqs. **DRAW mode**: click to add your own waypoints
  with comments (draggable, saved to localStorage, exportable). **DIVERT tool**: click
  anywhere → magenta heading/distance/ETE/fuel for a diversion from present position.
- **Simulator** — full chair flight at 1–16×: aircraft flies the route with climb/cruise/
  descent profile; ATC calls, position-report prompts, FREDA/GS-check/diversion/rough-engine
  **in-flight interactive activities** fire at the correct positions and pause the sim.
  Speech synthesis plays the ATC side.
- **NAV LOG** — auto-computed legs (MC, HDG with wind triangle, GS, ETE, ETO, fuel) plus
  **recordable columns** (ATO ✎, actual fuel ✎, remarks ✎, sim-time stamp ⏱), persisted
  per route; printable.
- **ATC / RADIO** — the complete radio script per flight (ground → en-route → arrival)
  with PLAY (TTS) and hidden model readbacks; frequency cards.
- **G1000** — live PFD (tapes, AI, HSI with magenta CDI) driven by the sim, FPL page,
  knob-flow drills (Direct-To, FPL, CDI, NRST, OBS).
- **PERF · W&B** — DA40 CS V-speeds, MAP/RPM cruise table, distances, fuel planner per
  route/power setting, mass & balance calculator with live CG envelope plot.
- **LESSONS** — 6 structured dry-run lessons + all phases of flight as checkable
  DA40 training-flow checklists (progress saved locally).

### v2 additions
- **EDIT tab** — everything is configurable and saved (localStorage + export/import JSON):
  aircraft parameters, routes & waypoints (add/delete/reorder/rename), the complete **ATC
  radio scripts** per route, the VOR table, and the raw dataset (perf/checklists/lessons).
- **Map notes** — free-placed notes on the satellite map: add (🗒 NOTE mode), edit, drag,
  resize (S/M/L), recolor, delete; included in the PDF brief.
- **FPL-style route input** — type a flight plan as text: `ID POSITION [ALT] [SPD] [RP] [# note]`
  where POSITION is `lat,lon` or **VOR/RADIAL/DIST** (e.g. `HHN/030/12`); parses into a saved
  route with altitude/speed changes the simulator and nav log respect.
- **PDF export** — one-click flight brief (nav log incl. recorded ATO/fuel/remarks, waypoint
  briefing, frequencies, full radio script, map notes) via print-to-PDF.
- **Password gate** — Cloudflare Pages Function middleware (`functions/_middleware.js`):
  HMAC-signed 30-day HttpOnly cookie; password in the `DRYRUN_PASSWORD` project secret.
  Change it: `printf 'NewPass' | npx wrangler pages secret put DRYRUN_PASSWORD --project-name ap127-dryrun`
  then redeploy.

## Stack / deploy
Static HTML/CSS/JS (Leaflet + B612 fonts from CDN, no build step) + one Pages Function for auth.

```bash
npx wrangler pages deploy /Users/nugui/AP127_DryRun --project-name ap127-dryrun --branch main
```

Part of the AP127 ecosystem — see https://ap127-docs.pages.dev
