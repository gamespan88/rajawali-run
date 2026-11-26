// hud.js — the v3 flight-deck HUD: dark glass panels with chamfered
// corners, phosphor-green symbology, scrolling airspeed / altitude
// tapes, a compass tape, a pitch ladder with a flight-path vector, a
// radar scope, engine and waypoint data blocks — modelled on real
// glass-cockpit and HUD design (PFD tapes, F-16 symbology, Ace
// Combat's layout), so it reads like a real flight game.

const PHOS = "#4dff9e";
const CYAN = "#53e0ff";
const GOLD = "#ffb340";
const RED = "#ff5347";
const AMBER = "#ffb340";
const DIM = "#7d93a5";
const PALE = "#eafff3";
const GLASS = "rgba(7,14,20,0.78)";
const EDGE = "rgba(94,255,176,0.38)";
const MONO = "'Cascadia Mono', Consolas, 'Courier New', monospace";
const SANS = "'Segoe UI', system-ui, sans-serif";

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Chamfered dark-glass panel — the one panel language of this HUD.
function glass(ctx, x, y, w, h, cut = 10) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
  ctx.fillStyle = GLASS;
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function lab(ctx, x, y, s, size = 11, col = DIM, align = "left") {
  ctx.fillStyle = col;
  ctx.font = `700 ${size}px ${SANS}`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
}

function num(ctx, x, y, s, size = 16, col = PALE, align = "left", weight = 700) {
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size}px ${MONO}`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
}

// A lit round gauge: face, ticks, phosphor needle, digital readout.
export function dial(ctx, x, y, r, cap, readout, frac, tickLabels, opts = {}) {
  ctx.fillStyle = "#0b1118";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(94,255,176,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const ang = (f) => opts.full
    ? -Math.PI / 2 + f * Math.PI * 2
    : Math.PI * 0.75 + f * Math.PI * 1.5;
  ctx.strokeStyle = "#8fa8ba";
  const ticks = opts.full ? 12 : 10;
  for (let i = 0; i <= ticks; i++) {
    const a = ang(i / ticks);
    ctx.lineWidth = i % (ticks / 2) === 0 ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
    ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  if (tickLabels) {
    ctx.fillStyle = "#cfd8e0";
    ctx.font = `700 ${Math.round(r * 0.24)}px ${MONO}`;
    ctx.textAlign = "center";
    for (const [f, txt] of tickLabels) {
      const a = ang(f);
      ctx.fillText(txt, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6 + r * 0.09);
    }
    ctx.textAlign = "left";
  }
  const a = ang(opts.full ? ((frac % 1) + 1) % 1 : Math.max(0, Math.min(1, frac)));
  ctx.strokeStyle = PHOS;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74);
  ctx.stroke();
  ctx.fillStyle = "#e8edf2";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = DIM;
  ctx.font = `700 ${Math.round(r * 0.21)}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText(cap, x, y + r * 0.52);
  ctx.fillStyle = PALE;
  ctx.font = `700 ${Math.round(r * 0.34)}px ${MONO}`;
  ctx.fillText(readout, x, y + r + Math.round(r * 0.44));
  ctx.textAlign = "left";
}

