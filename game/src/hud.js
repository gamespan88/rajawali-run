// hud.js — the glass-cockpit overlay, drawn on a 2D canvas above the 3D view.
// Design language: dark teal glass panels with chamfered corners, pale cyan
// text, gold for targets and warnings in amber/red — one language everywhere.
import { ISLANDS, RUNWAY } from './world3d.js';

export const COL = {
  panel: 'rgba(7,32,42,0.86)', panelSoft: 'rgba(7,32,42,0.66)',
  edge: 'rgba(125,211,252,0.38)', edgeDim: 'rgba(125,211,252,0.18)',
  txt: '#eaf7ff', dim: '#8fb6c4', faint: '#5d7f8d',
  cyan: '#5ee1ff', gold: '#ffb340', green: '#53e08a', red: '#ff5347', amber: '#ffc95e',
};
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const MONO = "Consolas, 'SF Mono', monospace";

export function panel(ctx, x, y, w, h, cut = 14) {
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - 4);
  ctx.lineTo(x + w - 4, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + 4);
  ctx.closePath();
  ctx.fillStyle = COL.panel; ctx.fill();
  ctx.strokeStyle = COL.edge; ctx.lineWidth = 1.2; ctx.stroke();
}
export function label(ctx, x, y, s, size = 11, color = COL.dim, align = 'left', bold = true) {
  ctx.fillStyle = color; ctx.font = `${bold ? '700' : '400'} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}
export function num(ctx, x, y, s, size, color = COL.txt, align = 'left') {
  ctx.fillStyle = color; ctx.font = `700 ${size}px ${MONO}`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
export { clamp, pad };

export function zoneName(x, z) {
  let best = 'RAJAWALI BAY', bd = 1e12;
  for (const isl of ISLANDS) {
    const d = (x - isl.x) ** 2 + (z - isl.z) ** 2;
    if (d < bd) { bd = d; best = isl.name; }
  }
  return best;
}

function compassTape(ctx, courseDeg, targetDeg) {
  const x = 440, y = 22, w = 400, h = 62;
  panel(ctx, x, y, w, h);
  const cx = x + w / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 8, y + 4, w - 16, 34); ctx.clip();
  const pxPerDeg = 3.4;
  for (let d = -70; d <= 70; d += 5) {
    let deg = Math.round((courseDeg + d) / 5) * 5;
    const tx = cx + (deg - courseDeg) * pxPerDeg;
    deg = ((deg % 360) + 360) % 360;
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? COL.txt : COL.faint;
    ctx.beginPath(); ctx.moveTo(tx, y + 30); ctx.lineTo(tx, y + (major ? 17 : 24)); ctx.stroke();
    if (major) {
      const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
      label(ctx, tx, y + 14, names[deg] || pad(deg / 10, 2), 10, deg % 90 === 0 ? COL.cyan : COL.dim, 'center');
    }
  }
  if (targetDeg != null) {
    const rel = ((targetDeg - courseDeg + 540) % 360) - 180;
    if (Math.abs(rel) < 68) {
      const tx = cx + rel * pxPerDeg;
      ctx.fillStyle = COL.gold;
      ctx.beginPath(); ctx.moveTo(tx - 6, y + 30); ctx.lineTo(tx + 6, y + 30); ctx.lineTo(tx, y + 38); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = COL.gold;
  ctx.beginPath(); ctx.moveTo(cx - 6, y + 2); ctx.lineTo(cx + 6, y + 2); ctx.lineTo(cx, y + 10); ctx.closePath(); ctx.fill();
  label(ctx, cx - 30, y + 56, 'HDG', 10, COL.dim);
  num(ctx, cx + 2, y + 57, pad(courseDeg, 3) + '°', 17, COL.txt);
}

function segBar(ctx, x, y, w, v, color, lowColor) {
  const n = 18, gap = 2, sw = (w - gap * (n - 1)) / n;
  const lit = Math.round(clamp(v, 0, 1) * n);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < lit ? (v < 0.25 && lowColor ? lowColor : color) : 'rgba(140,180,200,0.18)';
    ctx.fillRect(x + i * (sw + gap), y, sw, 7);
  }
}

function attitudeBall(ctx, cx, cy, r, pitchDeg, rollRad) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(rollRad);
  const po = clamp(pitchDeg, -30, 30) * 1.1;
  ctx.fillStyle = '#5ea9dd'; ctx.fillRect(-r - 4, -r - 60, (r + 4) * 2, r + 60 + po);
  ctx.fillStyle = '#a8763e'; ctx.fillRect(-r - 4, po, (r + 4) * 2, r + 60 - po);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-r - 4, po); ctx.lineTo(r + 4, po); ctx.stroke();
  ctx.lineWidth = 1;
  for (const p of [-20, -10, 10, 20]) {
    const yy = po - p * 1.1, len = p % 20 === 0 ? 16 : 10;
    ctx.beginPath(); ctx.moveTo(-len, yy); ctx.lineTo(len, yy); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = COL.edge; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = COL.gold; ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.62, cy); ctx.lineTo(cx - 6, cy); ctx.lineTo(cx - 6, cy + 5);
  ctx.moveTo(cx + r * 0.62, cy); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx + 6, cy + 5);
  ctx.stroke();
  ctx.fillStyle = COL.gold; ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  ctx.lineWidth = 1;
}

function vsDial(ctx, cx, cy, r, fpm) {
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,24,32,0.9)'; ctx.fill();
  ctx.strokeStyle = COL.edgeDim; ctx.stroke();
  for (let v = -2000; v <= 2000; v += 500) {
    const a = Math.PI * 0.75 + (v + 2000) / 4000 * Math.PI * 1.5;
    ctx.strokeStyle = COL.dim;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  label(ctx, cx, cy - r * 0.42, 'V/S', 8.5, COL.dim, 'center');
  const a = Math.PI * 0.75 + (clamp(fpm, -2000, 2000) + 2000) / 4000 * Math.PI * 1.5;
  ctx.strokeStyle = COL.cyan; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7)); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.restore();
}

export function drawMinimap(ctx, x, y, w, h, st) {
  panel(ctx, x, y, w, h);
  label(ctx, x + 14, y + 20, st.sector || 'RAJAWALI SECTOR', 11, COL.txt);
  label(ctx, x + w - 14, y + 20, 'N ↑', 11, COL.gold, 'right');
  const mx = x + 12, my = y + 30, mw = w - 24, mh = h - 66;
  ctx.fillStyle = 'rgba(10,44,54,0.9)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(125,211,252,0.13)';
  for (let gx = 1; gx < 4; gx++) { ctx.beginPath(); ctx.moveTo(mx + mw * gx / 4, my); ctx.lineTo(mx + mw * gx / 4, my + mh); ctx.stroke(); }
  for (let gy = 1; gy < 3; gy++) { ctx.beginPath(); ctx.moveTo(mx, my + mh * gy / 3); ctx.lineTo(mx + mw, my + mh * gy / 3); ctx.stroke(); }
  const EXT = 3400;
  const px = (wx) => mx + (wx + EXT) / (2 * EXT) * mw;
  const pz = (wz) => my + (wz + EXT) / (2 * EXT) * mh;
  for (const isl of ISLANDS) {
    ctx.fillStyle = isl.volcano ? '#7a6a58' : '#3f7d4e';
    const cxp = px(isl.x), cyp = pz(isl.z), rr = Math.max(5, isl.r * 0.8 / (2 * EXT) * mw);
    ctx.beginPath();
    for (let a = 0; a <= 12; a++) {
      const th = a / 12 * Math.PI * 2;
      const wob = 1 + 0.16 * Math.sin(th * 3 + isl.x * 0.01) + 0.1 * Math.sin(th * 5 + isl.z * 0.01);
      const X = cxp + Math.cos(th) * rr * wob, Y = cyp + Math.sin(th) * rr * wob;
      if (a === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px(RUNWAY.cx - RUNWAY.len / 2), pz(RUNWAY.cz)); ctx.lineTo(px(RUNWAY.cx + RUNWAY.len / 2), pz(RUNWAY.cz)); ctx.stroke();
  ctx.lineWidth = 1;
  st.gates.forEach((g, i) => {
    ctx.fillStyle = g.state === 'passed' ? COL.green : g.state === 'missed' ? COL.red : i === st.gateIdx ? COL.gold : 'rgba(159,216,232,0.75)';
    ctx.beginPath(); ctx.arc(px(g.x), pz(g.z), i === st.gateIdx ? 4.4 : 3, 0, Math.PI * 2); ctx.fill();
  });
  const ax = px(st.plane.x), ay = pz(st.plane.z);
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(Math.cos(st.plane.course), -Math.sin(st.plane.course)) + Math.PI);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4.6, 5.5); ctx.lineTo(0, 2.8); ctx.lineTo(-4.6, 5.5); ctx.closePath(); ctx.fill();
  ctx.restore();
  const wa = (st.wind.from + 180) * Math.PI / 180;
  label(ctx, x + 14, y + h - 14, `WIND ${pad(st.wind.kt, 2)} KT`, 11, COL.dim);
  ctx.strokeStyle = COL.cyan; ctx.lineWidth = 1.6;
  const wx0 = x + 118, wy0 = y + h - 19;
  ctx.beginPath(); ctx.moveTo(wx0, wy0); ctx.lineTo(wx0 + Math.sin(wa) * 15, wy0 - Math.cos(wa) * 15); ctx.stroke();
  ctx.lineWidth = 1;
}

function missionPanel(ctx, st) {
  const x = 876, y = 22, w = 380, h = 122;
  panel(ctx, x, y, w, h);
  label(ctx, x + 16, y + 22, st.sortie.code, 10.5, COL.cyan);
  ctx.fillStyle = COL.txt; ctx.font = `800 25px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText(st.sortie.name, x + 16, y + 52);
  label(ctx, x + 16, y + 72, st.phase === 'final' ? 'LANDING CLEARANCE / CROSSWIND' : st.sortie.brief, 10.5, COL.dim, 'left', false);
  label(ctx, x + 16, y + 100, st.phase === 'final' ? 'LAND RWY ' + (st.sortie.landHdg === 0 ? '09' : '27') : `GATES ${pad(st.gatesDone, 2)} / ${pad(st.gates.length, 2)}`, 13, COL.txt);
  if (st.phase !== 'final') label(ctx, x + 16, y + 118, `NEXT ${pad(st.nextDist, 3)} M`, 10, COL.faint, 'left', false);
  label(ctx, x + w - 16, y + 100, `PTS ${pad(st.score, 5)}`, 15, COL.gold, 'right');
  if (st.combo > 1) label(ctx, x + w - 16, y + 118, `COMBO ×${st.combo}`, 10.5, COL.cyan, 'right');
}

