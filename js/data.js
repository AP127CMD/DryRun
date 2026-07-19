/* ============================================================
   AP127 DRY RUN — data layer
   Airports, routes, reporting points, ATC scripts, checklists,
   lessons, DA40 CS performance.
   NOTE: Frequencies, coordinates and performance figures are
   TRAINING/BRIEFING values — always verify against current
   Thai AIP and the aircraft AFM before real flight.
   ============================================================ */

const DATA = {};
DATA.version = 3;   // bump when factory routes/airports change → triggers migration of saved configs

/* ---------- Airports (freqs per Nu's chart drawing) ---------- */
DATA.airports = {
  VTPH: {
    icao: "VTPH", name: "Hua Hin (Home base)", lat: 12.6362, lon: 99.9515,
    elev: 62, rwy: "16/34", rwyLen: "RWY 16: 6890×115 ft (elev 62') · RWY 34: 6398×115 ft (17')",
    freqs: [
      ["ATIS", "126.8"], ["Hua Hin Ground", "121.9"],
      ["Hua Hin Tower", "122.7"], ["Hua Hin Approach", "126.2"],
      ["Hua Hin NDB (HN)", "213"], ["Hua Hin VOR (HHN)", "113.3"]
    ],
    circuit: "LH RWY 16 / RH RWY 34, 1000 ft AAL",
    notes: "CATC home base. Watch airline traffic; coastal winds pick up after 11:00 local."
  },
  VTBP: {
    icao: "VTBP", name: "Prachuap Khiri Khan (Ao Manao)", lat: 11.7885, lon: 99.8046,
    elev: 17, rwy: "18/36 · 08/26", rwyLen: "RWY 18/36: 3445×130 ft (17') · RWY 08/26: 6560×130 ft (17')",
    freqs: [["VTBP Tower", "135.9"], ["VTBP NDB (PJ)", "320"], ["VTBP DME (PCK)", "113.7"]],
    circuit: "As directed by TWR — military field (RTAF Wing 5)",
    notes: "Military airfield at Ao Manao bay. Khao Chong Krachok monkey-mountain N of town, Khao Lom Muak S of the field. Full crisp readbacks; comply with TWR."
  },
  VTBK: {
    icao: "VTBK", name: "Kamphaeng Saen (Nakhon Pathom)", lat: 14.1020, lon: 99.9170,
    elev: 30, rwy: "06/24", rwyLen: "3050 m asphalt",
    freqs: [["Kamphaeng Saen Tower", "118.6"]],
    circuit: "As directed by TWR — military flying training active",
    notes: "RTAF flying training school. Expect military circuit traffic; comply strictly with TWR instructions."
  }
};

/* ---------- VOR / navaid reference (for FPL input, e.g. HHN/030/12) ---------- */
DATA.vors = {
  HHN: { name: "Hua Hin VOR 113.3 (HHN) · NDB 213 (HN)", lat: 12.6362, lon: 99.9515 },
  PCK: { name: "VTBP DME 113.7 (PCK) · NDB 320 (PJ)", lat: 11.7885, lon: 99.8046 },
  BKK: { name: "Bangkok VOR/DME 110.6", lat: 13.6900, lon: 100.7660 },
  RBR: { name: "Ratchaburi (trg ref)", lat: 13.5360, lon: 99.8170 },
  KPS: { name: "Kamphaeng Saen (trg ref)", lat: 14.1020, lon: 99.9170 }
};

/* ---------- Aircraft & callsign ---------- */
DATA.aircraft = {
  type: "DA40 CS", reg: "HS-CTC", callsign: "CATC 274",
  tas: 120,           // planned cruise TAS kt
  climbTas: 75, descentTas: 110,
  climbFpm: 700, descentFpm: 500,
  fuelUsableGal: 39, taxiGal: 1.0, climbGphExtra: 2.0
};

/* ---------- Routes ----------
   Each waypoint: id, name, lat, lon, alt (planned ft), report (compulsory reporting point?),
   comment (briefing note shown on map popup).                                        */