// Mini artificial horizon: sky/ground split that rolls and pitches.
export function horizonGauge(ctx, x, y, r, bank, pitch) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#0b1118";
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.translate(x, y);
  ctx.rotate(-bank * 0.8);
  const po = Math.max(-r * 0.6, Math.min(r * 0.6, pitch * r * 1.4));
  ctx.fillStyle = "#2e7fb8";
  ctx.fillRect(-r * 1.5, -r * 1.5 + po, r * 3, r * 1.5);
  ctx.fillStyle = "#7a5c36";
  ctx.fillRect(-r * 1.5, po, r * 3, r * 1.5);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 1.5, po);
  ctx.lineTo(r * 1.5, po);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x - r * 0.18, y);
  ctx.lineTo(x, y + r * 0.16);
  ctx.lineTo(x + r * 0.18, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(94,255,176,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

// Scrolling compass tape, top centre, with a boxed digital heading.
function compassTape(ctx, cx, y, w, hdg) {
  glass(ctx, cx - w / 2, y, w, 34, 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - w / 2 + 2, y + 2, w - 4, 30);
  ctx.clip();
  const pxPer = 2.4;
  const names = { 0: "N", 90: "E", 180: "S", 270: "W" };
  for (let d = -90; d <= 450; d += 5) {
    const off = ((d - hdg + 540) % 360) - 180;
    const px = cx + off * pxPer;
    if (px < cx - w / 2 - 8 || px > cx + w / 2 + 8) continue;
    const deg = ((d % 360) + 360) % 360;
    if (deg % 30 === 0) {
      const t = names[deg] || String(deg / 10).padStart(2, "0");
      num(ctx, px, y + 22, t, 13, deg === 0 ? GOLD : PALE, "center");
    } else {
      ctx.fillStyle = "rgba(125,147,165,0.8)";
      ctx.fillRect(px - 0.75, y + 8, 1.5, deg % 15 === 0 ? 10 : 6);
    }
  }
  ctx.restore();
  ctx.fillStyle = PHOS;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y);
  ctx.lineTo(cx + 6, y);
  ctx.lineTo(cx, y + 7);
  ctx.closePath();
  ctx.fill();
  glass(ctx, cx - 27, y + 30, 54, 21, 5);
  num(ctx, cx, y + 45, `${String(hdg).padStart(3, "0")}°`, 13, PHOS, "center");
}

// Scrolling vertical tape (airspeed / altitude) with a boxed value
// and an optional colour arc along its right edge.
function tapeV(ctx, x, y, w, h, val, step, labelStep, pxPer, unit, arc) {
  glass(ctx, x, y, w, h, 8);
  const mid = y + h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 2, y + 2, w - 4, h - 4);
  ctx.clip();
  if (arc) {
    for (const [from, to, col] of arc) {
      const y1 = mid + (val - to) * pxPer;
      const y2 = mid + (val - from) * pxPer;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x + w - 10, Math.min(y1, y2), 5, Math.abs(y2 - y1));
      ctx.globalAlpha = 1;
    }
  }
  const lo = Math.floor((val - (h / 2) / pxPer) / step) * step;
  const hi = val + (h / 2) / pxPer + step;
  ctx.strokeStyle = "rgba(234,255,243,0.75)";
  for (let v = lo; v <= hi; v += step) {
    if (v < 0) continue;
    const yy = mid + (val - v) * pxPer;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + w - 22, yy);
    ctx.lineTo(x + w - 13, yy);
    ctx.stroke();
    if (v % labelStep === 0) num(ctx, x + w - 26, yy + 4, String(v), 11.5, PALE, "right");
  }
  ctx.restore();
  glass(ctx, x - 3, mid - 14, w + 6, 28, 6);
  num(ctx, x + w / 2, mid + 6, String(Math.round(val)), 17, PHOS, "center");
  lab(ctx, x + w / 2, y + h + 16, unit, 10.5, DIM, "center");
}

// Centre symbology: pitch ladder, fixed aircraft symbol, and the
// flight-path vector — the heart of a real HUD.
function pitchLadder(ctx, st) {
  const p = st.plane;
  const cx = 640;
  const cy = 392;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 140, cy - 88, 280, 176);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-(p.bank || 0) * 0.8);
  const po = Math.max(-70, Math.min(70, (p.pitch || 0) * 130));
  ctx.translate(0, po);
  ctx.strokeStyle = "rgba(77,255,158,0.85)";
  ctx.fillStyle = "rgba(77,255,158,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-118, 0);
  ctx.lineTo(118, 0);
  ctx.stroke();
  for (const deg of [-20, -10, 10, 20]) {
    const yy = -deg * 3.4;
    const hw = deg % 20 === 0 ? 34 : 48;
    ctx.setLineDash(deg < 0 ? [7, 5] : []);
    ctx.beginPath();
    ctx.moveTo(-hw, yy);
    ctx.lineTo(-14, yy);
    ctx.moveTo(14, yy);
    ctx.lineTo(hw, yy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `700 10px ${MONO}`;
    ctx.textAlign = "center";
    ctx.fillText(String(Math.abs(deg)), -hw - 12, yy + 3);
    ctx.fillText(String(Math.abs(deg)), hw + 12, yy + 3);
  }
  ctx.restore();
  // Flight-path vector: where the plane is actually going.
  const fx = cx - (p.bank || 0) * 44;
  const fy = cy - (p.pitch || 0) * 130 + Math.max(-26, Math.min(26, -(p.vsi || 0) * 3));
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(fx, fy, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(fx - 22, fy);
  ctx.lineTo(fx - 9, fy);
  ctx.moveTo(fx + 9, fy);
  ctx.lineTo(fx + 22, fy);
  ctx.moveTo(fx, fy - 9);
  ctx.lineTo(fx, fy - 15);
  ctx.stroke();
  // Fixed aircraft symbol.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 34, cy);
  ctx.lineTo(cx - 11, cy);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx + 11, cy);
  ctx.lineTo(cx + 34, cy);
  ctx.stroke();
  ctx.textAlign = "left";
}