function titleBlock(ctx, st) {
  panel(ctx, 24, 22, 302, 84);
  ctx.fillStyle = COL.txt; ctx.font = `800 21px ${FONT}`; ctx.textAlign = 'left';
  ctx.fillText(st.zone, 40, 56);
  label(ctx, 40, 78, `${st.aircraft.name} / FLIGHT TELEMETRY`, 10.5, COL.dim);
  panel(ctx, 24, 116, 196, 28, 8);
  ctx.fillStyle = st.plane.onGround ? COL.amber : COL.green;
  ctx.beginPath(); ctx.arc(38, 130, 4, 0, Math.PI * 2); ctx.fill();
  label(ctx, 48, 135, st.plane.onGround ? 'ON GROUND' : st.plane.gearDown ? 'GEAR DOWN' : 'AIRBORNE', 10.5, COL.txt);
  label(ctx, 206, 135, 'LIVE', 10.5, COL.red, 'right');
}

function sideBox(ctx, x, title, value, unit) {
  panel(ctx, x, 296, 122, 104);
  label(ctx, x + 61, 322, title, 10.5, COL.dim, 'center');
  num(ctx, x + 61, 368, value, 37, COL.txt, 'center');
  label(ctx, x + 61, 390, unit, 9.5, COL.faint, 'center');
}

