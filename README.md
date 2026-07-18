# AP127 DRY RUN — DA40 Cross-Country Chair-Flight Trainer

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

## Stack / deploy
Pure static (HTML/CSS/JS, Leaflet + B612 fonts from CDN, no build step).

```bash
npx wrangler pages deploy /Users/nugui/AP127_DryRun --project-name ap127-dryrun --branch main
```

Part of the AP127 ecosystem — see https://ap127-docs.pages.dev
