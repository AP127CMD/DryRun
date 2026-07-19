/* ============================================================
   AP127 DRY RUN — application
   Tabs: DRY RUN (sat map + sim) · NAV LOG · ATC · G1000 · PERF · LESSONS
   ============================================================ */

"use strict";

/* ================= nav math ================= */
const R2D = 180 / Math.PI, D2R = Math.PI / 180;
function distNM(a, b) {
  const dLat = (b.lat - a.lat) * D2R, dLon = (b.lon - a.lon) * D2R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLon / 2) ** 2;
  return 3440.065 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function brg(a, b) {
  const y = Math.sin((b.lon - a.lon) * D2R) * Math.cos(b.lat * D2R);
  const x = Math.cos(a.lat * D2R) * Math.sin(b.lat * D2R) -
    Math.sin(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.cos((b.lon - a.lon) * D2R);
  return (Math.atan2(y, x) * R2D + 360) % 360;
}
function interp(a, b, f) { return { lat: a.lat + (b.lat - a.lat) * f, lon: a.lon + (b.lon - a.lon) * f }; }
function destPoint(lat, lon, brgTrue, dNM) {
  const dR = dNM / 3440.065, br = brgTrue * D2R, la1 = lat * D2R, lo1 = lon * D2R;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(dR) + Math.cos(la1) * Math.sin(dR) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(dR) * Math.cos(la1), Math.cos(dR) - Math.sin(la1) * Math.sin(la2));
  return { lat: la2 * R2D, lon: lo2 * R2D };
}
const VAR = 0.5; // magnetic variation ~0.5°W in this area → MC = TC + 0.5
function windTriangle(tc, tas, wdir, wspd) {
  const awa = (wdir - tc) * D2R;
  const xw = wspd * Math.sin(awa), hw = wspd * Math.cos(awa);
  const wca = Math.asin(Math.max(-1, Math.min(1, xw / tas))) * R2D;
  const gs = Math.max(30, tas * Math.cos(wca * D2R) - hw);
  return { wca, gs };
}
const pad3 = n => String(Math.round((n % 360 + 360) % 360)).padStart(3, "0");
const fmtMin = m => { m = Math.max(0, Math.round(m)); return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
function fmtClock(min) { const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60); return String(h).padStart(2, "0") + String(m).padStart(2, "0"); }

/* ================= route model ================= */
let activeRoute = DATA.routes[0];
function routeLegs(rt) {
  const legs = [];
  for (let i = 0; i < rt.wpts.length - 1; i++) {
    const a = rt.wpts[i], b = rt.wpts[i + 1];
    const tc = brg(a, b), d = distNM(a, b);
    const tas = +a.spd || DATA.aircraft.tas;      // per-waypoint speed change (FPL input)
    const w = windTriangle(tc, tas, wind.dir, wind.spd);
    legs.push({ from: a, to: b, tc, mc: (tc + VAR + 360) % 360, dist: d, wca: w.wca, hdg: (tc + VAR + w.wca + 360) % 360, gs: w.gs, ete: d / w.gs * 60, tas });
  }
  return legs;
}
function routeTotal(rt) { return routeLegs(rt).reduce((s, l) => s + l.dist, 0); }
function posAlong(rt, s) {           // s NM from start → {lat,lon,legIdx,legFrac}
  const legs = routeLegs(rt);
  let acc = 0;
  for (let i = 0; i < legs.length; i++) {
    if (s <= acc + legs[i].dist || i === legs.length - 1) {
      const f = Math.max(0, Math.min(1, (s - acc) / legs[i].dist));
      return { ...interp(legs[i].from, legs[i].to, f), legIdx: i, legFrac: f, leg: legs[i] };
    }
    acc += legs[i].dist;
  }
}

/* ---- guards for user-created routes (no ATC script / unknown airports) ---- */
function atcFor(id) { return DATA.atc[id] || { ground: [], enroute: [], arrival: [] }; }
function apOf(id, rt) {
  if (DATA.airports[id]) return DATA.airports[id];
  const w = rt ? (rt.wpts.find(x => x.id === id) || rt.wpts[0]) : null;
  return { icao: id, name: id, lat: w?.lat ?? 0, lon: w?.lon ?? 0, elev: w?.alt ?? 0, rwy: "--/--", rwyLen: "", freqs: [], circuit: "—", notes: "" };
}

/* ================= state ================= */
const wind = { dir: 180, spd: 10 };
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

/* ================= map ================= */
let map, layerRoutes, layerUser, layerAC, layerDivert, layerNotes;
let autoFit = true;
function fitActive() {
  if (!map) return;
  const sz = map.getSize();
  if (sz.x < 50 || sz.y < 50) return;   // container not laid out yet
  map.fitBounds(activeRoute.wpts.map(w => [w.lat, w.lon]), { padding: [40, 40], animate: false });
}
let acMarker = null;
let mode = "pan"; // pan | draw | divert
let userWpts = store.get("userWpts", []);

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([13.2, 100.2], 8);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 18, attribution: "Esri World Imagery" }).addTo(map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 18, opacity: 0.9 }).addTo(map);
  layerRoutes = L.layerGroup().addTo(map);
  layerUser = L.layerGroup().addTo(map);
  layerNotes = L.layerGroup().addTo(map);
  layerDivert = L.layerGroup().addTo(map);
  layerAC = L.layerGroup().addTo(map);
  map.on("click", onMapClick);
  // Auto-fit to the active route until the user takes over the map —
  // covers late layout, hidden-tab loads, and pane resizes.
  map.on("mousedown", () => { autoFit = false; });
  map.getContainer().addEventListener("wheel", () => { autoFit = false; }, { passive: true });
  new ResizeObserver(() => { map.invalidateSize(); if (autoFit) fitActive(); }).observe(document.getElementById("map"));
  drawRoutes(); drawUserWpts(); drawNotes();
}

