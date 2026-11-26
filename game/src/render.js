// render.js — the pseudo-3D renderer: sky, sea, islands, rings, clouds,
// the seaplane in chase view, and the cockpit frame. Everything is drawn
// with canvas paths from the world data; there are no image files.

import { makeRng } from "./world.js";

export const VIEW_W = 1280;
export const VIEW_H = 720;
const FOCAL = 640;
const HORIZON = 318;

// Project a world point into screen space for camera `cam`.
// cam: {x, y, z, heading (rad), pitchPx (view shift from the plane's pitch)}
export function project(cam, wx, wy, wz) {
  const dx = wx - cam.x;
  const dz = wz - cam.z;
  const sin = Math.sin(cam.heading);
  const cos = Math.cos(cam.heading);
  const cz = dx * sin + dz * cos;
  const cx = dx * cos - dz * sin;
  if (cz < 8) return null;
  const s = FOCAL / cz;
  return {
    x: VIEW_W / 2 + cx * s,
    y: HORIZON - (wy - cam.y) * s + (cam.pitchPx || 0),
    s,
    cz,
  };
}

function lerpColor(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}

export function drawSky(ctx, route, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 60);
  g.addColorStop(0, route.sky[0]);
  g.addColorStop(0.75, route.sky[1]);
  g.addColorStop(1, route.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, HORIZON + 60);
  // Sun with a soft halo.
  const sx = route.sun[0] * VIEW_W;
  const sy = route.sun[1] * VIEW_H;
  const halo = ctx.createRadialGradient(sx, sy, 6, sx, sy, 120);
  halo.addColorStop(0, "rgba(255,246,200,0.95)");
  halo.addColorStop(0.25, "rgba(255,240,180,0.55)");
  halo.addColorStop(1, "rgba(255,240,180,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(sx - 130, sy - 130, 260, 260);
  ctx.fillStyle = "#fff7d6";
  ctx.beginPath();
  ctx.arc(sx, sy, 26, 0, Math.PI * 2);
  ctx.fill();
  // Haze band at the horizon.
  const hz = ctx.createLinearGradient(0, HORIZON - 46, 0, HORIZON + 30);
  hz.addColorStop(0, "rgba(255,255,255,0)");
  hz.addColorStop(1, route.fog);
  ctx.fillStyle = hz;
  ctx.fillRect(0, HORIZON - 46, VIEW_W, 76);
}

export function drawSea(ctx, route, cam, t) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
  g.addColorStop(0, route.sea[0]);
  g.addColorStop(1, route.sea[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, VIEW_W, VIEW_H - HORIZON);
  // Sparkle dashes riding the swell — deterministic, sliding with travel.
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  const rng = makeRng(55);
  for (let i = 0; i < 46; i++) {
    const fx = rng();
    const fz = rng();
    const band = (fz * 900 + (cam.z % 900)) % 900;
    const p = project(cam, cam.x + (fx - 0.5) * (900 + band * 2.4), 0, cam.z + 60 + band);
    if (!p || p.y < HORIZON + 6 || p.y > VIEW_H) continue;
    const wdt = 6 + p.s * 26;
    ctx.beginPath();
    ctx.moveTo(p.x - wdt / 2, p.y);
    ctx.lineTo(p.x + wdt / 2, p.y);
    ctx.stroke();
  }
}