DATA.routes = [
  {
    id: "PH-BP", title: "XC-1  VTPH → VTBP Prachuap (inland: X PT · P PT)",
    cruiseAlt: 2900, dep: "VTPH", dest: "VTBP",
    wpts: [
      { id: "VTPH", name: "Hua Hin",             lat: 12.6362, lon: 99.9515, alt: 62,   report: true,  comment: "Depart RWY 16. Right turn southwest-bound, track 238° to X Point. Per plan: 2700 ft." },
      { id: "XPT",  name: "X Point",             lat: 12.5873, lon: 99.8738, alt: 2700, report: true,  comment: "X POINT — 6 NM out on track 238°. Road/rail west of the Hua Hin hills. Turn left onto 171°, level 2700." },
      { id: "PPT",  name: "P Point (Pran Buri)", lat: 12.3935, lon: 99.8984, alt: 2700, report: true,  comment: "P POINT — Pran Buri: Highway 4 junction; disused Pran Buri airstrip (NOT USABLE) NW of town, Khai Thanarat S. Report, then turn onto 190° for the 36 NM leg, climb 2900." },
      { id: "VTBP", name: "Prachuap Khiri Khan", lat: 11.7885, lon: 99.8046, alt: 17,  report: true,  comment: "Prachuap (Ao Manao), RTAF Wing 5. Khao Chong Krachok N of town, Khao Lom Muak S of field. TWR 135.9 — expect RWY 18/36 or 08/26 per TWR." }
    ]
  },
  {
    id: "BP-PH", title: "XC-2  VTBP → VTPH (coastal: Sattakut · Khao Tao · SE PT)",
    cruiseAlt: 1800, dep: "VTBP", dest: "VTPH",
    wpts: [
      { id: "VTBP", name: "Prachuap Khiri Khan", lat: 11.7885, lon: 99.8046, alt: 17,  report: true,  comment: "Depart per TWR 135.9, right turn coastal northbound, track 029°, climb 1800." },
      { id: "SATKT", name: "Ban Sadakut (Khung Tanot)", lat: 12.2201, lon: 100.0275, alt: 1800, report: true, comment: "SATTAKUT — coast at Khao Sam Roi Yot, Ko Sadakut islet offshore, Khao Sam Roi Yot peaks (1,989') inland — stay coastal. Turn 358°, descend 1400." },
      { id: "KHTAO", name: "Ban Khao Tao",       lat: 12.4657, lon: 100.0041, alt: 1400, report: true, comment: "KHAO TAO — headland village + reservoir S of Khao Tao hill. 1400 ft. Turn 012° up the bay." },
      { id: "SEPT", name: "SE Point (Ao Hua Hin)", lat: 12.6089, lon: 100.0372, alt: 1400, report: true, comment: "SE POINT — offshore over Ao Hua Hin, ~6 NM SE of the field (abeam Klai Kangwon palace). Per plan: climb 2700 ft on the 288° rejoin leg toward the field." },
      { id: "VTPH", name: "Hua Hin",             lat: 12.6362, lon: 99.9515, alt: 62,  report: true,  comment: "Rejoin from the bay on 288°. Landing RWY 16 (or 34 per TWR). After landing: flaps up, transponder STBY, taxi to CATC apron. Log block time (durMin)." }
    ]
  },
  {
    id: "PH-BK", title: "XC-3  VTPH → VTBK (Kamphaeng Saen)",
    cruiseAlt: 4500, dep: "VTPH", dest: "VTBK",
    wpts: [
      { id: "VTPH",  name: "Hua Hin",        lat: 12.6362, lon: 99.9515, alt: 62,  report: true,  comment: "Depart RWY 16, right turn, track N along the railway line." },
      { id: "CHAAM", name: "Cha-am Beach",   lat: 12.8000, lon: 99.9670, alt: 3000, report: true, comment: "Compulsory report. Climb 4500 (northbound)." },
      { id: "PHBRI", name: "Phetchaburi",    lat: 13.1119, lon: 99.9410, alt: 4500, report: true, comment: "Leave the coast — track inland NW. Set heading carefully; fewer line features ahead." },
      { id: "RATCH", name: "Ratchaburi",     lat: 13.5360, lon: 99.8170, alt: 4500, report: true, comment: "Compulsory report. Town on Mae Klong river + prominent chimneys of the power plant." },
      { id: "NPTOM", name: "Nakhon Pathom",  lat: 13.8200, lon: 100.0600, alt: 3500, report: false, comment: "Phra Pathom Chedi (giant orange stupa) — unmistakable fix. Begin descent, call Kamphaeng Saen TWR." },
      { id: "VTBK",  name: "Kamphaeng Saen", lat: 14.1020, lon: 99.9170, alt: 30,  report: true,  comment: "Military field — full readbacks. Expect RWY 06/24 per TWR, beware RTAF circuit traffic." }
    ]
  },
  {
    id: "BK-PH", title: "XC-4  VTBK → VTPH (return)",
    cruiseAlt: 5500, dep: "VTBK", dest: "VTPH",
    wpts: [
      { id: "VTBK",  name: "Kamphaeng Saen", lat: 14.1020, lon: 99.9170, alt: 30,  report: true, comment: "Depart per TWR, climb on track SE towards the Chedi." },
      { id: "NPTOM", name: "Nakhon Pathom",  lat: 13.8200, lon: 100.0600, alt: 3500, report: true, comment: "Compulsory report overhead the Chedi. Continue climb 5500 (southbound: odd+500)." },
      { id: "RATCH", name: "Ratchaburi",     lat: 13.5360, lon: 99.8170, alt: 5500, report: true, comment: "Compulsory report. FREDA + fuel log. Diversion exercise trigger point." },
      { id: "PHBRI", name: "Phetchaburi",    lat: 13.1119, lon: 99.9410, alt: 4500, report: true, comment: "Rejoin the coast. Begin descent, copy Hua Hin ATIS." },
      { id: "CHAAM", name: "Cha-am Beach",   lat: 12.8000, lon: 99.9670, alt: 2500, report: true, comment: "Compulsory report. Expect join for RWY 16." },
      { id: "VTPH",  name: "Hua Hin",        lat: 12.6362, lon: 99.9515, alt: 62,  report: true, comment: "Landing RWY 16, taxi to CATC apron, shutdown checklist, log block time (durMin)." }
    ]
  }
];