function instruments(ctx, st) {
  const x = 24, y = 512, w = 336, h = 184;
  panel(ctx, x, y, w, h);
  label(ctx, x + 14, y + 20, 'FLIGHT INSTRUMENTS', 10.5, COL.dim);
  attitudeBall(ctx, x + 58, y + 96, 46, st.plane.pitchDeg, -st.plane.roll);
  num(ctx, x + 58, y + 168, `${st.plane.vsFpm >= 0 ? '+' : '-'}${pad(Math.abs(st.plane.vsFpm), 4)} FPM`, 11.5, COL.txt, 'center');
  vsDial(ctx, x + 138, y + 96, 33, st.plane.vsFpm);
  const bx = x + 196, bw = w - 196 - 16;
  const rows = [
    ['FUEL', st.plane.fuel, COL.cyan, COL.red],
    ['THROTTLE', st.plane.throttle, COL.amber, null],
    ['AIRFRAME', st.plane.airframe, COL.green, COL.red],
  ];
  rows.forEach(([t, v, c, lc], i) => {
    const ry = y + 52 + i * 44;
    label(ctx, bx, ry, t, 10, COL.dim);
    label(ctx, x + w - 16, ry, `${Math.round(v * 100)}%`, 10.5, COL.txt, 'right');
    segBar(ctx, bx, ry + 8, bw, v, c, lc);
  });
}