/* ---- map notes (NOTE mode): add / edit / drag / resize / recolor / delete ---- */
let notes = store.get("mapNotes", []);
const NOTE_COLORS = { amber: "#ffb300", cyan: "#00e5ff", magenta: "#ff2ec4", green: "#00ff66", red: "#ff3b30", white: "#ffffff" };
function drawNotes() {
  layerNotes.clearLayers();
  notes.forEach((n, i) => {
    const color = NOTE_COLORS[n.color] || NOTE_COLORS.amber;
    const size = n.size === "L" ? 15 : n.size === "S" ? 10 : 12;
    const m = L.marker([n.lat, n.lon], {
      draggable: true, zIndexOffset: 500,
      icon: L.divIcon({
        className: "", iconSize: null, iconAnchor: [6, 6],
        html: `<div class="map-note" style="--nc:${color};font-size:${size}px">${(n.text || "").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>`
      })
    }).addTo(layerNotes);
    m.on("dragend", e => { const p = e.target.getLatLng(); notes[i].lat = p.lat; notes[i].lon = p.lng; saveNotes(); });
    m.bindPopup(() => noteEditor(i), { minWidth: 240 });
  });
}
function noteEditor(i) {
  const n = notes[i];
  const colorOpts = Object.keys(NOTE_COLORS).map(c => `<option value="${c}" ${n.color === c ? "selected" : ""}>${c}</option>`).join("");
  const div = document.createElement("div");
  div.className = "pop";
  div.innerHTML = `<div class="pop-title">MAP NOTE</div>
    <textarea id="ne-text" rows="3" style="width:100%">${(n.text || "").replace(/</g, "&lt;")}</textarea>
    <div class="pop-actions" style="margin:6px 0">
      <select id="ne-size">${["S", "M", "L"].map(s => `<option ${n.size === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <select id="ne-color">${colorOpts}</select>
    </div>
    <div class="pop-actions">
      <button id="ne-save">✔ save</button>
      <button id="ne-del">✕ delete</button>
    </div>`;
  div.querySelector("#ne-save").onclick = () => {
    n.text = div.querySelector("#ne-text").value;
    n.size = div.querySelector("#ne-size").value;
    n.color = div.querySelector("#ne-color").value;
    saveNotes(); map.closePopup();
  };
  div.querySelector("#ne-del").onclick = () => { notes.splice(i, 1); saveNotes(); map.closePopup(); };
  return div;
}
function saveNotes() { store.set("mapNotes", notes); drawNotes(); }

function wptIcon(color, report) {
  return L.divIcon({
    className: "", iconSize: [16, 16], iconAnchor: [8, 8],
    html: `<div class="wpt-dot" style="--c:${color};${report ? "border-radius:2px;" : ""}"></div>`
  });
}
function drawRoutes() {
  layerRoutes.clearLayers();
  DATA.routes.forEach(rt => {
    const pts = rt.wpts.map(w => [w.lat, w.lon]);
    const isActive = rt.id === activeRoute.id;
    L.polyline(pts, { color: isActive ? "#ff2ec4" : "#3a4c58", weight: isActive ? 4 : 2, opacity: isActive ? 0.95 : 0.6, dashArray: isActive ? null : "6 8" })
      .addTo(layerRoutes)
      .on("click", () => { if (mode === "pan") selectRoute(rt.id); });
    if (!isActive) return;
    const legs = routeLegs(rt);
    rt.wpts.forEach((w, i) => {
      const color = i === 0 || i === rt.wpts.length - 1 ? "#00ff66" : (w.report ? "#00e5ff" : "#ffffff");
      const legIn = i > 0 ? legs[i - 1] : null;
      const html = `<div class="pop">
        <div class="pop-title">${w.id} · ${w.name} ${w.report ? '<span class="badge-rep">REPORT</span>' : ""}</div>
        <div class="pop-row">Plan ${w.alt.toLocaleString()} ft${legIn ? ` · MC ${pad3(legIn.mc)}° · ${legIn.dist.toFixed(1)} NM from ${legIn.from.id}` : ""}</div>
        <div class="pop-cmt">${w.comment}</div></div>`;
      L.marker([w.lat, w.lon], { icon: wptIcon(color, w.report) }).addTo(layerRoutes).bindPopup(html);
      L.marker([w.lat, w.lon], {
        icon: L.divIcon({ className: "", html: `<div class="wpt-lbl">${w.id}</div>`, iconSize: [60, 14], iconAnchor: [-8, 7] }),
        interactive: false
      }).addTo(layerRoutes);
    });
  });
  // airport rings
  Object.values(DATA.airports).forEach(ap => {
    L.circle([ap.lat, ap.lon], { radius: 5556, color: "#ffb300", weight: 1, fill: false, dashArray: "4 6" }).addTo(layerRoutes)
      .bindPopup(`<div class="pop"><div class="pop-title">${ap.icao} · ${ap.name}</div>
        <div class="pop-row">Elev ${ap.elev} ft · RWY ${ap.rwy} · ${ap.rwyLen}</div>
        <div class="pop-row">${ap.freqs.map(f => `${f[0]} <b>${f[1]}</b>`).join(" · ")}</div>
        <div class="pop-cmt">${ap.circuit}. ${ap.notes}</div></div>`);
  });
}

/* ---- user waypoints (DRAW mode) ---- */
function drawUserWpts() {
  layerUser.clearLayers();
  if (userWpts.length > 1) {
    L.polyline(userWpts.map(w => [w.lat, w.lon]), { color: "#ffb300", weight: 3, dashArray: "10 6" }).addTo(layerUser);
    let d = 0;
    for (let i = 1; i < userWpts.length; i++) d += distNM(userWpts[i - 1], userWpts[i]);
    document.getElementById("draw-info").textContent =
      `${userWpts.length} pts · ${d.toFixed(1)} NM · ${fmtMin(d / DATA.aircraft.tas * 60)} at ${DATA.aircraft.tas} kt`;
  } else {
    document.getElementById("draw-info").textContent = userWpts.length ? "1 pt" : "";
  }
  userWpts.forEach((w, i) => {
    const m = L.marker([w.lat, w.lon], { draggable: true, icon: wptIcon("#ffb300", false) }).addTo(layerUser);
    m.bindPopup(`<div class="pop"><div class="pop-title">${w.name || "WPT " + (i + 1)}</div>
      <div class="pop-cmt">${w.comment || ""}</div>
      <div class="pop-actions"><button onclick="editUserWpt(${i})">✎ edit</button>
      <button onclick="delUserWpt(${i})">✕ delete</button></div></div>`);
    m.on("dragend", e => { const p = e.target.getLatLng(); userWpts[i].lat = p.lat; userWpts[i].lon = p.lng; saveUser(); });
  });
}
function saveUser() { store.set("userWpts", userWpts); drawUserWpts(); }
window.editUserWpt = i => {
  const name = prompt("Waypoint name:", userWpts[i].name || "");
  if (name === null) return;
  const comment = prompt("Comment / briefing note:", userWpts[i].comment || "");
  userWpts[i].name = name; userWpts[i].comment = comment ?? ""; saveUser();
};
window.delUserWpt = i => { userWpts.splice(i, 1); saveUser(); };

function onMapClick(e) {
  if (mode === "note") {
    const text = prompt("Note text (what do you want to remember at this spot?):", "");
    if (!text) return;
    notes.push({ lat: e.latlng.lat, lon: e.latlng.lng, text, size: "M", color: "amber" });
    saveNotes();
  } else if (mode === "draw") {
    const name = prompt("Waypoint name (blank = auto):", "") ?? "";
    if (name === null) return;
    const comment = prompt("Comment (what will you see / do here?):", "") ?? "";
    userWpts.push({ lat: e.latlng.lat, lon: e.latlng.lng, name: name || "WPT " + (userWpts.length + 1), comment });
    saveUser();
  } else if (mode === "divert") {
    const from = sim.running || sim.s > 0 ? posAlong(activeRoute, sim.s) : activeRoute.wpts[0];
    const to = { lat: e.latlng.lat, lon: e.latlng.lng };
    const tc = brg(from, to), d = distNM(from, to);
    const w = windTriangle(tc, DATA.aircraft.tas, wind.dir, wind.spd);
    layerDivert.clearLayers();
    L.polyline([[from.lat, from.lon], [to.lat, to.lon]], { color: "#ff3b30", weight: 3, dashArray: "2 8" }).addTo(layerDivert);
    L.popup().setLatLng(e.latlng).setContent(`<div class="pop"><div class="pop-title" style="color:#ff3b30">DIVERSION</div>
      <div class="pop-row">MC <b>${pad3(tc + VAR)}°</b> · HDG <b>${pad3(tc + VAR + w.wca)}°</b></div>
      <div class="pop-row">${d.toFixed(1)} NM · GS ${Math.round(w.gs)} kt · ETE <b>${fmtMin(d / w.gs * 60)}</b></div>
      <div class="pop-cmt">Fuel req ≈ ${(d / w.gs * getCruiseGph()).toFixed(1)} USG + reserve. Tell ATC, log it.</div></div>`).openOn(map);
  }
}
function setMode(m) {
  mode = m;
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("on", b.dataset.mode === m));
  document.getElementById("map").style.cursor = m === "pan" ? "" : "crosshair";
  if (m !== "divert") layerDivert.clearLayers();
}

/* ================= nav log ================= */
function navlogKey() { return "navlog:" + activeRoute.id; }
function buildNavlog() {
  const legs = routeLegs(activeRoute);
  const rec = store.get(navlogKey(), {});
  const startMin = 9 * 60; // block off 0900L default
  let eto = startMin, totD = 0, totT = 0, totF = 0;
  const gph = getCruiseGph();
  let html = `<tr><th>Leg</th><th>ALT ft</th><th>MC°</th><th>HDG°</th><th>DIST</th><th>GS</th><th>ETE</th><th>ETO</th>
    <th class="rec">ATO ✎</th><th>Fuel plan</th><th class="rec">Fuel act ✎</th><th class="rec">Remarks ✎</th><th></th></tr>`;
  legs.forEach((l, i) => {
    eto += l.ete; totD += l.dist; totT += l.ete;
    const f = l.ete / 60 * gph; totF += f;
    const r = rec[i] || {};
    html += `<tr class="${l.to.report ? "rp" : ""}">
      <td>${l.from.id} → <b>${l.to.id}</b>${l.to.report ? ' <span class="badge-rep">RP</span>' : ""}</td>
      <td>${l.to.alt.toLocaleString()}</td><td>${pad3(l.mc)}</td><td class="hl">${pad3(l.hdg)}</td>
      <td>${l.dist.toFixed(1)}</td><td>${Math.round(l.gs)}</td><td>${fmtMin(l.ete)}</td><td>${fmtClock(eto)}</td>
      <td class="rec"><input data-i="${i}" data-f="ato" value="${r.ato || ""}" placeholder="----"></td>
      <td>${f.toFixed(1)}</td>
      <td class="rec"><input data-i="${i}" data-f="fuel" value="${r.fuel || ""}" placeholder="USG"></td>
      <td class="rec"><input data-i="${i}" data-f="rmk" class="wide" value="${r.rmk || ""}" placeholder=""></td>
      <td><button class="stamp" data-i="${i}" title="Stamp current sim time">⏱</button></td></tr>`;
  });
  html += `<tr class="tot"><td>TOTAL</td><td></td><td></td><td></td><td>${totD.toFixed(1)}</td><td></td>
    <td>${fmtMin(totT)}</td><td colspan="2"></td><td>${totF.toFixed(1)} + taxi ${DATA.aircraft.taxiGal}</td><td colspan="3">
    Reserve 45 min ≈ ${(gph * 0.75).toFixed(1)} USG · Min block fuel <b>${(totF + DATA.aircraft.taxiGal + gph * 0.75).toFixed(1)} USG</b> of ${DATA.perf.fuel.usableGal}</td></tr>`;
  const tbl = document.getElementById("navlog-table");
  tbl.innerHTML = html;
  tbl.querySelectorAll("input").forEach(inp => inp.addEventListener("change", () => {
    const rec2 = store.get(navlogKey(), {});
    rec2[inp.dataset.i] = rec2[inp.dataset.i] || {};
    rec2[inp.dataset.i][inp.dataset.f] = inp.value;
    store.set(navlogKey(), rec2);
  }));
  tbl.querySelectorAll(".stamp").forEach(b => b.addEventListener("click", () => {
    const rec2 = store.get(navlogKey(), {});
    rec2[b.dataset.i] = rec2[b.dataset.i] || {};
    rec2[b.dataset.i].ato = fmtClock(sim.clockMin);
    store.set(navlogKey(), rec2); buildNavlog();
  }));
  document.getElementById("navlog-head").textContent =
    `${activeRoute.title} · TAS ${DATA.aircraft.tas} kt · W/V ${pad3(wind.dir)}/${wind.spd} · VAR ${VAR}°W · ${DATA.aircraft.callsign}`;
}

/* ================= ATC tab ================= */
const speakAttr = text => JSON.stringify(text).replace(/'/g, "&#39;");
function speak(text) {
  if (!("speechSynthesis" in window)) return alert("Speech not supported in this browser.");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/CATC 274/g, "Catsee two seven four"));
  u.rate = 1.02; u.pitch = 0.9;
  speechSynthesis.speak(u);
}
function atcCard(ev, idx) {
  const isExercise = /EXERCISE/.test(ev.station);
  return `<div class="atc-card ${isExercise ? "ex" : ""}">
    <div class="atc-station">${ev.station}${ev.frac !== undefined ? ` <span class="atc-frac">${Math.round(ev.frac * 100)}% en-route</span>` : ""}</div>
    <div class="atc-msg">${ev.atc}</div>
    <div class="atc-actions">
      <button onclick='speak(${speakAttr(ev.atc)})'>▶ PLAY</button>
      <button onclick="this.parentElement.nextElementSibling.classList.toggle('show')">SHOW READBACK</button>
    </div>
    <div class="atc-readback"><b>YOU:</b> ${ev.pilot}${ev.tip ? `<div class="atc-tip">💡 ${ev.tip}</div>` : ""}</div>
  </div>`;
}
function buildAtcTab() {
  const s = atcFor(activeRoute.id);
  const el = document.getElementById("atc-list");
  el.innerHTML = `<h3>Ground — ${apOf(activeRoute.dep, activeRoute).icao}</h3>` + s.ground.map(atcCard).join("") +
    `<h3>En-route</h3>` + s.enroute.map(atcCard).join("") +
    `<h3>Arrival — ${apOf(activeRoute.dest, activeRoute).icao}</h3>` + s.arrival.map(atcCard).join("") +
    `<h3>Frequencies</h3><div class="freq-grid">` +
    [activeRoute.dep, activeRoute.dest].map(k => {
      const ap = apOf(k, activeRoute);
      return `<div class="freq-card"><b>${ap.icao}</b> ${ap.name}<br>` + ap.freqs.map(f => `${f[0]} <b>${f[1]}</b>`).join("<br>") + `</div>`;
    }).join("") + `<div class="freq-card"><b>En-route</b><br>Bangkok Information <b>122.7</b><br>Emergency <b>121.5</b><br>Squawk VFR <b>1200</b></div></div>`;
}

/* ================= G1000 FPL page ================= */
function buildG1000Fpl() {
  const legs = routeLegs(activeRoute);
  let html = `<tr><th>WPT</th><th>DTK°</th><th>DIS nm</th><th>ALT ft</th><th>ETE</th></tr>
    <tr><td class="hl">${activeRoute.wpts[0].id}</td><td>___</td><td>0.0</td><td>${activeRoute.wpts[0].alt.toLocaleString()}</td><td>__:__</td></tr>`;
  legs.forEach(l => {
    html += `<tr><td class="hl">${l.to.id}</td><td>${pad3(l.mc)}</td><td>${l.dist.toFixed(1)}</td><td>${l.to.alt.toLocaleString()}</td><td>${fmtMin(l.ete)}</td></tr>`;
  });
  html += `<tr class="tot"><td>${activeRoute.dep} → ${activeRoute.dest}</td><td></td><td>${routeTotal(activeRoute).toFixed(1)}</td><td>CRZ ${activeRoute.cruiseAlt.toLocaleString()}</td><td>${fmtMin(legs.reduce((s, l) => s + l.ete, 0))}</td></tr>`;
  document.querySelector("#g1000-fpl table").innerHTML = html;
}

/* ================= dry-run simulator ================= */
const sim = {
  running: false, s: 0, total: 0, spd: 4, clockMin: 9 * 60,
  events: [], nextEv: 0, groundIdx: 0, phase: "ground", last: 0, raf: null
};
function buildEvents() {
  const D = routeTotal(activeRoute);
  sim.total = D;
  const scr = atcFor(activeRoute.id);
  const evs = [];
  scr.enroute.forEach(e => {
    let kind = "atc", act = null;
    if (/EXERCISE/.test(e.station)) { kind = "activity"; act = /divert|Divert|diversion/i.test(e.atc) ? "DIVERT" : "ENGINE"; }
    else if (/Position report/.test(e.station)) { kind = "posrep"; }
    evs.push({ s: e.frac * D, kind, ev: e, act });
  });
  evs.push({ s: 0.35 * D, kind: "activity", act: "FREDA", ev: { station: "CRUISE CHECK", atc: "Time for a FREDA check.", pilot: "" } });
  evs.push({ s: 0.5 * D, kind: "activity", act: "GSCHECK", ev: { station: "NAV EXERCISE", atc: "Groundspeed check — revise your ETAs on the NAV LOG tab.", pilot: "" } });
  evs.push({ s: 0.65 * D, kind: "activity", act: "FREDA", ev: { station: "CRUISE CHECK", atc: "FREDA again — and a fuel log entry.", pilot: "" } });
  scr.arrival.forEach((e, i) => evs.push({ s: D - 1.2 + i * 0.5, kind: "atc", ev: e }));
  evs.sort((a, b) => a.s - b.s);
  sim.events = evs; sim.nextEv = 0;
}
function altProfile(s) {
  const dep = apOf(activeRoute.dep, activeRoute).elev, dst = apOf(activeRoute.dest, activeRoute).elev;
  const climbGrad = DATA.aircraft.climbFpm / (DATA.aircraft.climbTas / 60);   // ft per NM
  const descGrad = 300;
  return Math.min(activeRoute.cruiseAlt, dep + s * climbGrad, dst + Math.max(0, sim.total - s) * descGrad);
}
function simTick(ts) {
  if (!sim.running) return;
  const dt = Math.min(1.0, (ts - sim.last) / 1000) * sim.spd; // sim seconds (scaled); cap survives rAF throttling
  sim.last = ts;
  const p0 = posAlong(activeRoute, sim.s);
  const gs = p0.leg.gs;
  sim.s += gs / 3600 * dt;
  sim.clockMin += dt / 60;
  if (sim.s >= sim.total) { finishSim(); return; }
  // events
  if (sim.nextEv < sim.events.length && sim.s >= sim.events[sim.nextEv].s) {
    const e = sim.events[sim.nextEv++];
    pauseSim(); showEvent(e); return;
  }
  updateSimUI();
}
function updateSimUI() {
  const p = posAlong(activeRoute, sim.s);
  const alt = altProfile(sim.s), prevAlt = altProfile(Math.max(0, sim.s - 0.2));
  const vs = (alt - prevAlt) / (0.2 / p.leg.gs * 60);
  const climbing = vs > 100, descending = vs < -100;
  const crzIas = Math.max(70, (p.leg.tas || DATA.aircraft.tas) - 10);
  const ias = sim.s < 0.3 ? Math.min(75, p.leg.gs) : climbing ? 75 : descending ? (sim.total - sim.s < 3 ? 76 + (sim.total - sim.s) / 3 * 34 : crzIas + 5) : crzIas;
  const wobble = Math.sin(sim.s * 2.2) * 0.12;
  if (!acMarker) {
    acMarker = L.marker([p.lat, p.lon], {
      icon: L.divIcon({ className: "", iconSize: [28, 28], iconAnchor: [14, 14], html: `<div id="ac-icon">▲</div>` }),
      zIndexOffset: 1000
    }).addTo(layerAC);
  }
  acMarker.setLatLng([p.lat, p.lon]);
  const el = document.getElementById("ac-icon");
  if (el) el.style.transform = `rotate(${p.leg.tc}deg)`;
  if (document.getElementById("follow").checked) map.panTo([p.lat, p.lon], { animate: false });
  const remain = sim.total - sim.s;
  const legRemain = (1 - p.legFrac) * p.leg.dist;
  G1000.set({
    ias, alt, hdg: p.leg.hdg, trk: p.leg.tc + VAR, dtk: p.leg.mc, xtk: wobble,
    gs: p.leg.gs, vs, roll: 0, pitch: climbing ? 5 : descending ? -3 : 1,
    wptId: p.leg.to.id, dis: legRemain, ete: fmtMin(remain / p.leg.gs * 60), navSrc: "GPS"
  });
  document.getElementById("sim-stats").innerHTML =
    `<b>${fmtClock(sim.clockMin)}L</b> · ${p.leg.from.id}→<b>${p.leg.to.id}</b> · HDG <b>${pad3(p.leg.hdg)}°</b> · ` +
    `${alt >= activeRoute.cruiseAlt - 50 ? "CRZ" : climbing ? "CLB" : "DES"} ${Math.round(alt).toLocaleString()} ft · ` +
    `GS ${Math.round(p.leg.gs)} · leg ${legRemain.toFixed(1)} NM · dest ${remain.toFixed(1)} NM`;
  document.getElementById("sim-prog").style.width = (sim.s / sim.total * 100) + "%";
}
function startSim() {
  autoFit = false;
  buildEvents();
  sim.s = 0; sim.clockMin = 9 * 60; sim.phase = "ground"; sim.groundIdx = 0;
  document.getElementById("flight-log").innerHTML = "";
  logLine(`■ DRY RUN START — ${activeRoute.title} · block off ${fmtClock(sim.clockMin)}L`);
  nextGroundEvent();
}
function nextGroundEvent() {
  const g = atcFor(activeRoute.id).ground;
  if (sim.groundIdx < g.length) {
    showEvent({ kind: "atc", ev: g[sim.groundIdx++], ground: true });
  } else {
    sim.phase = "air";
    logLine(`✈ Airborne ${fmtClock(sim.clockMin)}L — RWY ${apOf(activeRoute.dep, activeRoute).rwy.split("/")[0]}`);
    resumeSim();
  }
}
function resumeSim() {
  if (sim.phase === "ground") { nextGroundEvent(); return; }
  sim.running = true; sim.last = performance.now();
  document.getElementById("btn-startpause").textContent = "❚❚ PAUSE";
  if (sim.raf) clearInterval(sim.raf);
  sim.raf = setInterval(() => simTick(performance.now()), 120);
}
function pauseSim() {
  sim.running = false;
  if (sim.raf) { clearInterval(sim.raf); sim.raf = null; }
  document.getElementById("btn-startpause").textContent = "▶ RESUME";
}
function finishSim() {
  pauseSim();
  updateSimUI();
  logLine(`■ LANDED ${apOf(activeRoute.dest, activeRoute).icao} at ${fmtClock(sim.clockMin)}L. Block time so far: ${fmtMin(sim.clockMin - 9 * 60)} (durMin). Fill the last nav-log rows + shutdown checklist.`);
  document.getElementById("btn-startpause").textContent = "▶ START";
  sim.s = 0; sim.phase = "ground"; sim.groundIdx = 0; sim.nextEv = 0;
  alert("Dry run complete ✔  Check the flight log and finish your NAV LOG entries (ATO / fuel / remarks).");
}
function logLine(html) {
  const el = document.getElementById("flight-log");
  el.insertAdjacentHTML("afterbegin", `<div class="log-line">${html}</div>`);
}

/* ---- event modal ---- */
function showEvent(e) {
  const m = document.getElementById("modal");
  const ev = e.ev;
  let body = "";
  const time = fmtClock(sim.clockMin);
  if (e.kind === "activity") {
    const act = DATA.activities[e.act];
    body = `<div class="ev-station ex">${ev.station} · ${time}L</div><div class="ev-msg">${ev.atc}</div>
      <div class="act-title">${act.title}</div>`;
    if (act.kind === "check") {
      body += `<div class="act-list">` + act.items.map((it, i) =>
        `<label class="act-item"><input type="checkbox"> <span>${it}</span></label>`).join("") + `</div>`;
    } else if (act.kind === "input") {
      body += `<div class="ev-msg">${act.prompt}</div>
        <div class="gs-calc">Dist <input id="gs-d" size="4" value="10"> NM in <input id="gs-t" size="4" value="5"> min
        <button onclick="document.getElementById('gs-out').textContent = 'GS = ' + Math.round(+document.getElementById('gs-d').value*60/+document.getElementById('gs-t').value) + ' kt'">=</button>
        <b id="gs-out"></b></div>`;
    }
    logLine(`⚑ ${time}L — ${act.title}`);
  } else if (e.kind === "posrep") {
    body = `<div class="ev-station">${ev.station} · ${time}L</div><div class="ev-msg">${ev.atc}</div>
      <div class="act-title">Build your position report, then compare:</div>
      <textarea id="posrep-in" rows="3" placeholder="Station, callsign, position, time, level, next + ETA…"></textarea>
      <button class="ghost" onclick="document.getElementById('posrep-model').classList.add('show')">COMPARE WITH MODEL</button>
      <div id="posrep-model" class="atc-readback"><b>MODEL:</b> ${ev.pilot}${ev.tip ? `<div class="atc-tip">💡 ${ev.tip}</div>` : ""}</div>`;
    logLine(`📻 ${time}L — position report (${ev.station})`);
  } else {
    body = `<div class="ev-station">${ev.station} · ${time}L</div><div class="ev-msg">${ev.atc}</div>
      <div class="atc-actions">
        <button onclick='speak(${speakAttr(ev.atc)})'>▶ PLAY ATC</button>
        <button class="ghost" onclick="this.parentElement.nextElementSibling.classList.add('show')">SHOW READBACK</button>
      </div>
      <div class="atc-readback"><b>YOU:</b> ${ev.pilot}${ev.tip ? `<div class="atc-tip">💡 ${ev.tip}</div>` : ""}</div>`;
    logLine(`📻 ${time}L — ${ev.station}`);
    if (document.getElementById("autoplay").checked && !/^\(/.test(ev.atc)) speak(ev.atc);
  }
  document.getElementById("modal-body").innerHTML = body;
  m.classList.add("open");
  document.getElementById("modal-continue").onclick = () => { m.classList.remove("open"); speechSynthesis.cancel(); resumeSim(); };
}

/* ================= PERF tab ================= */
function getCruiseGph() { return DATA.perf.cruise[+document.getElementById("pwr-sel")?.value || 0][4]; }
function getCruiseTas() { return DATA.perf.cruise[+document.getElementById("pwr-sel")?.value || 0][3]; }
function buildPerf() {
  document.getElementById("vspeed-table").innerHTML =
    `<tr><th>Speed</th><th>KIAS</th><th></th></tr>` +
    DATA.perf.vspeeds.map(v => `<tr><td><b>${v[0]}</b></td><td class="hl">${v[1]}</td><td>${v[2]}</td></tr>`).join("");
  document.getElementById("cruise-table").innerHTML =
    `<tr><th>Power</th><th>MAP</th><th>RPM</th><th>KTAS</th><th>GPH</th></tr>` +
    DATA.perf.cruise.map(c => `<tr><td>${c[0]}</td><td>${c[1]}"</td><td>${c[2]}</td><td class="hl">${c[3]}</td><td>${c[4]}</td></tr>`).join("");
  document.getElementById("todo-table").innerHTML =
    DATA.perf.todo.map(t => `<tr><td>${t[0]}</td><td class="hl">${t[1]}</td></tr>`).join("");
  const sel = document.getElementById("pwr-sel");
  sel.innerHTML = DATA.perf.cruise.map((c, i) => `<option value="${i}">${c[0]} — ${c[3]} KTAS / ${c[4]} GPH</option>`).join("");
  sel.value = "1";
  sel.onchange = () => { fuelPlan(); buildNavlog(); };
  fuelPlan(); wbCalc();
  document.querySelectorAll("#wb-form input").forEach(i => { i.oninput = wbCalc; });
}
function fuelPlan() {
  const d = routeTotal(activeRoute);
  const tas = getCruiseTas(), gph = getCruiseGph();
  const w = windTriangle(routeLegs(activeRoute)[1]?.tc ?? 0, tas, wind.dir, wind.spd);
  const t = d / w.gs * 60;
  const trip = t / 60 * gph;
  const res = DATA.perf.fuel.reserveMin / 60 * gph;
  const total = trip + DATA.aircraft.taxiGal + res + 1.5;
  document.getElementById("fuel-out").innerHTML =
    `<tr><td>Route</td><td class="hl">${activeRoute.title}</td></tr>
     <tr><td>Distance</td><td>${d.toFixed(1)} NM</td></tr>
     <tr><td>Est. GS</td><td>${Math.round(w.gs)} kt</td></tr>
     <tr><td>Trip time</td><td>${fmtMin(t)}</td></tr>
     <tr><td>Trip fuel</td><td>${trip.toFixed(1)} USG</td></tr>
     <tr><td>Taxi + climb allowance</td><td>${(DATA.aircraft.taxiGal + 1.5).toFixed(1)} USG</td></tr>
     <tr><td>Reserve ${DATA.perf.fuel.reserveMin} min</td><td>${res.toFixed(1)} USG</td></tr>
     <tr class="tot"><td>MINIMUM BLOCK FUEL</td><td class="${total > DATA.perf.fuel.usableGal ? "bad" : "hl"}">${total.toFixed(1)} / ${DATA.perf.fuel.usableGal} USG usable</td></tr>`;
}
function wbCalc() {
  const wb = DATA.perf.wb;
  let mass = wb.emptyMass, mom = wb.emptyMass * wb.emptyArm;
  let rows = `<tr><th>Station</th><th>kg</th><th>Arm m</th><th>Moment</th></tr>
    <tr><td>Empty</td><td>${wb.emptyMass}</td><td>${wb.emptyArm.toFixed(2)}</td><td>${(wb.emptyMass * wb.emptyArm).toFixed(0)}</td></tr>`;
  wb.stations.forEach(s => {
    const v = +document.getElementById("wb-" + s.id).value || 0;
    mass += v; mom += v * s.arm;
    rows += `<tr><td>${s.name.split("(")[0]}</td><td>${v}</td><td>${s.arm.toFixed(2)}</td><td>${(v * s.arm).toFixed(0)}</td></tr>`;
  });
  const cg = mom / mass;
  const overMass = mass > wb.mtow;
  // interpolate forward limit
  const env = wb.envelope;
  let fwd = env[0][1];
  for (let i = 1; i < env.length; i++) {
    if (mass <= env[i][0]) { const f = (mass - env[i - 1][0]) / (env[i][0] - env[i - 1][0]); fwd = env[i - 1][1] + f * (env[i][1] - env[i - 1][1]); break; }
    fwd = env[i][1];
  }
  const inCg = cg >= fwd - 0.001 && cg <= env[0][2] + 0.001;
  rows += `<tr class="tot"><td>TOTAL</td><td class="${overMass ? "bad" : "hl"}">${mass.toFixed(0)} / ${wb.mtow}</td>
    <td class="${inCg ? "hl" : "bad"}">${cg.toFixed(3)}</td><td>${mom.toFixed(0)}</td></tr>
    <tr><td colspan="4" class="${overMass || !inCg ? "bad" : "ok"}">${overMass ? "⚠ OVER MTOW — reduce load. " : ""}${inCg ? "CG within envelope ✔" : "⚠ CG OUTSIDE limits (" + fwd.toFixed(2) + "–" + env[0][2] + " m)"}</td></tr>`;
  document.getElementById("wb-table").innerHTML = rows;
  drawEnvelope(mass, cg);
}
function drawEnvelope(mass, cg) {
  const cvE = document.getElementById("wb-canvas"), c = cvE.getContext("2d");
  const wb = DATA.perf.wb, env = wb.envelope;
  const W2 = cvE.width, H2 = cvE.height;
  c.clearRect(0, 0, W2, H2);
  const x = a => (a - 2.36) / (2.58 - 2.36) * (W2 - 50) + 40;
  const y = m => H2 - 26 - (m - 750) / (1250 - 750) * (H2 - 46);
  c.strokeStyle = "#2a3842"; c.fillStyle = "#9aa7b0"; c.font = "10px B612 Mono"; c.lineWidth = 1;
  for (let a = 2.40; a <= 2.56; a += 0.04) { c.beginPath(); c.moveTo(x(a), y(750)); c.lineTo(x(a), y(1250)); c.stroke(); c.fillText(a.toFixed(2), x(a) - 10, H2 - 8); }
  for (let m = 800; m <= 1200; m += 100) { c.beginPath(); c.moveTo(x(2.36), y(m)); c.lineTo(W2 - 6, y(m)); c.stroke(); c.fillText(m, 4, y(m) + 3); }
  c.strokeStyle = "#00ff66"; c.lineWidth = 2; c.beginPath();
  c.moveTo(x(env[0][1]), y(env[0][0]));
  env.forEach(e => c.lineTo(x(e[1]), y(e[0])));
  c.lineTo(x(env[env.length - 1][2]), y(env[env.length - 1][0]));
  c.lineTo(x(env[0][2]), y(env[0][0])); c.closePath(); c.stroke();
  c.fillStyle = "rgba(0,255,102,.07)"; c.fill();
  c.fillStyle = "#ff2ec4"; c.beginPath(); c.arc(x(cg), y(mass), 5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#ff2ec4"; c.beginPath(); c.arc(x(cg), y(mass), 9, 0, Math.PI * 2); c.stroke();
}

/* ================= lessons & phases ================= */
function buildLessons() {
  document.getElementById("lesson-cards").innerHTML = DATA.lessons.map(l =>
    `<div class="lesson-card"><div class="lesson-title">${l.title}</div><div class="lesson-body">${l.body}</div></div>`).join("");
  const prog = store.get("phaseProg", {});
  document.getElementById("phase-list").innerHTML = DATA.phases.map(p => {
    const done = (prog[p.id] || []).filter(Boolean).length;
    return `<details class="phase"><summary>${p.name} <span class="phase-count">${done}/${p.items.length}</span></summary>
      <div class="act-list">` + p.items.map((it, i) =>
      `<label class="act-item"><input type="checkbox" data-p="${p.id}" data-i="${i}" ${prog[p.id]?.[i] ? "checked" : ""}> <span>${it}</span></label>`).join("") +
      `</div></details>`;
  }).join("");
  document.querySelectorAll("#phase-list input").forEach(cb => cb.addEventListener("change", () => {
    const pr = store.get("phaseProg", {});
    pr[cb.dataset.p] = pr[cb.dataset.p] || [];
    pr[cb.dataset.p][cb.dataset.i] = cb.checked;
    store.set("phaseProg", pr); buildLessons();
  }));
}

/* ================= PDF export (print-to-PDF brief) ================= */
function exportPDF() {
  const legs = routeLegs(activeRoute);
  const rec = store.get(navlogKey(), {});
  const gph = getCruiseGph();
  let eto = 9 * 60;
  const navRows = legs.map((l, i) => {
    eto += l.ete; const r = rec[i] || {};
    return `<tr><td>${l.from.id} → ${l.to.id}${l.to.report ? " ◆" : ""}</td><td>${l.to.alt.toLocaleString()}</td>
      <td>${pad3(l.mc)}</td><td><b>${pad3(l.hdg)}</b></td><td>${l.dist.toFixed(1)}</td><td>${Math.round(l.gs)}</td>
      <td>${fmtMin(l.ete)}</td><td>${fmtClock(eto)}</td><td>${r.ato || ""}</td><td>${(l.ete / 60 * gph).toFixed(1)}</td><td>${r.fuel || ""}</td><td>${r.rmk || ""}</td></tr>`;
  }).join("");
  const s = atcFor(activeRoute.id);
  const atcRows = [...s.ground, ...s.enroute, ...s.arrival].map(ev =>
    `<div class="b-atc"><b>${ev.station}${ev.frac !== undefined ? ` (${Math.round(ev.frac * 100)}%)` : ""}</b><br>ATC: ${ev.atc}<br><i>YOU: ${ev.pilot}</i></div>`).join("");
  const wptRows = activeRoute.wpts.map(w =>
    `<tr><td><b>${w.id}</b> ${w.name}${w.report ? " ◆RP" : ""}</td><td>${w.alt.toLocaleString()} ft${w.spd ? " · " + w.spd + " kt" : ""}</td><td>${w.comment || ""}</td></tr>`).join("");
  const noteRows = notes.length ? `<h2>Map notes</h2><ul>` + notes.map(n => `<li>${(n.text || "").replace(/</g, "&lt;")} <i>(${n.lat.toFixed(3)}, ${n.lon.toFixed(3)})</i></li>`).join("") + `</ul>` : "";
  const freqs = [activeRoute.dep, activeRoute.dest].map(k => { const ap = apOf(k, activeRoute); return `<b>${ap.icao}</b> ${ap.freqs.map(f => `${f[0]} ${f[1]}`).join(" · ") || "—"}`; }).join("<br>");
  document.getElementById("brief").innerHTML = `
    <h1>NU'S DRY RUN — FLIGHT BRIEF</h1>
    <p class="b-meta">${activeRoute.title} · ${DATA.aircraft.type} ${DATA.aircraft.reg} · ${DATA.aircraft.callsign} ·
      W/V ${pad3(wind.dir)}/${wind.spd} · VAR ${VAR}°W · printed ${new Date().toLocaleString()} · TRAINING AID ONLY</p>
    <h2>Nav log</h2>
    <table><tr><th>Leg</th><th>ALT</th><th>MC°</th><th>HDG°</th><th>DIST</th><th>GS</th><th>ETE</th><th>ETO</th><th>ATO</th><th>Fuel pl</th><th>Fuel act</th><th>Remarks</th></tr>${navRows}</table>
    <p>Total ${routeTotal(activeRoute).toFixed(1)} NM · ${fmtMin(legs.reduce((x, l) => x + l.ete, 0))} ·
      trip fuel ${(legs.reduce((x, l) => x + l.ete, 0) / 60 * gph).toFixed(1)} USG + taxi ${DATA.aircraft.taxiGal} + reserve ${(gph * 0.75).toFixed(1)} USG</p>
    <h2>Waypoint briefing (◆ = compulsory report)</h2>
    <table><tr><th>Waypoint</th><th>Plan</th><th>Notes</th></tr>${wptRows}</table>
    <h2>Frequencies</h2><p>${freqs}<br>Bangkok Information 122.7 · Emergency 121.5 · VFR squawk 1200</p>
    <h2>Radio script</h2>${atcRows}
    ${noteRows}`;
  document.body.classList.add("printing-brief");
  const done = () => { document.body.classList.remove("printing-brief"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  window.print();
  setTimeout(done, 2000);
}

/* ================= route select / tabs / boot ================= */
function buildRouteSel(selId) {
  const rs = document.getElementById("route-sel");
  rs.innerHTML = DATA.routes.map(r => `<option value="${r.id}">${r.title}</option>`).join("");
  rs.value = selId || DATA.routes[0].id;
}
function refreshAll() {
  if (!DATA.routes.find(r => r.id === activeRoute.id)) activeRoute = DATA.routes[0];
  buildRouteSel(activeRoute.id);
  buildPerf();
  selectRoute(activeRoute.id);
  buildLessons();
}
function selectRoute(id) {
  activeRoute = DATA.routes.find(r => r.id === id) || DATA.routes[0];
  document.getElementById("route-sel").value = id;
  pauseSim(); sim.s = 0; sim.phase = "ground"; sim.groundIdx = 0; sim.nextEv = 0;
  if (acMarker) { layerAC.clearLayers(); acMarker = null; }
  document.getElementById("btn-startpause").textContent = "▶ START";
  drawRoutes(); buildNavlog(); buildAtcTab(); buildEvents(); fuelPlan(); buildG1000Fpl();
  document.getElementById("sim-stats").textContent = "Ready — press START for the full chair flight.";
  document.getElementById("sim-prog").style.width = "0";
  autoFit = true;
  setTimeout(() => { map.invalidateSize(); fitActive(); }, 120);
}
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(x => x.classList.remove("on"));
    document.querySelectorAll(".tab-page").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    document.getElementById("page-" + b.dataset.tab).classList.add("on");
    if (b.dataset.tab === "dryrun") setTimeout(() => map.invalidateSize(), 60);
    if (b.dataset.tab === "g1000") setTimeout(() => G1000.redraw(), 60);
  }));
}