/* ---------- ATC scripts ----------
   phase: GROUND events fire in order before takeoff; ENROUTE events fire at frac (0..1 of route distance);
   ARRIVAL events near the end. Each: freq, station, atc (transmission), pilot (model readback), tip. */
DATA.atc = {
  "PH-BP": {
    ground: [
      { station: "ATIS 126.8", atc: "Hua Hin International Airport information ALPHA, time 0200. Runway in use 16. Wind 150 degrees 8 knots. Visibility 9 kilometres. Few 2000. Temperature 31, dew point 24. QNH 1011. Advise on initial contact you have information ALPHA.", pilot: "(Copy ATIS — no transmission. Set QNH 1011.)", tip: "Copy onto the nav log header before first call." },
      { station: "Hua Hin Ground 121.9", atc: "CATC 274, Hua Hin Ground, start-up approved, QNH 1011, runway 16, taxi via Alpha, hold short runway 16.", pilot: "Start-up approved, QNH 1011, taxi Alpha hold short runway 16, CATC 274.", tip: "Initial call: 'Hua Hin Ground, CATC 274, DA40 at CATC apron, information Alpha, VFR to Prachuap via X Point, P Point, 2700 feet, request start and taxi.'" },
      { station: "Hua Hin Tower 122.7", atc: "CATC 274, Hua Hin Tower, wind 150 degrees 7 knots, runway 16, cleared for take-off. Right turn southwest-bound approved, report X Point.", pilot: "Cleared for take-off runway 16, right turn southwest-bound, will report X Point, CATC 274.", tip: "Full readback of clearance + runway. Lights, camera, action before rolling." }
    ],
    enroute: [
      { frac: 0.05, station: "Hua Hin Tower 122.7", atc: "CATC 274, contact Hua Hin Approach 126.2.", pilot: "Contact Approach 126.2, CATC 274.", tip: "Passing ~1000 ft in the climbing right turn onto 238°." },
      { frac: 0.10, station: "Position report", atc: "(Overhead X Point, 6 NM, level 2700 — make your report.)", pilot: "Hua Hin Approach, CATC 274, X Point at 07, 2700 feet, estimating P Point at 13, Prachuap next.", tip: "Format: POSITION — TIME — LEVEL — NEXT + ETA — THEREAFTER. Turn left onto 171°." },
      { frac: 0.30, station: "Position report", atc: "(Overhead P Point — Pran Buri. Compulsory report.)", pilot: "Hua Hin Approach, CATC 274, P Point at 13, 2700 feet, climbing 2900, estimating Prachuap at 32.", tip: "Turn onto 190°, climb 2900 for the 36 NM leg. FREDA right after the call." },
      { frac: 0.45, station: "Hua Hin Approach 126.2", atc: "CATC 274, leaving my area, contact Prachuap Tower 135.9 when 15 miles out. Squawk 1200. Good day.", pilot: "Contact Prachuap Tower 135.9 at 15 miles, squawk 1200, CATC 274, good day.", tip: "Keep listening watch. Overwater/coastal gap — hold heading 190°, check drift each 5 NM tick." },
      { frac: 0.62, station: "IN-FLIGHT EXERCISE", atc: "(Instructor: simulated engine roughness on the long leg — run the trouble check, pick a field, then resume.)", pilot: "(Drill: fuel pump ON, contents, mixture/power, alternate air, engine gauges; best glide 88; field or beach within reach.)", tip: "Talk it through out loud exactly like the real flight." },
      { frac: 0.75, station: "Prachuap Tower 135.9", atc: "CATC 274, Prachuap Tower, runway 36 in use, QNH 1010, report 10 miles north, military traffic in the circuit.", pilot: "Runway 36, QNH 1010, will report 10 miles north, CATC 274.", tip: "Initial call 15 NM out: 'Prachuap Tower, CATC 274, DA40, 15 miles north, 2900 feet, VFR from Hua Hin, for landing.' Military field — crisp full readbacks." },
      { frac: 0.90, station: "Prachuap Tower 135.9", atc: "CATC 274, report right base runway 36, number 1.", pilot: "Report right base runway 36, number 1, CATC 274.", tip: "Khao Lom Muak headland S of the field — keep it in sight on the join." }
    ],
    arrival: [
      { station: "Prachuap Tower 135.9", atc: "CATC 274, wind 010 degrees 6 knots, runway 36, cleared to land.", pilot: "Cleared to land runway 36, CATC 274.", tip: "Stabilised by 300 ft AAL or go around. Sea breeze can gust across Ao Manao bay." }
    ]
  },
  "BP-PH": {
    ground: [
      { station: "Prachuap Tower 135.9", atc: "CATC 274, Prachuap Tower, start-up approved, QNH 1010, runway 36, taxi via Alpha, hold short runway 36.", pilot: "Start-up approved, QNH 1010, taxi Alpha hold short runway 36, CATC 274.", tip: "Initial call: 'Prachuap Tower, CATC 274, DA40 on the apron, VFR to Hua Hin coastal via Sattakut, request start and taxi.'" },
      { station: "Prachuap Tower 135.9", atc: "CATC 274, wind 020 degrees 7 knots, runway 36, cleared for take-off, right turn coastal northbound approved, report leaving the zone.", pilot: "Cleared for take-off runway 36, right turn coastal northbound, will report leaving the zone, CATC 274.", tip: "Track 029° up the coast, climb 1800." }
    ],
    enroute: [
      { frac: 0.10, station: "Prachuap Tower 135.9", atc: "CATC 274, report leaving the zone, frequency change approved. Good day.", pilot: "Leaving the zone to the north, frequency change approved, CATC 274, good day.", tip: "Then monitor Hua Hin Approach 126.2. Squawk 1200." },
      { frac: 0.30, station: "Position report", atc: "(Overhead Sattakut — Khung Tanot coast at Khao Sam Roi Yot. Compulsory report.)", pilot: "Hua Hin Approach, CATC 274, DA40, Sattakut at 18, 1800 feet, coastal VFR Prachuap to Hua Hin, estimating Khao Tao at 26.", tip: "Sam Roi Yot peaks (1,989 ft) just inland — you are BELOW the tops at 1800. Stay over the coast. Then descend 1400, turn 358°." },
      { frac: 0.48, station: "IN-FLIGHT EXERCISE", atc: "(Instructor: 'Weather closing ahead — divert.' Practise the diversion drill using Pran Buri or direct inland, then resume.)", pilot: "(Diversion drill: time, rough heading, measure track/dist with the DIVERT tool, heading + ETA + fuel, tell ATC, log it.)", tip: "At 1400 ft coastal you have less time — decide early." },
      { frac: 0.60, station: "Position report", atc: "(Overhead Ban Khao Tao — headland + reservoir. Compulsory report.)", pilot: "Hua Hin Approach, CATC 274, Khao Tao at 26, 1400 feet, estimating SE Point at 32.", tip: "GS check on this 15 NM leg — revise your ETAs. Turn 012° across the bay." },
      { frac: 0.80, station: "Position report", atc: "(Overhead SE Point — offshore Ao Hua Hin. Report + start the rejoin climb.)", pilot: "Hua Hin Approach, CATC 274, SE Point at 32, climbing 2700, estimating Hua Hin at 36.", tip: "Per plan: climb 2700 on the 288° leg for the rejoin. Get information from ATIS 126.8 if not already copied." },
      { frac: 0.88, station: "Hua Hin Approach 126.2", atc: "CATC 274, contact Hua Hin Tower 122.7.", pilot: "Tower 122.7, CATC 274.", tip: "" }
    ],
    arrival: [
      { station: "Hua Hin Tower 122.7", atc: "CATC 274, Hua Hin Tower, join left downwind runway 16, number 2 to an ATR on 5 mile final, report downwind.", pilot: "Join left downwind runway 16, number 2, traffic in sight, will report downwind, CATC 274.", tip: "Wake turbulence: land beyond the ATR touchdown point." },
      { station: "Hua Hin Tower 122.7", atc: "CATC 274, wind 150 degrees 9 knots, runway 16, cleared to land.", pilot: "Cleared to land runway 16, CATC 274.", tip: "Stabilised by 300 ft AAL or go around. Then log ON + block-in — hours = block time (durMin)." }
    ]
  },
  "PH-BK": {
    ground: [
      { station: "ATIS 126.8", atc: "Hua Hin information CHARLIE, runway 16, wind 150 degrees 6 knots, CAVOK, temperature 32, QNH 1012.", pilot: "(Copy ATIS. Set QNH 1012.)", tip: "" },
      { station: "Hua Hin Ground 121.9", atc: "CATC 274, start-up approved, runway 16, QNH 1012, taxi Alpha, hold short runway 16.", pilot: "Start-up approved, QNH 1012, taxi Alpha hold short 16, CATC 274.", tip: "Initial call includes: destination Kamphaeng Saen VFR via Cha-am, Phetchaburi, Ratchaburi." },
      { station: "Hua Hin Tower 122.7", atc: "CATC 274, wind 150 degrees 7 knots, runway 16, cleared for take-off, right turn northbound, report Cha-am.", pilot: "Cleared for take-off 16, right turn northbound, wilco, CATC 274.", tip: "" }
    ],
    enroute: [
      { frac: 0.05, station: "Hua Hin Tower 122.7", atc: "CATC 274, contact Approach 126.2.", pilot: "Approach 126.2, CATC 274.", tip: "" },
      { frac: 0.14, station: "Position report", atc: "(Overhead Cha-am.)", pilot: "Hua Hin Approach, CATC 274, Cha-am at 12, 4500 feet, estimating Phetchaburi at 24, Ratchaburi thereafter.", tip: "" },
      { frac: 0.32, station: "Hua Hin Approach 126.2", atc: "CATC 274, leaving my area, monitor Bangkok Information 122.7, squawk 1200.", pilot: "Monitor 122.7, squawk 1200, CATC 274.", tip: "Inland now — hold your heading, trust the plan, check drift at Ratchaburi." },
      { frac: 0.50, station: "Position report", atc: "(Overhead Ratchaburi — compulsory report.)", pilot: "Bangkok Information, CATC 274, DA40, Ratchaburi at 35, 4500 feet, VFR Hua Hin to Kamphaeng Saen, estimating Kamphaeng Saen at 58.", tip: "FREDA check right after the call." },
      { frac: 0.72, station: "Kamphaeng Saen Tower 118.6", atc: "CATC 274, Kamphaeng Saen Tower, runway 06 in use, QNH 1012, report 5 miles southeast, expect straight-in approach, military traffic in the circuit.", pilot: "Runway 06, QNH 1012, will report 5 miles southeast, CATC 274.", tip: "Initial call 15 NM out. Military tower — crisp, complete readbacks." },
      { frac: 0.90, station: "Kamphaeng Saen Tower 118.6", atc: "CATC 274, number 1, runway 06, cleared straight-in approach, report 2 mile final.", pilot: "Cleared straight-in runway 06, will report 2 mile final, CATC 274.", tip: "" }
    ],
    arrival: [
      { station: "Kamphaeng Saen Tower 118.6", atc: "CATC 274, wind 080 degrees 5 knots, runway 06, cleared to land.", pilot: "Cleared to land runway 06, CATC 274.", tip: "3-degree profile: 300 ft per NM. 1500 ft at 5 NM works." }
    ]
  },
  "BK-PH": {
    ground: [
      { station: "Kamphaeng Saen Tower 118.6", atc: "CATC 274, start-up approved, runway 06, QNH 1012, taxi via Bravo, hold short runway 06.", pilot: "Start-up approved, QNH 1012, taxi Bravo hold short 06, CATC 274.", tip: "" },
      { station: "Kamphaeng Saen Tower 118.6", atc: "CATC 274, wind 070 degrees 6 knots, runway 06, cleared for take-off, right turn on course approved, report leaving the zone.", pilot: "Cleared for take-off 06, right turn on course, will report leaving the zone, CATC 274.", tip: "" }
    ],
    enroute: [
      { frac: 0.12, station: "Position report", atc: "(Overhead Nakhon Pathom Chedi — compulsory report.)", pilot: "Kamphaeng Saen Tower, CATC 274, leaving your zone to the southeast, Nakhon Pathom at 08, climbing 5500.", pilotNote: true, tip: "Then monitor Bangkok Information 122.7." },
      { frac: 0.38, station: "Position report", atc: "(Overhead Ratchaburi — compulsory report.)", pilot: "Bangkok Information, CATC 274, DA40, Ratchaburi at 21, 5500 feet, VFR Kamphaeng Saen to Hua Hin, estimating Phetchaburi at 33.", tip: "Fuel log entry due here." },
      { frac: 0.45, station: "IN-FLIGHT EXERCISE", atc: "(Instructor: simulated engine roughness — run the trouble check, pick a field, then resume.)", pilot: "(Drill: Fuel pump ON, fuel sufficient?, mixture/power check, carb/alternate air, engine gauges, best field within glide 88 KIAS.)", tip: "This is a drill trigger — talk it through out loud like the real flight." },
      { frac: 0.68, station: "Hua Hin Approach 126.2", atc: "CATC 274, Hua Hin Approach, radar contact, information DELTA, QNH 1011, report Cha-am.", pilot: "QNH 1011, information Delta, wilco, CATC 274.", tip: "" },
      { frac: 0.85, station: "Position report", atc: "(Overhead Cha-am.)", pilot: "Hua Hin Approach, CATC 274, Cha-am at 47, descending 2500, estimating Hua Hin at 55.", tip: "" },
      { frac: 0.92, station: "Hua Hin Approach 126.2", atc: "CATC 274, contact Tower 122.7.", pilot: "Tower 122.7, CATC 274.", tip: "" }
    ],
    arrival: [
      { station: "Hua Hin Tower 122.7", atc: "CATC 274, join left downwind runway 16, report downwind.", pilot: "Join left downwind 16, wilco, CATC 274.", tip: "" },
      { station: "Hua Hin Tower 122.7", atc: "CATC 274, wind 140 degrees 8 knots, runway 16, cleared to land.", pilot: "Cleared to land runway 16, CATC 274.", tip: "After landing: log ON time, then block-in time — hours = block time (durMin)." }
    ]
  }
};