function ladder(ctx, st, proj) {
  const cx = 640, cy = 356;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-st.plane.roll * 0.55);
  ctx.strokeStyle = 'rgba(94,225,255,0.5)'; ctx.fillStyle = 'rgba(94,225,255,0.75)';
  ctx.font = `600 10px ${MONO}`; ctx.textAlign = 'center';
  for (const p of [-20, -10, 10, 20]) {
    const yy = -st.plane.pitchDeg * 2.6 + p * 2.6;
    if (Math.abs(yy) > 120) continue;
    const len = p % 20 === 0 ? 74 : 52;
    ctx.setLineDash(p < 0 ? [7, 6] : []);
    ctx.beginPath(); ctx.moveTo(-176, yy); ctx.lineTo(-176 + len, yy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(176 - len, yy); ctx.lineTo(176, yy); ctx.stroke();
    ctx.fillText(String(Math.abs(p)), -196, yy + 3);
    ctx.fillText(String(Math.abs(p)), 196, yy + 3);
  }
  ctx.setLineDash([]);
  ctx.restore();
  const fx = cx + clamp(st.plane.driftX || 0, -60, 60), fy = cy + clamp(-(st.plane.vsFpm || 0) / 60, -46, 46);
  ctx.strokeStyle = COL.cyan; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(fx, fy, 11, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx - 24, fy); ctx.lineTo(fx - 11, fy); ctx.moveTo(fx + 11, fy); ctx.lineTo(fx + 24, fy); ctx.moveTo(fx, fy - 11); ctx.lineTo(fx, fy - 4); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = COL.gold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 7, cy); ctx.lineTo(cx - 7, cy + 6); ctx.moveTo(cx + 7, cy + 6); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx + 26, cy); ctx.stroke();
  ctx.lineWidth = 1;
  if (proj && proj.gate) {
    const { gx, gy, dist } = proj.gate;
    if (gx > 60 && gx < 1220 && gy > 110 && gy < 640) {
      const text = st.phase === 'final' ? `RWY ${st.sortie.landHdg === 0 ? '09' : '27'} · ${pad(dist, 3)} M` : `GATE ${pad(st.gateIdx + 1, 2)} · ${pad(dist, 3)} M`;
      ctx.font = `700 11.5px ${FONT}`;
      const tw = ctx.measureText(text).width + 22;
      ctx.fillStyle = 'rgba(7,32,42,0.85)';
      ctx.fillRect(gx - tw / 2, gy - 16, tw, 24);
      ctx.strokeStyle = COL.edgeDim; ctx.strokeRect(gx - tw / 2, gy - 16, tw, 24);
      label(ctx, gx, gy + 1, text, 11.5, COL.txt, 'center');
    }
  }
}

export function banner(ctx, st) {
  if (!st.banner) return;
  const { title, sub } = st.banner;
  const w = Math.max(340, title.length * 17 + 60);
  panel(ctx, 640 - w / 2, 128, w, sub ? 74 : 52);
  ctx.fillStyle = COL.gold; ctx.font = `800 21px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillText(title, 640, 128 + 33);
  if (sub) label(ctx, 640, 128 + 58, sub, 11.5, COL.txt, 'center', false);
}

export function warnings(ctx, st) {
  let y = 470;
  const warn = [];
  if (st.plane.stall) warn.push(['STALL', COL.red]);
  if (st.plane.fuel < 0.25 && !st.plane.onGround) warn.push(['LOW FUEL', COL.amber]);
  if (st.phase === 'final' && !st.plane.gearDown) warn.push(['GEAR UP — PRESS G', COL.red]);
  if (st.plane.flameout) warn.push(['FLAMEOUT', COL.red]);
  for (const [t, c] of warn) {
    if (Math.floor(performance.now() / 420) % 2 === 0 || c === COL.amber) {
      ctx.fillStyle = c; ctx.font = `800 19px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(t, 640, y);
    }
    y += 26;
  }
}