window.addEventListener("DOMContentLoaded", () => {
  initMap(); initTabs();
  G1000.init(document.getElementById("pfd"));
  const rs = document.getElementById("route-sel");
  rs.innerHTML = DATA.routes.map(r => `<option value="${r.id}">${r.title}</option>`).join("");
  rs.addEventListener("change", () => selectRoute(rs.value));
  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));
  document.getElementById("btn-clear-user").addEventListener("click", () => {
    if (confirm("Delete ALL your drawn waypoints?")) { userWpts = []; saveUser(); }
  });
  document.getElementById("btn-startpause").addEventListener("click", () => {
    if (sim.running) pauseSim();
    else if (sim.s === 0 && sim.phase === "ground" && sim.groundIdx === 0) startSim();
    else resumeSim();
  });
  document.getElementById("spd-sel").addEventListener("change", e => sim.spd = +e.target.value);
  ["wind-dir", "wind-spd"].forEach(id => document.getElementById(id).addEventListener("change", () => {
    wind.dir = +document.getElementById("wind-dir").value || 0;
    wind.spd = +document.getElementById("wind-spd").value || 0;
    buildNavlog(); fuelPlan(); drawRoutes(); buildG1000Fpl();
  }));
  document.getElementById("btn-print").addEventListener("click", () => window.print());
  document.getElementById("btn-pdf").addEventListener("click", exportPDF);
  document.getElementById("btn-pdf2").addEventListener("click", exportPDF);
  if (typeof initEditTab === "function") initEditTab();
  buildNavlog(); buildAtcTab(); buildPerf(); buildLessons();
  selectRoute(DATA.routes[0].id);
});