/* ---------- In-flight interactive activities (Dry Run prompts) ---------- */
DATA.activities = {
  FREDA: {
    title: "FREDA cruise check", kind: "check",
    items: ["F — Fuel: pump as required, contents vs plan, log it", "R — Radio: correct freq set + next one standby", "E — Engine: Ts & Ps green, fuel flow matches power set", "D — Direction: DI/HSI aligned with magnetic compass", "A — Altitude: correct QNH, cruising level correct for track"]
  },
  POSREP: {
    title: "Position report builder", kind: "posrep",
    format: ["Station", "Callsign", "Position", "Time", "Level", "Next point + ETA", "(Thereafter)"]
  },
  GSCHECK: {
    title: "Groundspeed check", kind: "input",
    prompt: "Distance flown since last fix (NM) and time taken (min). GS = dist × 60 ÷ time. Revise ETAs on the nav log."
  },
  DIVERT: {
    title: "Diversion drill", kind: "check",
    items: ["Note the TIME and turn toward the diversion (rough heading)", "Draw/measure track & distance on the map (DIVERT tool)", "Apply variation & drift → heading; compute ETA at plan GS", "Fuel check: enough + reserve?", "Tell ATC: intentions, new destination, ETA", "Log it on the nav log remarks"]
  },
  ENGINE: {
    title: "Rough engine drill (touch drill)", kind: "check",
    items: ["Fly the aeroplane — trim for 88 KIAS if performance lost", "Fuel: pump ON, quantity, selector", "Mixture / power: adjust, try different setting", "Alternate air / carb heat as applicable", "Engine instruments: identify the problem", "Plan: nearest field / precautionary landing, MAYDAY or PAN as needed"]
  }
};