export function drawFlightHud(ctx, st, proj) {
  ctx.clearRect(0, 0, 1280, 720);
  if (st.view === 'chase') ladder(ctx, st, proj);
  titleBlock(ctx, st);
  compassTape(ctx, st.plane.courseDeg, st.targetDeg);
  missionPanel(ctx, st);
  sideBox(ctx, 24, 'AIRSPEED', pad(st.plane.knots, 3), 'KNOTS');
  sideBox(ctx, 1134, 'ALTITUDE', pad(st.plane.feet, 4), 'FEET MSL');
  instruments(ctx, st);
  drawMinimap(ctx, 952, 470, 304, 226, st);
  banner(ctx, st);
  warnings(ctx, st);
  label(ctx, 640, 706, 'W/S THROTTLE · ARROWS FLY · A/D RUDDER · C CAMERA · G GEAR · F FLAPS · P PAUSE', 10, COL.faint, 'center', false);
}

export function drawCockpitHud(ctx, st, proj) {
  ctx.clearRect(0, 0, 1280, 720);
  ctx.fillStyle = '#10181d';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(150, 0); ctx.lineTo(215, 300); ctx.lineTo(185, 470); ctx.lineTo(0, 500); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1280, 0); ctx.lineTo(1130, 0); ctx.lineTo(1065, 300); ctx.lineTo(1095, 470); ctx.lineTo(1280, 500); ctx.closePath(); ctx.fill();
  ctx.fillRect(150, 0, 980, 26);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(465, 120, 350, 250, 18); ctx.clip();
  ctx.strokeStyle = 'rgba(94,255,176,0.55)';
  ctx.translate(640, 245); ctx.rotate(-st.plane.roll * 0.6);
  for (const p of [-20, -10, 0, 10, 20]) {
    const yy = -st.plane.pitchDeg * 3 + p * 3;
    if (Math.abs(yy) > 110) continue;
    ctx.setLineDash(p < 0 ? [6, 6] : []);
    ctx.beginPath(); ctx.moveTo(-95, yy); ctx.lineTo(95, yy); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
  ctx.strokeStyle = 'rgba(94,255,176,0.8)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(640, 245, 34, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(640, 196); ctx.lineTo(640, 218); ctx.moveTo(640, 272); ctx.lineTo(640, 294); ctx.moveTo(591, 245); ctx.lineTo(613, 245); ctx.moveTo(667, 245); ctx.lineTo(689, 245); ctx.stroke();
  ctx.lineWidth = 1;
  if (st.phase === 'final') {
    ctx.fillStyle = COL.green;
    const lx = 640 + clamp(st.locDev || 0, -1, 1) * 120, gy = 245 + clamp(st.glideDev || 0, -1, 1) * 80;
    ctx.save(); ctx.translate(lx, 330); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore();
    ctx.save(); ctx.translate(742, gy); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  }
  ctx.fillStyle = '#0c1419';
  ctx.fillRect(0, 470, 1280, 250);
  ctx.fillStyle = '#131e24';
  ctx.fillRect(0, 470, 1280, 8);
  panel(ctx, 36, 492, 300, 196);
  label(ctx, 52, 516, `TACTICAL NAV / ${((st.nextDist || 0) / 1000).toFixed(1)} KM`, 11, COL.cyan);
  const rcx = 186, rcy = 606, rr = 62;
  ctx.strokeStyle = 'rgba(94,255,176,0.5)';
  for (const r of [rr, rr * 0.62, rr * 0.28]) { ctx.beginPath(); ctx.arc(rcx, rcy, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(rcx - rr, rcy); ctx.lineTo(rcx + rr, rcy); ctx.moveTo(rcx, rcy - rr); ctx.lineTo(rcx, rcy + rr); ctx.stroke();
  const sweep = (performance.now() / 1600) % (Math.PI * 2);
  ctx.strokeStyle = 'rgba(94,255,176,0.9)';
  ctx.beginPath(); ctx.moveTo(rcx, rcy); ctx.lineTo(rcx + Math.cos(sweep) * rr, rcy + Math.sin(sweep) * rr); ctx.stroke();
  ctx.fillStyle = COL.gold;
  ctx.save(); ctx.translate(rcx, rcy); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
  label(ctx, rcx, rcy + 84, 'SWEEP LIVE', 8.5, COL.faint, 'center');
  panel(ctx, 356, 492, 330, 196);
  label(ctx, 372, 516, `HDG ${pad(st.plane.courseDeg, 3)}°`, 11, COL.cyan);
  attitudeBall(ctx, 521, 600, 62, st.plane.pitchDeg, -st.plane.roll);
  ctx.fillStyle = 'rgba(7,32,42,0.92)'; ctx.fillRect(382, 566, 62, 30); ctx.fillRect(598, 566, 62, 30);
  num(ctx, 413, 588, pad(st.plane.knots, 3), 17, COL.txt, 'center');
  num(ctx, 629, 588, pad(st.plane.feet, 4), 17, COL.txt, 'center');
  panel(ctx, 706, 492, 300, 196);
  label(ctx, 722, 516, 'FUEL / SYS', 11, COL.cyan);
  const fx = 790, fy = 578;
  ctx.strokeStyle = COL.edgeDim; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(fx, fy, 34, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke();
  ctx.strokeStyle = st.plane.fuel < 0.25 ? COL.red : COL.cyan;
  ctx.beginPath(); ctx.arc(fx, fy, 34, Math.PI * 0.8, Math.PI * 0.8 + Math.PI * 1.4 * st.plane.fuel); ctx.stroke();
  ctx.lineWidth = 1;
  num(ctx, fx, fy + 6, `${Math.round(st.plane.fuel * 100)}%`, 16, COL.txt, 'center');
  label(ctx, fx, fy + 24, 'FUEL QTY', 8.5, COL.dim, 'center');
  label(ctx, 872, 552, 'RPM', 10, COL.dim);
  num(ctx, 1002, 552, `${Math.round(34 + st.plane.throttle * 63)}%`, 13, COL.txt, 'right');
  label(ctx, 872, 582, 'HULL', 10, COL.dim);
  num(ctx, 1002, 582, `${Math.round(st.plane.airframe * 100)}%`, 13, COL.txt, 'right');
  label(ctx, 872, 612, 'OIL T', 10, COL.dim);
  num(ctx, 1002, 612, `${Math.round(78 + st.plane.throttle * 22)}°C`, 13, COL.txt, 'right');
  const chips = [
    [st.plane.gearDown ? 'GEAR DN' : 'GEAR UP', st.plane.gearDown ? COL.green : COL.red],
    [`FLAPS ${st.plane.flaps}°`, st.plane.flaps > 0 ? COL.green : COL.dim],
    [st.aircraft.id === 'elang' ? (st.plane.throttle > 0.92 ? 'AB LIT' : 'AB OFF') : 'PROP SYNC', st.plane.throttle > 0.92 && st.aircraft.id === 'elang' ? COL.amber : COL.dim],
    [st.plane.stall ? 'STALL' : 'BRK OFF', st.plane.stall ? COL.red : COL.dim],
  ];
  chips.forEach(([t, c], i) => {
    const cxp = 722 + (i % 3) * 96, cyp = 640 + Math.floor(i / 3) * 32;
    ctx.fillStyle = 'rgba(16,36,46,0.95)'; ctx.fillRect(cxp, cyp, 88, 24);
    ctx.strokeStyle = COL.edgeDim; ctx.strokeRect(cxp, cyp, 88, 24);
    label(ctx, cxp + 44, cyp + 16, t, 9.5, c, 'center');
  });
  label(ctx, 1014 - 88, 656 + 32, '', 9.5, COL.dim, 'center');
  panel(ctx, 24, 22, 250, 40, 8);
  label(ctx, 38, 48, `SORTIE ${pad(st.sortie.id, 2)} · ${st.sortie.name.toUpperCase()}`, 11.5, COL.txt);
  panel(ctx, 1006, 22, 250, 40, 8);
  label(ctx, 1242, 48, `CAM: COCKPIT · PTS ${pad(st.score, 5)}`, 11.5, COL.txt, 'right');
  compassTape(ctx, st.plane.courseDeg, st.targetDeg);
  banner(ctx, st);
  warnings(ctx, st);
}
