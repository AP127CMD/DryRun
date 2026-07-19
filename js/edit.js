/* ============================================================
   NU'S DRY RUN — EDIT tab
   Everything is configurable and saved (localStorage via
   saveDATA() in data.js): aircraft params, routes/waypoints,
   ATC radio scripts, VORs, and a flight-plan style text input
   (VOR/radial/dist refs, altitude & speed changes).
   ============================================================ */

"use strict";

let editRouteId = null;

function initEditTab() {
  editRouteId = DATA.routes[0]?.id || null;
  buildEditTab();
}

function edEsc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

/* ================= main builder ================= */
function buildEditTab() {
  const host = document.getElementById("edit-host");
  if (!host) return;
  const rt = DATA.routes.find(r => r.id === editRouteId) || DATA.routes[0];
  editRouteId = rt?.id || null;

  host.innerHTML = `
  <div class="ed-grid">

    <div class="perf-card">
      <h3>AIRCRAFT & GENERAL</h3>
      <div class="ed-form">
        ${edField("ac-type", "Type", DATA.aircraft.type)}
        ${edField("ac-reg", "Registration", DATA.aircraft.reg)}
        ${edField("ac-callsign", "Callsign", DATA.aircraft.callsign)}
        ${edField("ac-tas", "Cruise TAS (kt)", DATA.aircraft.tas, "number")}
        ${edField("ac-climbTas", "Climb TAS (kt)", DATA.aircraft.climbTas, "number")}
        ${edField("ac-climbFpm", "Climb rate (fpm)", DATA.aircraft.climbFpm, "number")}
        ${edField("ac-taxiGal", "Taxi fuel (USG)", DATA.aircraft.taxiGal, "number")}
      </div>
      <button class="primary" id="ed-save-ac">💾 SAVE AIRCRAFT</button>

      <h3 style="margin-top:18px">VOR / NAVAID TABLE (for FPL input)</h3>
      <table class="ed-table"><tr><th>ID</th><th>Name</th><th>Lat</th><th>Lon</th><th></th></tr>
        ${Object.entries(DATA.vors).map(([id, v]) => `<tr>
          <td><b>${id}</b></td>
          <td><input data-vor="${id}" data-f="name" value="${edEsc(v.name)}" class="wide"></td>
          <td><input data-vor="${id}" data-f="lat" value="${v.lat}" size="8"></td>
          <td><input data-vor="${id}" data-f="lon" value="${v.lon}" size="8"></td>
          <td><button class="ed-x" data-delvor="${id}">✕</button></td></tr>`).join("")}
      </table>
      <div class="ed-row"><input id="ed-newvor" placeholder="NEW ID" size="6"><button id="ed-addvor">+ ADD VOR</button>
      <button class="primary" id="ed-save-vor">💾 SAVE VORS</button></div>
    </div>

    <div class="perf-card">
      <h3>FLIGHT-PLAN INPUT → ROUTE</h3>
      <div class="ed-help">One waypoint per line:<br>
        <code>ID&nbsp; POSITION&nbsp; [ALT ft]&nbsp; [SPD kt]&nbsp; [RP]&nbsp; [# note]</code><br>
        POSITION = <code>lat,lon</code> &nbsp;or&nbsp; <code>VOR/RADIAL/DIST</code> (e.g. <code>HHN/030/12</code>)<br>
        Optional first line: <code>TITLE: My flight | CRZ 4500</code><br>
        First/last ID = airport ICAO if known (VTPH / VTBP / VTBK).</div>
      <textarea id="fpl-text" rows="10" spellcheck="false">${edEsc(store.get("fplText",
`TITLE: FPL Demo VTPH local | CRZ 3500
VTPH 12.6362,99.9515 62 # depart RWY 16
PT1  HHN/360/10 2500 100 RP # north along coast, slow cruise
PT2  HHN/030/18 3500 120 # turn inland
VTPH 12.6362,99.9515 62 # rejoin for landing`))}</textarea>
      <div class="ed-row">
        <button class="primary" id="fpl-apply">✔ PARSE → SAVE AS ROUTE</button>
        <button id="fpl-check">CHECK ONLY</button>
      </div>
      <div id="fpl-out" class="ed-out"></div>
    </div>

    <div class="perf-card" style="grid-column:1/-1">
      <h3>ROUTE EDITOR</h3>
      <div class="ed-row">
        <select id="ed-route-sel">${DATA.routes.map(r => `<option value="${r.id}" ${r.id === editRouteId ? "selected" : ""}>${edEsc(r.title)}</option>`).join("")}</select>
        <button id="ed-route-new">+ NEW ROUTE</button>
        <button id="ed-route-dup">⧉ DUPLICATE</button>
        <button class="ed-x" id="ed-route-del">✕ DELETE ROUTE</button>
      </div>
      ${rt ? `
      <div class="ed-form ed-form-row">
        ${edField("rt-title", "Title", rt.title)}
        ${edField("rt-id", "ID", rt.id)}
        ${edField("rt-cruise", "Cruise alt (ft)", rt.cruiseAlt, "number")}
        ${edField("rt-dep", "Departure", rt.dep)}
        ${edField("rt-dest", "Destination", rt.dest)}
      </div>
      <div style="overflow-x:auto"><table class="ed-table" id="ed-wpts">
        <tr><th></th><th>ID</th><th>Name</th><th>Lat</th><th>Lon</th><th>ALT ft</th><th>SPD kt</th><th>RP</th><th>Comment / briefing note</th><th></th></tr>
        ${rt.wpts.map((w, i) => `<tr>
          <td class="ed-mv"><button data-up="${i}">▲</button><button data-dn="${i}">▼</button></td>
          <td><input data-w="${i}" data-f="id" value="${edEsc(w.id)}" size="6"></td>
          <td><input data-w="${i}" data-f="name" value="${edEsc(w.name)}" size="14"></td>
          <td><input data-w="${i}" data-f="lat" value="${w.lat}" size="9"></td>
          <td><input data-w="${i}" data-f="lon" value="${w.lon}" size="9"></td>
          <td><input data-w="${i}" data-f="alt" value="${w.alt}" size="6"></td>
          <td><input data-w="${i}" data-f="spd" value="${w.spd ?? ""}" size="5" placeholder="-"></td>
          <td><input type="checkbox" data-w="${i}" data-f="report" ${w.report ? "checked" : ""}></td>
          <td><input data-w="${i}" data-f="comment" value="${edEsc(w.comment)}" class="wide" style="width:100%;min-width:260px"></td>
          <td><button class="ed-x" data-delw="${i}">✕</button></td></tr>`).join("")}
      </table></div>
      <div class="ed-row"><button id="ed-addw">+ ADD WAYPOINT</button>
        <button class="primary" id="ed-save-route">💾 SAVE ROUTE</button></div>

      <h3 style="margin-top:20px">ATC / RADIO SCRIPT — ${edEsc(rt.title)}</h3>
      <div class="ed-help">Edit every transmission. <b>frac</b> = where along the route the call fires (0–100%). Ground calls fire in order before takeoff; arrival calls near the destination.</div>
      ${["ground", "enroute", "arrival"].map(ph => {
        const evs = atcFor(rt.id)[ph];
        return `<h4 class="ed-ph">${ph.toUpperCase()}</h4>` + evs.map((ev, i) => `
        <div class="ed-atc">
          <div class="ed-row">
            <input data-a="${ph}:${i}" data-f="station" value="${edEsc(ev.station)}" size="26" placeholder="Station / freq">
            ${ph === "enroute" ? `<label class="lbl">frac % <input data-a="${ph}:${i}" data-f="frac" value="${Math.round((ev.frac ?? 0) * 100)}" size="3"></label>` : ""}
            <button class="ed-x" data-dela="${ph}:${i}">✕</button>
          </div>
          <label class="ed-lbl">ATC says</label>
          <textarea data-a="${ph}:${i}" data-f="atc" rows="2">${edEsc(ev.atc)}</textarea>
          <label class="ed-lbl">Your readback / action</label>
          <textarea data-a="${ph}:${i}" data-f="pilot" rows="2">${edEsc(ev.pilot)}</textarea>
          <label class="ed-lbl">Tip (optional)</label>
          <input data-a="${ph}:${i}" data-f="tip" value="${edEsc(ev.tip || "")}" class="wide" style="width:100%">
        </div>`).join("") + `<button data-adda="${ph}">+ ADD ${ph.toUpperCase()} CALL</button>`;
      }).join("")}
      <div class="ed-row" style="margin-top:12px"><button class="primary" id="ed-save-atc">💾 SAVE ATC SCRIPT</button></div>
      ` : `<div class="ed-help">No routes — create one.</div>`}
    </div>

    <div class="perf-card" style="grid-column:1/-1">
      <h3>BACKUP / ADVANCED</h3>
      <div class="ed-row">
        <button id="ed-export">⬇ EXPORT FULL CONFIG (JSON)</button>
        <label class="lbl" style="cursor:pointer">⬆ IMPORT CONFIG <input type="file" id="ed-import" accept=".json" style="display:none"></label>
        <button class="ed-x" id="ed-reset">⟲ RESET EVERYTHING TO FACTORY DEFAULTS</button>
      </div>
      <div class="ed-help">Advanced: edit the entire dataset (perf tables, checklists, lessons, airports, activities…) as JSON, then APPLY.</div>
      <textarea id="ed-json" rows="8" spellcheck="false"></textarea>
      <div class="ed-row"><button id="ed-json-load">LOAD CURRENT</button><button class="primary" id="ed-json-apply">✔ APPLY JSON</button></div>
      <div id="ed-json-out" class="ed-out"></div>
    </div>
  </div>`;

  wireEditTab(rt);
}

function edField(id, label, val, type = "text") {
  return `<label>${label} <input id="${id}" type="${type}" value="${edEsc(val)}"></label>`;
}

/* ================= wiring ================= */
function wireEditTab(rt) {
  const $ = id => document.getElementById(id);

  $("ed-save-ac").onclick = () => {
    const a = DATA.aircraft;
    a.type = $("ac-type").value; a.reg = $("ac-reg").value; a.callsign = $("ac-callsign").value;
    a.tas = +$("ac-tas").value || 120; a.climbTas = +$("ac-climbTas").value || 75;
    a.climbFpm = +$("ac-climbFpm").value || 700; a.taxiGal = +$("ac-taxiGal").value || 1;
    saveDATA(); refreshAll(); flash("Aircraft saved ✔");
  };

  /* VORs */
  document.querySelectorAll("[data-vor]").forEach(inp => inp.onchange = () => {
    const v = DATA.vors[inp.dataset.vor];
    v[inp.dataset.f] = inp.dataset.f === "name" ? inp.value : +inp.value;
  });
  document.querySelectorAll("[data-delvor]").forEach(b => b.onclick = () => { delete DATA.vors[b.dataset.delvor]; saveDATA(); buildEditTab(); });
  $("ed-addvor").onclick = () => {
    const id = ($("ed-newvor").value || "").trim().toUpperCase();
    if (!id) return;
    DATA.vors[id] = { name: id, lat: 13.0, lon: 100.0 };
    saveDATA(); buildEditTab();
  };
  $("ed-save-vor").onclick = () => { saveDATA(); flash("VORs saved ✔"); };

  /* FPL input */
  $("fpl-check").onclick = () => fplRun(false);
  $("fpl-apply").onclick = () => fplRun(true);

  if (!rt) return wireBackup();

  /* route editor */
  $("ed-route-sel").onchange = e => { editRouteId = e.target.value; buildEditTab(); };
  $("ed-route-new").onclick = () => {
    const id = "RT" + (DATA.routes.length + 1);
    DATA.routes.push({ id, title: "New route " + id, cruiseAlt: 3500, dep: "VTPH", dest: "VTPH",
      wpts: [{ id: "VTPH", name: "Hua Hin", lat: 12.6362, lon: 99.9515, alt: 62, report: true, comment: "" },
             { id: "VTPH", name: "Hua Hin", lat: 12.6362, lon: 99.9515, alt: 62, report: true, comment: "" }] });
    editRouteId = id; saveDATA(); refreshAll(); buildEditTab();
  };
  $("ed-route-dup").onclick = () => {
    const cp = JSON.parse(JSON.stringify(rt));
    cp.id = rt.id + "-C"; cp.title = rt.title + " (copy)";
    DATA.routes.push(cp);
    if (DATA.atc[rt.id]) DATA.atc[cp.id] = JSON.parse(JSON.stringify(DATA.atc[rt.id]));
    editRouteId = cp.id; saveDATA(); refreshAll(); buildEditTab();
  };
  $("ed-route-del").onclick = () => {
    if (DATA.routes.length <= 1) return alert("Keep at least one route.");
    if (!confirm(`Delete route "${rt.title}" and its ATC script?`)) return;
    DATA.routes = DATA.routes.filter(r => r.id !== rt.id);
    delete DATA.atc[rt.id];
    editRouteId = DATA.routes[0].id;
    saveDATA(); refreshAll(); buildEditTab();
  };

  /* waypoint rows: write-through on change */
  document.querySelectorAll("[data-w]").forEach(inp => inp.onchange = () => {
    const w = rt.wpts[+inp.dataset.w], f = inp.dataset.f;
    if (f === "report") w.report = inp.checked;
    else if (["lat", "lon", "alt", "spd"].includes(f)) { const n = parseFloat(inp.value); if (f === "spd") w.spd = n || undefined; else if (!isNaN(n)) w[f] = n; }
    else w[f] = inp.value;
  });
  document.querySelectorAll("[data-delw]").forEach(b => b.onclick = () => { rt.wpts.splice(+b.dataset.delw, 1); saveDATA(); buildEditTab(); });
  document.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { const i = +b.dataset.up; if (i > 0) { [rt.wpts[i - 1], rt.wpts[i]] = [rt.wpts[i], rt.wpts[i - 1]]; saveDATA(); buildEditTab(); } });
  document.querySelectorAll("[data-dn]").forEach(b => b.onclick = () => { const i = +b.dataset.dn; if (i < rt.wpts.length - 1) { [rt.wpts[i + 1], rt.wpts[i]] = [rt.wpts[i], rt.wpts[i + 1]]; saveDATA(); buildEditTab(); } });
  $("ed-addw").onclick = () => {
    const last = rt.wpts[rt.wpts.length - 1];
    rt.wpts.push({ id: "WP" + rt.wpts.length, name: "New waypoint", lat: last?.lat ?? 13, lon: last?.lon ?? 100, alt: rt.cruiseAlt, report: false, comment: "" });
    saveDATA(); buildEditTab();
  };
  $("ed-save-route").onclick = () => {
    rt.title = $("rt-title").value; rt.cruiseAlt = +$("rt-cruise").value || rt.cruiseAlt;
    rt.dep = $("rt-dep").value.trim().toUpperCase(); rt.dest = $("rt-dest").value.trim().toUpperCase();
    const newId = $("rt-id").value.trim();
    if (newId && newId !== rt.id) {
      if (DATA.atc[rt.id]) { DATA.atc[newId] = DATA.atc[rt.id]; delete DATA.atc[rt.id]; }
      rt.id = newId;
    }
    editRouteId = rt.id;
    saveDATA(); refreshAll(); buildEditTab(); flash("Route saved ✔");
  };

  /* ATC editor: write-through, add, delete */
  const scr = atcFor(rt.id);
  if (!DATA.atc[rt.id]) DATA.atc[rt.id] = scr;
  document.querySelectorAll("[data-a]").forEach(inp => inp.onchange = () => {
    const [ph, i] = inp.dataset.a.split(":");
    const ev = DATA.atc[rt.id][ph][+i], f = inp.dataset.f;
    if (f === "frac") ev.frac = Math.max(0, Math.min(100, +inp.value || 0)) / 100;
    else ev[f] = inp.value;
  });
  document.querySelectorAll("[data-dela]").forEach(b => b.onclick = () => {
    const [ph, i] = b.dataset.dela.split(":");
    DATA.atc[rt.id][ph].splice(+i, 1); saveDATA(); buildEditTab();
  });
  document.querySelectorAll("[data-adda]").forEach(b => b.onclick = () => {
    const ph = b.dataset.adda;
    const ev = { station: "Station 123.45", atc: "New transmission…", pilot: "Readback…", tip: "" };
    if (ph === "enroute") ev.frac = 0.5;
    DATA.atc[rt.id][ph].push(ev); saveDATA(); buildEditTab();
  });
  $("ed-save-atc").onclick = () => { saveDATA(); buildAtcTab(); buildEvents(); flash("ATC script saved ✔"); };

  wireBackup();
}

function wireBackup() {
  const $ = id => document.getElementById(id);
  $("ed-export").onclick = () => {
    const blob = new Blob([JSON.stringify({ config: DATA, mapNotes: store.get("mapNotes", []), userWpts: store.get("userWpts", []), fplText: store.get("fplText", "") }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nus-dryrun-config.json"; a.click();
  };
  $("ed-import").onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => {
      const j = JSON.parse(t);
      if (j.config && j.config.routes) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(j.config));
        if (j.mapNotes) store.set("mapNotes", j.mapNotes);
        if (j.userWpts) store.set("userWpts", j.userWpts);
        if (j.fplText) store.set("fplText", j.fplText);
        location.reload();
      } else alert("Not a Nu's Dry Run config file.");
    }).catch(() => alert("Could not read that file."));
  };
  $("ed-reset").onclick = () => { if (confirm("Reset ALL settings, routes and ATC scripts to factory defaults? (Nav logs, notes and drawings are kept.)")) resetDATA(); };
  $("ed-json-load").onclick = () => { $("ed-json").value = JSON.stringify(DATA, null, 2); };
  $("ed-json-apply").onclick = () => {
    try {
      const j = JSON.parse($("ed-json").value);
      if (!j.routes || !j.aircraft) throw new Error("must contain routes + aircraft");
      Object.keys(DATA).forEach(k => delete DATA[k]); Object.assign(DATA, j);
      saveDATA(); refreshAll(); buildEditTab();
      $("ed-json-out").textContent = "Applied & saved ✔";
    } catch (e) { $("ed-json-out").textContent = "✗ " + e.message; }
  };
}

/* ================= FPL parser ================= */
function parseFPL(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && !/^#/.test(l));
  let title = "FPL route", crz = 3500;
  const wpts = [], errors = [];
  lines.forEach((line, ln) => {
    const mTitle = line.match(/^TITLE:\s*([^|]+)(\|\s*CRZ\s+(\d+))?/i);
    if (mTitle) { title = mTitle[1].trim(); if (mTitle[3]) crz = +mTitle[3]; return; }
    const [head, ...cmt] = line.split("#");
    const comment = cmt.join("#").trim();
    const tk = head.trim().split(/\s+/);
    if (tk.length < 2) return errors.push(`line ${ln + 1}: need at least ID + position`);
    const id = tk[0].toUpperCase();
    let lat, lon, posTxt = tk[1];
    const mLL = posTxt.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    const mVOR = posTxt.match(/^([A-Z]{2,4})\/(\d{1,3})\/(\d{1,3}(?:\.\d+)?)$/i);
    if (mLL) { lat = +mLL[1]; lon = +mLL[2]; }
    else if (mVOR) {
      const v = DATA.vors[mVOR[1].toUpperCase()];
      if (!v) return errors.push(`line ${ln + 1}: unknown VOR "${mVOR[1].toUpperCase()}" (add it in the VOR table)`);
      const p = destPoint(v.lat, v.lon, (+mVOR[2] - VAR + 360) % 360, +mVOR[3]);
      lat = p.lat; lon = p.lon;
    } else return errors.push(`line ${ln + 1}: position "${posTxt}" is neither lat,lon nor VOR/RDL/DIST`);
    let alt = null, spd = null, report = false;
    tk.slice(2).forEach(t => {
      if (/^RP$/i.test(t)) report = true;
      else if (/^\d+(\.\d+)?$/.test(t)) { if (alt === null) alt = +t; else if (spd === null) spd = +t; }
    });
    wpts.push({ id, name: id, lat, lon, alt: alt ?? crz, spd: spd || undefined, report, comment });
  });
  if (wpts.length < 2) errors.push("need at least 2 waypoints");
  return { title, crz, wpts, errors };
}

function fplRun(apply) {
  const text = document.getElementById("fpl-text").value;
  store.set("fplText", text);
  const out = document.getElementById("fpl-out");
  const p = parseFPL(text);
  if (p.errors.length) { out.innerHTML = "✗ " + p.errors.join("<br>✗ "); return; }
  let html = `✔ ${p.wpts.length} waypoints, ${p.wpts.slice(1).reduce((s, w, i) => s + distNM(p.wpts[i], w), 0).toFixed(1)} NM — "${edEsc(p.title)}" CRZ ${p.crz} ft<br>`;
  html += p.wpts.map(w => `&nbsp;&nbsp;${w.id} ${w.lat.toFixed(4)},${w.lon.toFixed(4)} ${w.alt}ft${w.spd ? " " + w.spd + "kt" : ""}${w.report ? " RP" : ""}${w.comment ? " — " + edEsc(w.comment) : ""}`).join("<br>");
  if (apply) {
    const id = "FPL-" + (DATA.routes.filter(r => r.id.startsWith("FPL")).length + 1);
    DATA.routes.push({ id, title: p.title, cruiseAlt: p.crz, dep: p.wpts[0].id, dest: p.wpts[p.wpts.length - 1].id, wpts: p.wpts });
    editRouteId = id;
    saveDATA(); refreshAll(); buildEditTab();
    document.getElementById("fpl-out").innerHTML = html + `<br><b style="color:var(--grn)">Saved as route "${edEsc(p.title)}" and activated — see DRY RUN tab. Add ATC calls for it below if you like.</b>`;
    selectRoute(id);
    return;
  }
  out.innerHTML = html;
}

function flash(msg) {
  const d = document.createElement("div");
  d.className = "flash"; d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1800);
}