/* ---------- Phases of flight + DA40 CS checklists (abridged training flow) ---------- */
DATA.phases = [
  { id: "preflight", name: "Preflight & Planning", items: [
    "Documents: licence, medical, aircraft docs (ARC, insurance, W&B)",
    "NOTAMs + weather (METAR/TAF VTPH, VTBP/VTBK, winds aloft)",
    "Nav log completed: tracks, headings (var ~0°W area), ETAs, fuel",
    "Mass & balance inside envelope (PERF tab)",
    "Walk-around per AFM: fuel drain, oil, prop, controls, pitot, stall warner"
  ]},
  { id: "start", name: "Before Start / Start", items: [
    "Seats, belts, doors — secure. Canopy closed & latched",
    "Avionics OFF, ECU/electrics per AFM, area clear — 'CLEAR PROP'",
    "Engine start per AFM, oil pressure rising within limits",
    "Avionics ON — G1000 alignment, set QNH, flight plan loaded"
  ]},
  { id: "taxi", name: "Taxi", items: [
    "Brakes check immediately after rolling",
    "Flight instruments check: HSI/compass tracking turn, TC/AI erect",
    "Taxi speed walking pace near apron, stick into wind"
  ]},
  { id: "runup", name: "Run-up / Before Takeoff", items: [
    "Park into wind, brakes ON, oil temp in the green",
    "Run-up per AFM: mag/ECU check, prop cycle (constant-speed), idle check",
    "Flaps T/O, trim T/O, fuel pump ON, transponder ALT",
    "Departure brief: RWY, rotate 59, climb 67, EFATO plan, first heading + altitude"
  ]},
  { id: "takeoff", name: "Takeoff & Initial Climb", items: [
    "Lights ON, pitot heat as req, 'lined up runway __, heading checked'",
    "Full power — Ts & Ps green, airspeed alive both sides",
    "Rotate 59 KIAS, climb Vy 67 KIAS",
    "300 ft AAL: flaps UP; 1000 ft: fuel pump as req, climb power set"
  ]},
  { id: "climb", name: "Climb", items: [
    "Climb power per AFM, mixture as required (CS: lean per placard)",
    "Lookout turns every 500 ft, lights as required",
    "Level-off: A-P-T — Attitude, Power (cruise set), Trim"
  ]},
  { id: "cruise", name: "Cruise / Navigation", items: [
    "Set cruise power (see PERF tab), lean per AFM",
    "FREDA every ~15 min and at every compulsory reporting point",
    "Nav log discipline: ATO at every fix, GS check, revise ETAs",
    "Stay VMC: 30° max bank cruise, avoid TMA/CTR unless cleared"
  ]},
  { id: "descent", name: "Descent", items: [
    "ATIS/field info copied, plan: 300 ft per NM → start distance = alt/300",
    "Power as req, keep engine warm, mixture rich progressively",
    "Altimeter: destination QNH set + cross-checked"
  ]},
  { id: "approach", name: "Approach / Circuit Join", items: [
    "Field in sight — join as instructed (controlled) or standard join (AFIS)",
    "Downwind BUMPFH: Brakes off, Undercarriage (fixed) , Mixture rich, Fuel pump ON + contents, Flaps T/O ≤108, Harness",
    "Speeds: downwind 90, base 80 flaps T/O, final 76 flaps LDG ≤91"
  ]},
  { id: "landing", name: "Landing / Go-around", items: [
    "Stabilised by 300 ft AAL: on speed 76, on profile, cleared/announced — else GO AROUND",
    "Go-around: full power, pitch climb, flaps T/O, positive climb → flaps up in stages",
    "After landing (clear of runway): flaps UP, fuel pump OFF, lights, transponder STBY"
  ]},
  { id: "shutdown", name: "Shutdown & Post-flight", items: [
    "Avionics OFF, engine cool-down, shutdown per AFM, master OFF",
    "Block time recorded — durMin (block) is what counts for hours",
    "Post-flight walk-around, chocks/covers, tech log entries + defects"
  ]}
];