// Circular radar scope with a rotating sweep (chase view).
export function drawRadar(ctx, st, t, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(5,12,10,0.82)";
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(77,255,158,0.16)";
  ctx.lineWidth = 1;
  for (const rr of [0.33, 0.66, 0.97]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  // Sweep.
  const a = (t * 0.8) % (Math.PI * 2);
  ctx.fillStyle = "rgba(77,255,158,0.13)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, a - 0.6, a);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(77,255,158,0.65)";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  ctx.stroke();
  const wld = st.world;
  const zMin = -260;
  const zMax = wld.runway.z + 430;
  const sx = (2 * r - 18) / 2100;
  const sz = (2 * r - 18) / (zMax - zMin);
  const mx = (wx) => cx + wx * sx;
  const mz = (wz) => cy + r - 9 - (wz - zMin) * sz;
  for (const isl of wld.islands) {
    ctx.fillStyle = isl.kind === "volcano" ? "rgba(214,144,74,0.75)" : "rgba(77,255,158,0.4)";
    ctx.beginPath();
    ctx.ellipse(mx(isl.x), mz(isl.z), Math.max(2, isl.r * sx), Math.max(1.6, isl.r * sz), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(mx(wld.runway.x), mz(wld.runway.z - wld.runway.len / 2));
  ctx.lineTo(mx(wld.runway.x), mz(wld.runway.z + wld.runway.len / 2));
  ctx.stroke();
  for (const ring of wld.rings) {
    ctx.fillStyle = ring.state === "passed" ? PHOS : ring.state === "missed" ? RED : ring.state === "next" ? GOLD : "rgba(83,224,255,0.7)";
    ctx.beginPath();
    ctx.arc(mx(ring.x), mz(ring.z), ring.state === "next" ? 3.8 : 2.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = st.plane;
  ctx.translate(mx(p.x), mz(p.z));
  ctx.rotate(p.heading);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -6.4);
  ctx.lineTo(4.2, 5);
  ctx.lineTo(0, 2.6);
  ctx.lineTo(-4.2, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  lab(ctx, cx, cy - r + 15, "RADAR", 9.5, PHOS, "center");
}

// Mission panel (top left) and score panel (top right), shared.
function missionPanel(ctx, st, compact) {
  const h = compact ? 64 : 110;
  glass(ctx, 18, 16, 262, h, 10);
  lab(ctx, 32, 38, `ROUTE ${st.route.id} · ${st.route.name}`, 12, GOLD);
  num(ctx, 32, 62, `RINGS ${st.ringsHit}/${st.world.rings.length}   ${fmtTime(st.timeSec)}`, 14.5, PALE);
  if (compact) return;
  lab(ctx, 32, 82, `PAR ${fmtTime(st.route.par)} · ELANG TOWER 118.7`, 10, DIM);
  const rings = st.world.rings;
  for (let i = 0; i < rings.length; i++) {
    const px = 38 + i * 17;
    ctx.beginPath();
    ctx.arc(px, 100, 4.4, 0, Math.PI * 2);
    if (rings[i].state === "passed") { ctx.fillStyle = PHOS; ctx.fill(); }
    else if (rings[i].state === "next") { ctx.fillStyle = GOLD; ctx.fill(); }
    else if (rings[i].state === "missed") { ctx.fillStyle = RED; ctx.fill(); }
    else { ctx.strokeStyle = "rgba(125,147,165,0.8)"; ctx.lineWidth = 1.4; ctx.stroke(); }
  }
}

function scorePanel(ctx, st, compact) {
  const h = compact ? 64 : 110;
  glass(ctx, 1000, 16, 262, h, 10);
  lab(ctx, 1014, 38, "SCORE", 11, DIM);
  num(ctx, 1014, compact ? 64 : 72, String(st.score).padStart(5, "0"), compact ? 21 : 27, PALE);
  if (st.combo > 1) num(ctx, 1248, 38, `COMBO ×${st.combo}`, 14, RED, "right");
  if (compact) return;
  const best = st.best && st.best[st.route.id] ? st.best[st.route.id].score : 0;
  lab(ctx, 1014, 100, `BEST ${String(best || 0).padStart(5, "0")} · RAJAWALI AIR`, 10, DIM);
}

// Guide chip under the compass: next ring or the runway.
function guideChip(ctx, st) {
  const guide = st.guide;
  if (!guide) return;
  glass(ctx, 505, 62, 270, 42, 8);
  num(ctx, 640, 89, guide.text, 14.5, guide.final ? RED : PHOS, "center");
  if (guide.arrow !== 0) {
    num(ctx, guide.arrow < 0 ? 522 : 758, 89, guide.arrow < 0 ? "◀" : "▶", 15, GOLD, "center");
  }
}

// A boxed annunciator light: GEAR DN, FLAPS 10, FUEL LOW…
function annunciator(ctx, x, y, w, text, on, col = PHOS) {
  ctx.beginPath();
  ctx.rect(x, y, w, 22);
  ctx.fillStyle = on ? col : "rgba(20,30,38,0.85)";
  ctx.fill();
  ctx.strokeStyle = "rgba(125,147,165,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  num(ctx, x + w / 2, y + 15.5, text, 10.5, on ? "#07130b" : DIM, "center");
}

function gearDown(p, spdKt) { return p.y < 140 && spdKt < 64; }
function flapText(spdKt) { return spdKt > 105 ? "FLAPS UP" : spdKt > 68 ? "FLAPS 10" : "FLAPS 25"; }

// The chase-view HUD: tapes on the edges, ladder in the middle,
// radar and data blocks along the bottom.
export function drawChaseHud(ctx, st, t = 0) {
  const p = st.plane;
  const altFt = Math.round(p.y * 3.281);
  const spdKt = Math.round(p.speed * 1.944);
  const hdg = ((Math.round(p.headingDeg) % 360) + 360) % 360;

  missionPanel(ctx, st, false);
  scorePanel(ctx, st, false);
  compassTape(ctx, 640, 14, 300, hdg);
  guideChip(ctx, st);
  pitchLadder(ctx, st);

  // Airspeed tape, left edge — green band 45–120, amber to 140.
  tapeV(ctx, 20, 252, 74, 218, spdKt, 10, 20, 2.0, "AIRSPEED KT",
    [[0, 45, RED], [45, 120, PHOS], [120, 140, AMBER], [140, 175, RED]]);
  // Altitude tape, right edge, with the VSI box under it.
  tapeV(ctx, 1186, 252, 74, 218, altFt, 100, 200, 0.3, "ALTITUDE FT", null);
  glass(ctx, 1183, 492, 80, 30, 6);
  num(ctx, 1223, 512, `VS ${p.vsi >= 0 ? "+" : ""}${Math.round(p.vsi * 196.85)}`, 12.5, CYAN, "center");

  drawRadar(ctx, st, t, 106, 600, 84);

  // Engine block, bottom centre.
  glass(ctx, 386, 612, 508, 92, 10);
  lab(ctx, 402, 634, "RPM", 10.5, DIM);
  const rpm = Math.round(800 + p.throttle * 1750);
  num(ctx, 402, 662, String(rpm), 21, PALE);
  lab(ctx, 402, 690, "MANIFOLD 28.4", 9.5, DIM);
  lab(ctx, 486, 634, "THR", 10.5, DIM);
  ctx.fillStyle = "rgba(125,147,165,0.3)";
  ctx.fillRect(486, 642, 150, 9);
  ctx.fillStyle = p.throttle > 0.85 ? RED : CYAN;
  ctx.fillRect(486, 642, 150 * p.throttle, 9);
  lab(ctx, 486, 674, "FUEL", 10.5, p.fuel < 0.2 ? RED : DIM);
  ctx.fillStyle = "rgba(125,147,165,0.3)";
  ctx.fillRect(486, 682, 150, 9);
  ctx.fillStyle = p.fuel < 0.2 ? RED : p.fuel < 0.38 ? AMBER : PHOS;
  ctx.fillRect(486, 682, 150 * Math.max(0, p.fuel), 9);
  num(ctx, 646, 690, `${Math.round(Math.max(0, p.fuel) * 100)}%`, 12.5, PALE);
  annunciator(ctx, 668, 630, 96, gearDown(p, spdKt) ? "GEAR DN" : "GEAR UP", gearDown(p, spdKt));
  annunciator(ctx, 668, 660, 96, flapText(spdKt), spdKt <= 105, CYAN);
  annunciator(ctx, 776, 630, 102, "FUEL LOW", p.fuel < 0.2 && (t % 1) < 0.65, RED);
  annunciator(ctx, 776, 660, 102, p.fuel <= 0 ? "FLAMEOUT" : "ENG OK", p.fuel <= 0, RED);

  // Waypoint data block, bottom right — the flight-plan readout.
  glass(ctx, 906, 612, 356, 92, 10);
  const rings = st.world.rings;
  const next = rings[st.world.nextIdx];
  const tgt = next || st.world.runway;
  const dx = tgt.x - p.x;
  const dz = tgt.z - p.z;
  const dist = Math.round(Math.hypot(dx, dz, (tgt.y || 0) - p.y));
  const brg = ((Math.round(Math.atan2(dx, dz) * 180 / Math.PI) % 360) + 360) % 360;
  const eta = p.speed > 4 ? Math.round(dist / p.speed) : 0;
  lab(ctx, 922, 634, next ? `WPT · RING ${st.world.nextIdx + 1} OF ${rings.length}` : "WPT · RWY 09 · PULAU ELANG", 10.5, GOLD);
  num(ctx, 922, 662, `BRG ${String(brg).padStart(3, "0")}°`, 15, PALE);
  num(ctx, 1032, 662, `DIST ${dist} M`, 15, PALE);
  num(ctx, 922, 690, `ETA ${fmtTime(eta)}`, 13, DIM);
  num(ctx, 1032, 690, `GND ${spdKt} KT`, 13, DIM);
}

// Cockpit view: the dashboard gauges stay, the top strip and GPS
// join the same glass language, and annunciators light the dash.
export function drawCockpitHud(ctx, st, t = 0) {
  const p = st.plane;
  const altFt = Math.round(p.y * 3.281);
  const spdKt = Math.round(p.speed * 1.944);
  const hdg = ((Math.round(p.headingDeg) % 360) + 360) % 360;
  dial(ctx, 180, 596, 62, "ALT FT", String(altFt), altFt / 2000, [[0, "0"], [0.5, "1"], [1, "2"]]);
  horizonGauge(ctx, 640, 592, 66, p.bank || 0, p.pitch || 0);
  dial(ctx, 1100, 596, 62, "SPD KT", String(spdKt), spdKt / 160, [[0, "0"], [0.5, "80"], [1, "160"]]);
  dial(ctx, 872, 600, 46, "HDG", `${String(hdg).padStart(3, "0")}°`, hdg / 360, [[0, "N"], [0.25, "E"], [0.5, "S"], [0.75, "W"]], { full: true });
  // Throttle quadrant, left of centre.
  lab(ctx, 372, 560, "THROTTLE", 11, "#8fa1b1");
  ctx.fillStyle = "#39434e";
  ctx.fillRect(372, 572, 26, 104);
  ctx.fillStyle = GOLD;
  ctx.fillRect(372, 572 + 104 * (1 - p.throttle), 26, 104 * p.throttle);
  ctx.fillStyle = "#e8edf2";
  ctx.fillRect(366, 566 + 104 * (1 - p.throttle), 38, 10);
  // Fuel gauge beside the quadrant.
  lab(ctx, 453, 560, "FUEL", 11, p.fuel < 0.2 ? "#ff7a6b" : "#8fa1b1");
  ctx.fillStyle = "#39434e";
  ctx.fillRect(444, 572, 18, 104);
  ctx.fillStyle = p.fuel < 0.2 ? RED : p.fuel < 0.38 ? AMBER : PHOS;
  ctx.fillRect(444, 572 + 104 * (1 - Math.max(0, p.fuel)), 18, 104 * Math.max(0, p.fuel));
  num(ctx, 453, 692, `${Math.round(Math.max(0, p.fuel) * 100)}%`, 11, "#e8edf2");
  annunciator(ctx, 566, 676, 66, gearDown(p, spdKt) ? "GEAR DN" : "GEAR UP", gearDown(p, spdKt));
  annunciator(ctx, 640, 676, 66, flapText(spdKt), spdKt <= 105, CYAN);
  drawMinimap(ctx, st, 1088, 96, 170, 190, "GPS · ARCHIPELAGO", t);
  missionPanel(ctx, st, true);
  scorePanel(ctx, st, true);
  compassTape(ctx, 640, 14, 300, hdg);
  guideChip(ctx, st);
}

// Top-down course map (the cockpit GPS): phosphor glass, a moving
// sweep bar, islands, rings, runway and the plane arrow.
export function drawMinimap(ctx, st, x, y, w, h, title, t = 0) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fillStyle = "rgba(5,12,10,0.88)";
  ctx.fill();
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  lab(ctx, x + 12, y + 20, title, 10.5, PHOS);
  lab(ctx, x + w - 36, y + 20, "N ▲", 10.5, CYAN);
  const wld = st.world;
  const zMin = -260;
  const zMax = wld.runway.z + 430;
  const sx = w / 2100;
  const sz = (h - 44) / (zMax - zMin);
  const mx = (wx) => x + w / 2 + wx * sx;
  const mz = (wz) => y + h - 10 - (wz - zMin) * sz;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 26, w - 4, h - 28);
  ctx.clip();
  const sweepX = x + ((t * 46) % (w + 30)) - 15;
  const sg = ctx.createLinearGradient(sweepX - 15, 0, sweepX + 15, 0);
  sg.addColorStop(0, "rgba(77,255,158,0)");
  sg.addColorStop(0.5, "rgba(77,255,158,0.14)");
  sg.addColorStop(1, "rgba(77,255,158,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(sweepX - 15, y + 26, 30, h - 28);
  for (const isl of wld.islands) {
    ctx.fillStyle = isl.kind === "volcano" ? "rgba(214,144,74,0.8)" : isl.kind === "runway" ? "rgba(160,175,190,0.8)" : "rgba(77,255,158,0.45)";
    ctx.beginPath();
    ctx.ellipse(mx(isl.x), mz(isl.z), Math.max(2.5, isl.r * sx), Math.max(2.5, isl.r * sz), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mx(wld.runway.x), mz(wld.runway.z - wld.runway.len / 2));
  ctx.lineTo(mx(wld.runway.x), mz(wld.runway.z + wld.runway.len / 2));
  ctx.stroke();
  for (const r of wld.rings) {
    ctx.fillStyle = r.state === "passed" ? PHOS : r.state === "missed" ? RED : r.state === "next" ? GOLD : "rgba(83,224,255,0.7)";
    ctx.beginPath();
    ctx.arc(mx(r.x), mz(r.z), r.state === "next" ? 4.4 : 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = st.plane;
  ctx.translate(mx(p.x), mz(p.z));
  ctx.rotate(p.heading);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(4.6, 5.5);
  ctx.lineTo(0, 2.8);
  ctx.lineTo(-4.6, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Centre announcement (RING +100, FINAL APPROACH, banner events).
export function drawBanner(ctx, st, now) {
  if (!st.banner || now > st.banner.until) return;
  const a = Math.min(1, (st.banner.until - now) / 0.4, (now - st.banner.from) / 0.15 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = "center";
  ctx.font = `900 54px ${SANS}`;
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(4,12,8,0.7)";
  const y = 210;
  ctx.shadowColor = st.banner.col || GOLD;
  ctx.shadowBlur = 16;
  ctx.strokeText(st.banner.text, 640, y);
  ctx.fillStyle = st.banner.col || GOLD;
  ctx.fillText(st.banner.text, 640, y);
  ctx.shadowBlur = 0;
  if (st.banner.sub) {
    ctx.font = `800 22px ${SANS}`;
    ctx.lineWidth = 7;
    ctx.strokeText(st.banner.sub, 640, y + 36);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(st.banner.sub, 640, y + 36);
  }
  ctx.restore();
  ctx.textAlign = "left";
}