// One island, drawn around its projected sea-level centre.
function drawIsland(ctx, isl, cam, t) {
  const base = project(cam, isl.x, 0, isl.z);
  if (!base || base.x < -500 || base.x > VIEW_W + 500) return;
  const R = isl.r * base.s;
  const Hp = isl.h * base.s;
  const by = base.y;
  const bx = base.x;
  if (R < 3) return;
  const rng = makeRng(isl.seed);

  // Sand rim.
  ctx.fillStyle = "#e8d194";
  ctx.beginPath();
  ctx.ellipse(bx, by, R * 1.04, R * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isl.kind === "runway") {
    ctx.fillStyle = "#7fae5c";
    ctx.beginPath();
    ctx.ellipse(bx, by, R, R * 0.145, 0, 0, Math.PI * 2);
    ctx.fill();
    return; // the strip itself is drawn by drawRunway (true perspective)
  }

  if (isl.kind === "volcano") {
    // Cone with a crater notch and a smoke plume.
    const grad = ctx.createLinearGradient(bx - R, by, bx + R, by);
    grad.addColorStop(0, "#8a7360");
    grad.addColorStop(0.5, "#6f5947");
    grad.addColorStop(1, "#7d6752");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bx - R, by);
    ctx.quadraticCurveTo(bx - R * 0.28, by - Hp * 0.72, bx - R * 0.13, by - Hp);
    ctx.lineTo(bx + R * 0.13, by - Hp);
    ctx.quadraticCurveTo(bx + R * 0.28, by - Hp * 0.72, bx + R, by);
    ctx.closePath();
    ctx.fill();
    // Green skirt.
    ctx.fillStyle = "#5d8a48";
    ctx.beginPath();
    ctx.moveTo(bx - R, by);
    ctx.quadraticCurveTo(bx, by - Hp * 0.34, bx + R, by);
    ctx.quadraticCurveTo(bx, by + Hp * 0.1, bx - R, by);
    ctx.fill();
    // Crater glow + smoke.
    ctx.fillStyle = "#3d2f28";
    ctx.beginPath();
    ctx.ellipse(bx, by - Hp, R * 0.13, Hp * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,120,60,0.8)";
    ctx.beginPath();
    ctx.ellipse(bx, by - Hp, R * 0.07, Hp * 0.028, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const ph = ((t * 0.12 + i * 0.27 + rng() * 0.1) % 1);
      const sxp = bx + ph * R * 0.5 + Math.sin(ph * 5 + isl.seed) * 6;
      const syp = by - Hp - ph * Hp * 0.55;
      const sr = (6 + ph * 26) * Math.max(base.s, 0.25);
      ctx.fillStyle = `rgba(235,232,228,${0.5 - ph * 0.38})`;
      ctx.beginPath();
      ctx.arc(sxp, syp, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Green dome base shared by hills / terraces / town / lighthouse.
  const dome = (lift, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(bx - R, by);
    ctx.quadraticCurveTo(bx, by - Hp * lift, bx + R, by);
    ctx.quadraticCurveTo(bx, by + R * 0.1, bx - R, by);
    ctx.fill();
  };

  if (isl.kind === "hills") {
    dome(0.62, "#69a34e");
    ctx.fillStyle = "#598f42";
    ctx.beginPath();
    ctx.ellipse(bx - R * 0.34, by - Hp * 0.2, R * 0.4, Hp * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#77b25a";
    ctx.beginPath();
    ctx.ellipse(bx + R * 0.3, by - Hp * 0.12, R * 0.42, Hp * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (isl.kind === "terraces") {
    dome(0.66, "#5f9c4a");
    // Rice steps: bright arcs stepping down the dome.
    for (let i = 0; i < 5; i++) {
      const yy = by - Hp * (0.52 - i * 0.1);
      const ww = R * (0.52 + i * 0.13);
      ctx.strokeStyle = i % 2 ? "#a8d97c" : "#8fce6a";
      ctx.lineWidth = Math.max(2, Hp * 0.045);
      ctx.beginPath();
      ctx.ellipse(bx, yy + Hp * 0.16, ww, Hp * 0.17, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
  } else if (isl.kind === "town") {
    dome(0.4, "#74a855");
    // Houses along the shore.
    const n = Math.max(3, Math.floor(R / 26));
    for (let i = 0; i < n; i++) {
      const hx = bx - R * 0.72 + (i / Math.max(n - 1, 1)) * R * 1.44 + (rng() - 0.5) * 8;
      const hy = by - Hp * 0.1 - rng() * Hp * 0.16;
      const hw = 9 + rng() * 9;
      const hh = 7 + rng() * 7;
      if (base.s < 0.35) continue;
      ctx.fillStyle = ["#f3e3c2", "#e8b4a0", "#cfe3ee", "#f6efda"][i % 4];
      ctx.fillRect(hx - hw / 2, hy - hh, hw, hh);
      ctx.fillStyle = "#b5502f";
      ctx.beginPath();
      ctx.moveTo(hx - hw / 2 - 2, hy - hh);
      ctx.lineTo(hx, hy - hh - hh * 0.62);
      ctx.lineTo(hx + hw / 2 + 2, hy - hh);
      ctx.closePath();
      ctx.fill();
    }
    // Harbour pier + boats.
    ctx.strokeStyle = "#8a6a44";
    ctx.lineWidth = Math.max(2, 3 * base.s);
    ctx.beginPath();
    ctx.moveTo(bx + R * 0.4, by + 2);
    ctx.lineTo(bx + R * 0.78, by + R * 0.1);
    ctx.stroke();
  } else if (isl.kind === "lighthouse") {
    dome(0.5, "#7a7f72");
    const tw = Math.max(5, R * 0.09);
    const th = Hp * 0.95;
    const tx = bx + R * 0.1;
    const ty = by - Hp * 0.34;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? "#e8e4da" : "#c33b2e";
      ctx.fillRect(tx - tw / 2, ty - th + (th / 4) * i, tw, th / 4);
    }
    ctx.fillStyle = "#2c3440";
    ctx.fillRect(tx - tw * 0.7, ty - th - 6 * base.s, tw * 1.4, 6 * base.s);
    const glow = ctx.createRadialGradient(tx, ty - th, 1, tx, ty - th, 26 * Math.max(base.s, 0.4));
    glow.addColorStop(0, "rgba(255,240,170,0.9)");
    glow.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(tx - 30, ty - th - 30, 60, 60);
  }
}

// The runway strip in true perspective (projected corners) + approach lights.
export function drawRunway(ctx, world, cam, t) {
  const rw = world.runway;
  const hz = rw.z - rw.len / 2;
  const nz = rw.z + rw.len / 2;
  const c = [
    project(cam, rw.x - rw.wid / 2, rw.y, hz),
    project(cam, rw.x + rw.wid / 2, rw.y, hz),
    project(cam, rw.x + rw.wid / 2, rw.y, nz),
    project(cam, rw.x - rw.wid / 2, rw.y, nz),
  ];
  if (c.some((p) => !p)) return;
  ctx.fillStyle = "#4b4f55";
  ctx.beginPath();
  ctx.moveTo(c[3].x, c[3].y);
  ctx.lineTo(c[2].x, c[2].y);
  ctx.lineTo(c[1].x, c[1].y);
  ctx.lineTo(c[0].x, c[0].y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes.
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(1.5, 3 * c[0].s * 0.4);
  ctx.setLineDash([14 * c[0].s * 0.4 + 4, 12 * c[0].s * 0.4 + 4]);
  const mid1 = project(cam, rw.x, rw.y, hz);
  const mid2 = project(cam, rw.x, rw.y, nz);
  if (mid1 && mid2) {
    ctx.beginPath();
    ctx.moveTo(mid2.x, mid2.y);
    ctx.lineTo(mid1.x, mid1.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Threshold bars at the near end.
  ctx.fillStyle = "#f5f5f2";
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const p = project(cam, rw.x + i * (rw.wid / 6), rw.y, nz - 26);
    if (p) ctx.fillRect(p.x - 2.5 * p.s * 0.4, p.y - 1, 5 * p.s * 0.4, 2.5);
  }
  // Approach light row leading in, blinking in sequence.
  for (let i = 0; i < 6; i++) {
    const p = project(cam, rw.x, rw.y, nz + 60 + i * 55);
    if (!p) continue;
    const on = Math.floor(t * 2.4) % 6 === i;
    ctx.fillStyle = on ? "#ffe98a" : "rgba(255,233,138,0.35)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.6, 3.4 * p.s * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRing(ctx, ring, cam, t, isNext) {
  const p = project(cam, ring.x, ring.y, ring.z);
  if (!p) return;
  const rx = ring.r * p.s;
  const ry = rx * 0.94;
  if (rx < 4 || p.x < -rx || p.x > VIEW_W + rx) return;
  const passed = ring.state === "passed";
  const missed = ring.state === "missed";
  const col = passed ? "#39d353" : missed ? "#e5484d" : isNext ? "#ffb340" : "#37c8d9";
  ctx.save();
  if (isNext && !passed && !missed) {
    const pulse = 1 + Math.sin(t * 5) * 0.05;
    ctx.strokeStyle = "rgba(255,179,64,0.35)";
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(2.5, rx * 0.09);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(1, rx * 0.028);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, ry, 0, Math.PI * 1.15, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();
}

function drawCloud(ctx, cl, cam) {
  const p = project(cam, cl.x, cl.y, cl.z);
  if (!p) return;
  const s = cl.s * p.s;
  if (s < 4 || p.x < -s * 2 || p.x > VIEW_W + s * 2) return;
  const rng = makeRng(cl.seed);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  for (let i = 0; i < 5; i++) {
    const ox = (rng() - 0.5) * s * 1.5;
    const oy = (rng() - 0.5) * s * 0.34;
    const r = s * (0.3 + rng() * 0.26);
    ctx.beginPath();
    ctx.ellipse(p.x + ox, p.y + oy, r, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(210,228,240,0.5)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + s * 0.2, s * 0.85, s * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The plane's soft shadow on the sea (helps read altitude).
export function drawPlaneShadow(ctx, plane, cam) {
  const p = project(cam, plane.x, 0, plane.z + 30);
  if (!p) return;
  const a = Math.max(0.05, 0.34 - plane.y / 900);
  ctx.fillStyle = `rgba(10,40,60,${a})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 120 * p.s * 2.2, 16 * p.s * 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The seaplane from behind (chase view), banking with the turn.
export function drawPlane(ctx, plane, t) {
  const x = 640 + (plane.screenX || 0);
  const y = 452 + (plane.screenY || 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((plane.bank || 0) * 0.55);
  const u = 1; // unit scale
  // Wing floats + struts.
  ctx.strokeStyle = "#37414d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-72 * u, 16 * u); ctx.lineTo(-84 * u, 44 * u);
  ctx.moveTo(72 * u, 16 * u); ctx.lineTo(84 * u, 44 * u);
  ctx.stroke();
  ctx.fillStyle = "#d8493b";
  for (const fx of [-84, 84]) {
    ctx.beginPath();
    ctx.ellipse(fx * u, 48 * u, 17 * u, 6.5 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Main wing.
  const wingGrad = ctx.createLinearGradient(-150, 0, 150, 0);
  wingGrad.addColorStop(0, "#e8e4da");
  wingGrad.addColorStop(0.5, "#f7f3e8");
  wingGrad.addColorStop(1, "#e8e4da");
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-152 * u, 2 * u);
  ctx.quadraticCurveTo(0, -14 * u, 152 * u, 2 * u);
  ctx.quadraticCurveTo(0, 8 * u, -152 * u, 2 * u);
  ctx.fill();
  ctx.fillStyle = "#d8493b";
  ctx.fillRect(-152 * u, -1 * u, 26 * u, 5 * u);
  ctx.fillRect(126 * u, -1 * u, 26 * u, 5 * u);
  // Prop discs on the wing (twin engines), spinning with throttle.
  for (const ex of [-78, 78]) {
    ctx.fillStyle = "rgba(40,44,52,0.9)";
    ctx.beginPath();
    ctx.ellipse(ex * u, -2 * u, 10 * u, 12 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,205,215,0.5)";
    ctx.lineWidth = 2;
    const ph = t * (6 + plane.throttle * 30) + ex;
    for (let b = 0; b < 3; b++) {
      const a = ph + (b * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(ex * u, -2 * u);
      ctx.lineTo(ex * u + Math.cos(a) * 4 * u, -2 * u + Math.sin(a) * 21 * u);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(220,225,232,0.16)";
    ctx.beginPath();
    ctx.ellipse(ex * u, -2 * u, 5 * u, 22 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fuselage (rear view): hull body + step.
  const bodyGrad = ctx.createLinearGradient(0, -46, 0, 44);
  bodyGrad.addColorStop(0, "#fbf7ec");
  bodyGrad.addColorStop(0.7, "#efe9da");
  bodyGrad.addColorStop(1, "#d9d2c0");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-26 * u, 40 * u);
  ctx.quadraticCurveTo(-30 * u, -6 * u, -17 * u, -30 * u);
  ctx.quadraticCurveTo(0, -44 * u, 17 * u, -30 * u);
  ctx.quadraticCurveTo(30 * u, -6 * u, 26 * u, 40 * u);
  ctx.quadraticCurveTo(0, 50 * u, -26 * u, 40 * u);
  ctx.fill();
  // Cheatline.
  ctx.fillStyle = "#d8493b";
  ctx.fillRect(-27 * u, 12 * u, 54 * u, 6 * u);
  // Canopy glass.
  ctx.fillStyle = "#274b63";
  ctx.beginPath();
  ctx.moveTo(-13 * u, -26 * u);
  ctx.quadraticCurveTo(0, -38 * u, 13 * u, -26 * u);
  ctx.quadraticCurveTo(11 * u, -14 * u, 0, -13 * u);
  ctx.quadraticCurveTo(-11 * u, -14 * u, -13 * u, -26 * u);
  ctx.fill();
  ctx.fillStyle = "rgba(160,220,245,0.65)";
  ctx.beginPath();
  ctx.ellipse(-4 * u, -26 * u, 5 * u, 3.4 * u, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Tailplane + fin with the rajawali sun mark.
  ctx.fillStyle = "#f1ecdd";
  ctx.fillRect(-44 * u, -34 * u, 88 * u, 6 * u);
  ctx.fillStyle = "#d8493b";
  ctx.beginPath();
  ctx.moveTo(-4 * u, -62 * u);
  ctx.quadraticCurveTo(0, -70 * u, 5 * u, -62 * u);
  ctx.lineTo(7 * u, -34 * u);
  ctx.lineTo(-7 * u, -34 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd34d";
  ctx.beginPath();
  ctx.arc(0, -48 * u, 4.6 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Cockpit frame: pillars + dashboard shell (gauges are drawn by hud.js).
export function drawCockpit(ctx) {
  ctx.fillStyle = "#20262e";
  // Pillars.
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(120, 0); ctx.lineTo(210, 470); ctx.lineTo(0, 470);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1280, 0); ctx.lineTo(1160, 0); ctx.lineTo(1070, 470); ctx.lineTo(1280, 470);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(622, 0, 36, 300);
  // Glareshield + dashboard.
  ctx.beginPath();
  ctx.moveTo(0, 720);
  ctx.lineTo(0, 486);
  ctx.quadraticCurveTo(640, 428, 1280, 486);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fillStyle = "#262d36";
  ctx.fill();
  ctx.fillStyle = "#171c22";
  ctx.beginPath();
  ctx.moveTo(0, 486);
  ctx.quadraticCurveTo(640, 428, 1280, 486);
  ctx.lineTo(1280, 512);
  ctx.quadraticCurveTo(640, 458, 0, 512);
  ctx.closePath();
  ctx.fill();
  // Yokes.
  for (const cx of [330, 950]) {
    ctx.strokeStyle = "#10141a";
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(cx, 720);
    ctx.lineTo(cx, 620);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, 596, 34, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
  }
}

// Full world render for one frame.
export function drawWorld(ctx, world, cam, plane, t, view) {
  drawSky(ctx, world.route, cam);
  drawSea(ctx, world.route, cam, t);
  const items = [];
  for (const isl of world.islands) items.push({ k: "i", o: isl, z: isl.z });
  for (const cl of world.clouds) items.push({ k: "c", o: cl, z: cl.z });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) {
    if (it.k === "i") drawIsland(ctx, it.o, cam, t);
    else drawCloud(ctx, it.o, cam);
  }
  drawRunway(ctx, world, cam, t);
  const rings = [...world.rings].sort((a, b) => b.z - a.z);
  for (const r of rings) {
    if (r.state === "passed" && r.z < cam.z) continue;
    drawRing(ctx, r, cam, t, world.rings.indexOf(r) === world.nextIdx);
  }
  if (view === "chase") {
    drawPlaneShadow(ctx, plane, cam);
    drawPlane(ctx, plane, t);
  }
}