/* ---------- Lesson plans (dry-run oriented) ---------- */
DATA.lessons = [
  { id: "L1", title: "DR-1 · Route study & chart prep", body: "Study each leg on the SAT map: pick 2–3 visual features per leg (coastline, rivers, the Chedi, power plant chimneys). Add your own comments to waypoints in DRAW mode. Outcome: you can fly the whole route in your head with eyes closed." },
  { id: "L2", title: "DR-2 · Nav log & headings", body: "Fill the auto nav log with today's forecast wind (use the wind fields). Verify each heading with the 1-in-60 mental check. Outcome: headings + ETAs you trust, written on the printed log." },
  { id: "L3", title: "DR-3 · Radio dry run", body: "ATC tab: run the full script for the flight, SPEAK every readback out loud with the PTT timing (think, press, speak). Use PLAY to hear the ATC calls. Outcome: no 'errr' on any call." },
  { id: "L4", title: "DR-4 · Full chair flight", body: "DRY RUN tab: run the simulation at 4×–8×. At every activity popup, do the drill for real (FREDA out loud, fill the position report builder, log the fixes on the nav log). Outcome: full flight rehearsed end-to-end, nav log filled." },
  { id: "L5", title: "DR-5 · Abnormals & diversion", body: "Repeat the run and take every red exercise event seriously: diversion drill with the DIVERT tool, rough-engine touch drill. Add one self-imposed surprise (e.g. 'RWY 16 closed on return — plan 34'). Outcome: no drill takes you by surprise airborne." },
  { id: "L6", title: "DR-6 · G1000 flows", body: "G1000 tab: practise the knob-flow: load FPL, Direct-To, CDI source, OBS, nearest airport. Watch the HSI/CDI behave as the sim flies the route. Outcome: head stays out of the cockpit in flight because the hands know the box." }
];

