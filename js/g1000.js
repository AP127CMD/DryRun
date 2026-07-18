/* ============================================================
   AP127 DRY RUN — simplified G1000-style PFD renderer (canvas)
   Draws: attitude, airspeed tape, altitude tape, HSI + CDI,
   nav data bar. Driven by an external state object.
   ============================================================ */

const G1000 = (() => {
  let cv, ctx, W, H;

  const state = {
    ias: 0, alt: 62, hdg: 160, trk: 160, dtk: 160,
    xtk: 0,          // NM, + = right of course
    gs: 0, vs: 0, roll: 0, pitch: 0,
    wptId: "----", dis: 0, ete: "--:--", navSrc: "GPS"
  };

  function init(canvas) {
    cv = canvas; ctx = cv.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    draw();
  }
  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(320, r.width) * dpr;
    cv.height = Math.round(cv.width * 0.86);
    cv.style.height = (cv.height / dpr) + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = cv.width / dpr; H = cv.height / dpr;
    draw();
  }
  function set(patch) { Object.assign(state, patch); draw(); }

  /* ---------- helpers ---------- */
  const F = { mono: "B612 Mono, monospace" };
  function txt(s, x, y, size, color, align = "left", bold = false) {
    ctx.fillStyle = color;
    ctx.font = `${bold ? "700 " : ""}${size}px ${F.mono}`;
    ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  }
  const norm = a => ((a % 360) + 360) % 360;

  /* ---------- attitude ---------- */
  function drawAttitude(x, y, w, h) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const cx = x + w / 2, cy = y + h / 2;
    const pxDeg = h / 44;                       // pixels per degree pitch
    ctx.translate(cx, cy);
    ctx.rotate(-state.roll * Math.PI / 180);
    ctx.translate(0, state.pitch * pxDeg);
    // sky / ground
    ctx.fillStyle = "#1c86d1"; ctx.fillRect(-w, -h * 2, w * 2, h * 2);
    ctx.fillStyle = "#7a4a12"; ctx.fillRect(-w, 0, w * 2, h * 2);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(w, 0); ctx.stroke();
    // pitch ladder
    for (let p = -30; p <= 30; p += 5) {
      if (p === 0) continue;
      const len = p % 10 === 0 ? 46 : 24, yy = -p * pxDeg;
      ctx.beginPath(); ctx.moveTo(-len / 2, yy); ctx.lineTo(len / 2, yy); ctx.stroke();
      if (p % 10 === 0) { txt(Math.abs(p), -len / 2 - 16, yy, 11, "#fff", "center"); txt(Math.abs(p), len / 2 + 16, yy, 11, "#fff", "center"); }
    }
    ctx.restore();
    // fixed aircraft symbol
    ctx.strokeStyle = "#ffe500"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy); ctx.lineTo(cx - 22, cy); ctx.lineTo(cx - 14, cy + 8);
    ctx.moveTo(cx + 60, cy); ctx.lineTo(cx + 22, cy); ctx.lineTo(cx + 14, cy + 8);
    ctx.stroke();
    ctx.fillStyle = "#ffe500"; ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
  }

  /* ---------- vertical tape ---------- */
  function tape(x, y, w, h, value, step, perPx, fmt, boxColor) {
    ctx.save();
    ctx.fillStyle = "rgba(10,14,18,.82)"; ctx.fillRect(x, y, w, h);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const cy = y + h / 2;
    const lo = value - h / 2 / perPx, hi = value + h / 2 / perPx;
    const start = Math.floor(lo / step) * step;
    ctx.strokeStyle = "#d7dde2"; ctx.lineWidth = 1.2;
    for (let v = start; v <= hi; v += step) {
      if (v < 0) continue;
      const yy = cy - (v - value) * perPx;
      ctx.beginPath(); ctx.moveTo(x + w - 12, yy); ctx.lineTo(x + w, yy); ctx.stroke();
      txt(fmt(v), x + w - 16, yy, 13, "#d7dde2", "right");
    }
    ctx.restore();
    // value box
    ctx.fillStyle = "#000"; ctx.strokeStyle = boxColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(x + 2, cy - 14, w - 4, 28); ctx.fill(); ctx.stroke();
    txt(fmt(Math.round(value)), x + w - 10, cy, 17, "#fff", "right", true);
  }

  /* ---------- HSI ---------- */
  function drawHSI(cx, cy, r) {
    ctx.save();
    ctx.fillStyle = "rgba(10,14,18,.85)";
    ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.fill();
    // compass rose rotates with heading
    for (let d = 0; d < 360; d += 5) {
      const a = (d - state.hdg) * Math.PI / 180 - Math.PI / 2;
      const len = d % 30 === 0 ? 12 : (d % 10 === 0 ? 8 : 4);
      ctx.strokeStyle = "#e8edf1"; ctx.lineWidth = d % 30 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * (r - len), cy + Math.sin(a) * (r - len));
      ctx.stroke();
      const showLbl = r > 80 ? d % 30 === 0 : d % 90 === 0;
      if (showLbl) {
        const lbl = d % 90 === 0 ? "NESW"[d / 90] : d / 10;
        const rr = r - Math.max(18, r * 0.26);
        ctx.save();
        ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        ctx.rotate(a + Math.PI / 2);
        txt(lbl, 0, 0, d % 90 === 0 ? Math.max(12, r * 0.17) : Math.max(10, r * 0.13), "#e8edf1", "center", d % 90 === 0);
        ctx.restore();
      }
    }
    // course pointer + CDI (magenta = GPS)
    const ca = (state.dtk - state.hdg) * Math.PI / 180 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ca + Math.PI / 2);
    ctx.strokeStyle = "#ff2ec4"; ctx.fillStyle = "#ff2ec4"; ctx.lineWidth = 3;
    // course arrow
    ctx.beginPath(); ctx.moveTo(0, -r + 4); ctx.lineTo(0, -r * 0.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r + 2); ctx.lineTo(-7, -r + 16); ctx.lineTo(7, -r + 16); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, r - 4); ctx.lineTo(0, r * 0.42); ctx.stroke();
    // deviation dots (2 NM full scale, 1 dot = 1 NM at ENR)
    ctx.fillStyle = "#e8edf1";
    for (const d of [-2, -1, 1, 2]) {
      ctx.beginPath(); ctx.arc(d * r * 0.19, 0, 3, 0, Math.PI * 2); ctx.fill();
    }
    // CDI bar deflected by xtk
    const dev = Math.max(-2, Math.min(2, state.xtk)) * r * 0.19;
    ctx.strokeStyle = "#ff2ec4"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-dev, -r * 0.40) ; ctx.lineTo(-dev, r * 0.40); ctx.stroke();
    ctx.restore();
    // aircraft symbol
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 10);
    ctx.moveTo(cx - 9, cy - 2); ctx.lineTo(cx + 9, cy - 2);
    ctx.moveTo(cx - 5, cy + 8); ctx.lineTo(cx + 5, cy + 8);
    ctx.stroke();
    // heading box
    ctx.fillStyle = "#000"; ctx.strokeStyle = "#8a97a0"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(cx - 30, cy - r - 34, 60, 24); ctx.fill(); ctx.stroke();
    txt(String(Math.round(norm(state.hdg))).padStart(3, "0") + "°", cx, cy - r - 22, 16, "#fff", "center", true);
    ctx.restore();
  }

  /* ---------- main draw ---------- */
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#05070a"; ctx.fillRect(0, 0, W, H);

    const barH = 30;
    // nav data bar
    ctx.fillStyle = "#0b1116"; ctx.fillRect(0, 0, W, barH);
    ctx.strokeStyle = "#1d2830"; ctx.strokeRect(0.5, 0.5, W - 1, barH - 1);
    txt("GS", 12, barH / 2, 11, "#9aa7b0"); txt(Math.round(state.gs) + "kt", 36, barH / 2, 13, "#ff2ec4", "left", true);
    txt("DTK", W * 0.22, barH / 2, 11, "#9aa7b0"); txt(String(Math.round(norm(state.dtk))).padStart(3, "0") + "°", W * 0.22 + 32, barH / 2, 13, "#ff2ec4", "left", true);
    txt("TRK", W * 0.42, barH / 2, 11, "#9aa7b0"); txt(String(Math.round(norm(state.trk))).padStart(3, "0") + "°", W * 0.42 + 32, barH / 2, 13, "#ff2ec4", "left", true);
    txt("WPT", W * 0.60, barH / 2, 11, "#9aa7b0"); txt(state.wptId, W * 0.60 + 34, barH / 2, 13, "#00e5ff", "left", true);
    txt("DIS", W * 0.78, barH / 2, 11, "#9aa7b0"); txt(state.dis.toFixed(1) + "nm", W * 0.78 + 30, barH / 2, 13, "#ff2ec4", "left", true);

    const top = barH + 6;
    const attW = W * 0.60, attH = H * 0.46;
    const attX = W * 0.20, attY = top;
    drawAttitude(attX, attY, attW, attH);

    // tapes
    tape(8, attY, W * 0.17, attH, state.ias, 10, attH / 90, v => String(Math.round(v)), "#8a97a0");
    txt("IAS", 8 + W * 0.085, attY - 2 + attH + 12, 11, "#9aa7b0", "center");
    tape(W - 8 - W * 0.17, attY, W * 0.17, attH, state.alt, 100, attH / 900, v => String(Math.round(v)), "#8a97a0");
    txt("ALT  " + (state.vs >= 0 ? "+" : "") + Math.round(state.vs) + " fpm", W - 8 - W * 0.085, attY + attH + 12, 11, "#9aa7b0", "center");

    // HSI — sized to fit the space remaining below the tapes
    const r = Math.max(40, Math.min(W * 0.17, (H - attY - attH - 52) / 2));
    drawHSI(W / 2, attY + attH + r + 40, r);

    // ETE + nav source
    txt("ETE " + state.ete, W * 0.82, attY + attH + 30, 13, "#00e5ff", "left", true);
    txt(state.navSrc, W * 0.13, attY + attH + 30, 13, "#ff2ec4", "left", true);
  }

  return { init, set, state, redraw: draw };
})();