/* ---------- DA40 CS performance (SAMPLE values — verify with the AFM) ---------- */
DATA.perf = {
  vspeeds: [
    ["Vso", 49, "Stall, landing flaps"], ["Vs1", 52, "Stall, clean"],
    ["Vr", 59, "Rotate"], ["Vx", 60, "Best angle"], ["Vy", 66, "Best rate"],
    ["Vapp", 76, "Final approach, LDG flaps"], ["Best glide", 88, "Engine failure"],
    ["Vfe T/O", 108, "Max flaps T/O"], ["Vfe LDG", 91, "Max flaps LDG"],
    ["Va", 108, "Manoeuvring (max mass)"], ["Vno", 129, "Max structural cruise"],
    ["Vne", 178, "Never exceed"]
  ],
  cruise: [
    /* pwr, MAP inHg, RPM, KTAS@4500, GPH */
    ["75%", "24.0", "2400", 129, 9.8],
    ["65%", "22.0", "2300", 122, 8.6],
    ["60%", "21.0", "2300", 117, 8.0],
    ["55%", "20.0", "2200", 112, 7.4]
  ],
  fuel: { usableGal: 39.0, reserveMin: 45 },
  wb: {
    unitNote: "kg / metres aft of datum — SAMPLE arms, use your aircraft's actual W&B data",
    emptyMass: 830, emptyArm: 2.45,
    stations: [
      { id: "front", name: "Pilot + front pax (kg)", arm: 2.30, def: 150 },
      { id: "rear", name: "Rear passengers (kg)", arm: 3.25, def: 0 },
      { id: "fuelKg", name: "Fuel (kg) — 1 USG AVGAS ≈ 2.72 kg", arm: 2.63, def: 80 },
      { id: "bag", name: "Baggage (kg, max 30)", arm: 3.65, def: 5 }
    ],
    mtow: 1198,
    envelope: [ /* [mass kg, fwd limit m, aft limit m] */
      [780, 2.40, 2.53], [980, 2.40, 2.53], [1198, 2.46, 2.53]
    ]
  },
  todo: [
    ["Takeoff roll (MTOW, SL, ISA)", "~380 m"], ["Takeoff over 50 ft", "~640 m"],
    ["Landing roll", "~350 m"], ["Landing over 50 ft", "~610 m"],
    ["Rate of climb (SL, MTOW)", "~1,070 ft/min"], ["Service ceiling", "16,400 ft"]
  ]
};

/* ============================================================
   Config persistence — EVERYTHING above is only the factory
   default. If the user has saved a config, it replaces DATA
   in place. saveDATA()/resetDATA() are used by the EDIT tab.
   ============================================================ */
const DEFAULT_DATA = JSON.parse(JSON.stringify(DATA));
const CONFIG_KEY = "nudryrun:config";
(function loadConfig() {
  try {
    const s = JSON.parse(localStorage.getItem(CONFIG_KEY));
    if (s && s.routes && s.aircraft) {
      // Migration: when the factory data version changes (corrected routes/freqs),
      // refresh factory content but keep the user's own routes and edits.
      if (s.version !== DEFAULT_DATA.version) {
        const factoryIds = DEFAULT_DATA.routes.map(r => r.id);
        s.airports = JSON.parse(JSON.stringify(DEFAULT_DATA.airports));
        s.vors = JSON.parse(JSON.stringify(DEFAULT_DATA.vors));
        s.routes = [...JSON.parse(JSON.stringify(DEFAULT_DATA.routes)),
                    ...s.routes.filter(r => !factoryIds.includes(r.id))];
        s.atc = { ...(s.atc || {}), ...JSON.parse(JSON.stringify(DEFAULT_DATA.atc)) };
        s.version = DEFAULT_DATA.version;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(s));
      }
      Object.keys(DATA).forEach(k => delete DATA[k]);
      Object.assign(DATA, s);
      // pick up new top-level blocks added in later app versions
      Object.keys(DEFAULT_DATA).forEach(k => { if (!(k in DATA)) DATA[k] = JSON.parse(JSON.stringify(DEFAULT_DATA[k])); });
    }
  } catch (e) { console.warn("config load failed, using defaults", e); }
})();
function saveDATA() { localStorage.setItem(CONFIG_KEY, JSON.stringify(DATA)); }
function resetDATA() { localStorage.removeItem(CONFIG_KEY); location.reload(); }
