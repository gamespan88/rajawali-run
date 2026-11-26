// main.js — Rajawali Run: game state, the flight model, ring and
// landing rules, and the frame loop. Views: chase and cockpit.

import { ROUTES, buildWorld } from "./world.js";
import { drawWorld, drawCockpit } from "./render.js";
import { drawChaseHud, drawCockpitHud, drawBanner } from "./hud.js";
import { drawTitle, drawComplete, drawCrashed, drawPaused } from "./screens.js";
import { initInput, input, down, tapped, endFrame } from "./input.js";
import { initAudio, engineSound, ringChime, missBuzz, fanfare, thud, click } from "./audio.js";
import { applyShot } from "./shots.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const W = 1280;
const H = 720;

let progress = { unlocked: 1, best: {} };
try {
  const saved = localStorage.getItem("rajawali-run");
  if (saved) progress = JSON.parse(saved);
} catch { /* storage is a bonus, never required */ }

function saveProgress() {
  try { localStorage.setItem("rajawali-run", JSON.stringify(progress)); } catch { /* ok */ }
}

const st = {
  mode: "title",
  routeIdx: 0,
  route: ROUTES[0],
  world: null,
  view: "chase",
  plane: null,
  score: 0,
  ringPoints: 0,
  combo: 0,
  ringsHit: 0,
  timeSec: 0,
  banner: null,
  guide: null,
  stars: 0,
  landingRating: "",
  landingBonus: 0,
  timeBonus: 0,
  fuelBonus: 0,
  fuelWarned: false,
  crashTitle: "",
  crashWhy: "",
  unlocked: progress.unlocked,
  best: progress.best,
  titleZ: 0,
};

function newPlane() {
  return {
    x: 0, y: 150, z: 0,
    speed: 40, throttle: 0.72, fuel: 1,
    heading: 0, headingDeg: 0,
    bank: 0, pitch: 0, vsi: 0,
    screenX: 0, screenY: 0,
  };
}

function startRoute(idx) {
  st.routeIdx = idx;
  st.route = ROUTES[idx];
  st.world = buildWorld(st.route);
  st.world.nextIdx = 0;
  st.plane = newPlane();
  st.view = "chase";
  st.score = 0;
  st.ringPoints = 0;
  st.combo = 0;
  st.ringsHit = 0;
  st.timeSec = 0;
  st.banner = null;
  st.stars = 0;
  st.landingRating = "";
  st.landingBonus = 0;
  st.timeBonus = 0;
  st.fuelBonus = 0;
  st.fuelWarned = false;
  st.mode = "flying";
  setBanner(st.route.name, st.route.sub, "#ffb340", 2.6);
  say(`Route ${st.route.id}, ${st.route.name}. Fly through ${st.world.rings.length} rings, then land on the runway.`);
}

function setBanner(text, sub, col, dur = 1.6) {
  const now = perfT;
  st.banner = { text, sub, col, from: now, until: now + dur };
}

function say(text) {
  if (statusEl) statusEl.textContent = text;
}

// ------------------------------------------------------------ flight model

function updateFlight(dt) {
  const p = st.plane;
  // Throttle.
  if (down("KeyW")) p.throttle = Math.min(1, p.throttle + dt * 0.45);
  if (down("KeyS")) p.throttle = Math.max(0, p.throttle - dt * 0.45);
  // Bank from arrows or mouse drag.
  let bankIn = 0;
  if (down("ArrowLeft")) bankIn -= 1;
  if (down("ArrowRight")) bankIn += 1;
  if (input.mouseDown) bankIn += Math.max(-1, Math.min(1, input.mouseDX * 1.4));
  p.bank += (Math.max(-1, Math.min(1, bankIn)) - p.bank) * Math.min(1, dt * 4.2);
  // Pitch: Down arrow (or S-free stick pull) climbs, Up descends.
  let pitchIn = 0;
  if (down("ArrowDown")) pitchIn += 1;
  if (down("ArrowUp")) pitchIn -= 1;
  if (input.mouseDown) pitchIn += Math.max(-1, Math.min(1, -input.mouseDY * 1.3));
  p.pitch += (Math.max(-1, Math.min(1, pitchIn)) - p.pitch) * Math.min(1, dt * 3.6);
  // Rudder fine trim.
  if (down("KeyA")) p.heading -= dt * 0.12;
  if (down("KeyD")) p.heading += dt * 0.12;
  // Fuel burns with the throttle; an empty tank means gliding home.
  p.fuel = Math.max(0, p.fuel - dt * (0.0021 + p.throttle * 0.0043));
  if (p.fuel < 0.25 && !st.fuelWarned) {
    st.fuelWarned = true;
    setBanner("LOW FUEL", "EASE OFF THE THROTTLE", "#e8a33d", 2.2);
  }
  const flameout = p.fuel <= 0;
  // Speed chases the throttle.
  const targetSpeed = flameout ? 24 : 22 + p.throttle * 48;
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.55);
  // Turn from bank; vertical speed from pitch, throttle and stall.
  const turnRate = p.bank * 0.5 * Math.max(0.55, Math.min(1.25, 34 / p.speed));
  p.heading += turnRate * dt;
  p.headingDeg = ((p.heading * 180 / Math.PI) % 360 + 360) % 360;
  let vsi = p.pitch * p.speed * 0.4 + (p.throttle - 0.42) * 2.4;
  if (flameout) vsi -= 1.7; // a dead engine only glides down
  if (p.speed < 25 && p.pitch > 0.1) vsi -= (25 - p.speed) * 0.24; // stall sink
  p.vsi = vsi;
  p.y += vsi * dt;
  if (p.y > 640) { p.y = 640; p.vsi = Math.min(p.vsi, 0); }
  p.x += Math.sin(p.heading) * p.speed * dt;
  p.z += Math.cos(p.heading) * p.speed * dt;
  p.screenX = -p.bank * 46;
  p.screenY = -p.pitch * 30;
  st.timeSec += dt;

  checkRings();
  checkLandingAndTerrain();
  updateGuide();
  engineSound(p.throttle, p.fuel > 0);
}

function checkRings() {
  const p = st.plane;
  const world = st.world;
  const idx = world.nextIdx;
  const ring = world.rings[idx];
  if (!ring) return;
  if (p.z >= ring.z && ring.state === "next") {
    const dx = p.x - ring.x;
    const dy = p.y - ring.y;
    if (Math.hypot(dx, dy) <= ring.r) {
      ring.state = "passed";
      st.ringsHit += 1;
      st.combo += 1;
      const pts = 100 + (st.combo - 1) * 25;
      st.ringPoints += pts;
      st.score = st.ringPoints;
      setBanner(`RING ${st.ringsHit} · +${pts}`, st.combo > 1 ? `COMBO ×${st.combo}` : "", "#39d353", 1.3);
      ringChime(st.combo);
    } else {
      ring.state = "missed";
      st.combo = 0;
      setBanner("RING MISSED", "", "#e5484d", 1.1);
      missBuzz();
    }
    world.nextIdx += 1;
    if (world.nextIdx >= world.rings.length) {
      setBanner("ALL RINGS FLOWN", "FINAL — LINE UP ON THE RUNWAY", "#ffb340", 2.4);
    }
  }
}

function crash(title, why) {
  st.mode = "crashed";
  st.crashTitle = title;
  st.crashWhy = why;
  engineSound(0, false);
  thud();
  say(`${title}. ${why}`);
}

function checkLandingAndTerrain() {
  const p = st.plane;
  const world = st.world;
  const rw = world.runway;
  const allRings = world.nextIdx >= world.rings.length;

  // Touchdown on the strip.
  if (allRings &&
      p.z > rw.z - rw.len / 2 && p.z < rw.z + rw.len / 2 &&
      Math.abs(p.x - rw.x) < rw.wid / 2 + 4 &&
      p.y <= rw.y + 2.4) {
    const spdKt = p.speed * 1.944;
    if (p.vsi < -5.2 || p.speed > 46) {
      crash("HARD ARRIVAL", `You hit the strip at ${Math.round(spdKt)} kt, sinking fast.`);
      return;
    }
    let rating = "FIRM";
    let bonus = 120;
    if (Math.abs(p.vsi) < 1.9 && p.speed < 37 && Math.abs(p.x - rw.x) < 11) {
      rating = "PERFECT";
      bonus = 400;
    } else if (Math.abs(p.vsi) < 3.4 && p.speed < 42) {
      rating = "SMOOTH";
      bonus = 250;
    }
    st.landingRating = rating;
    st.landingBonus = bonus;
    st.timeBonus = Math.max(0, Math.round((st.route.par - st.timeSec)) * 5);
    st.fuelBonus = Math.round(p.fuel * 200);
    st.score = st.ringPoints + bonus + st.timeBonus + st.fuelBonus;
    st.stars = Math.min(3, 1 + (st.ringsHit === world.rings.length ? 1 : 0) + (rating !== "FIRM" ? 1 : 0));
    st.mode = "complete";
    engineSound(0, false);
    fanfare();
    const id = st.route.id;
    if (!st.best[id] || st.score > st.best[id].score) {
      st.best[id] = { score: st.score, time: Math.round(st.timeSec) };
    }
    st.unlocked = Math.max(st.unlocked, Math.min(ROUTES.length, id + 1));
    progress.unlocked = st.unlocked;
    progress.best = st.best;
    saveProgress();
    say(`Route complete. ${rating} landing. Score ${st.score}.`);
    return;
  }

  // Overshot the island entirely.
  if (allRings && p.z > rw.z + rw.len / 2 + 420) {
    crash("OVERSHOT", "You flew past Pulau Elang. Turn back sooner next time.");
    return;
  }

  // Terrain: island silhouettes have real height.
  for (const isl of world.islands) {
    if (isl.kind === "runway") continue;
    const dx = p.x - isl.x;
    const dz = p.z - isl.z;
    const dist = Math.hypot(dx, dz);
    if (dist < isl.r * 0.8) {
      const hAt = isl.h * Math.max(0, 1 - dist / isl.r);
      if (p.y < hAt + 3) {
        crash("TERRAIN", "You clipped the island. Give the volcano more room.");
        return;
      }
    }
  }

  // The sea.
  if (p.y <= 1) {
    crash("SPLASHDOWN!", "The Elang-9 is a seaplane, but the race ends in the drink.");
  }
}

function updateGuide() {
  const p = st.plane;
  const world = st.world;
  const ring = world.rings[world.nextIdx];
  if (ring) {
    const dist = Math.max(0, Math.round(ring.z - p.z));
    const rel = Math.atan2(ring.x - p.x, ring.z - p.z) - p.heading;
    const arrow = Math.sin(rel) > 0.14 ? 1 : Math.sin(rel) < -0.14 ? -1 : 0;
    const dy = ring.y - p.y;
    const alt = dy > 18 ? "CLIMB ▲" : dy < -18 ? "DESCEND ▼" : "LEVEL";
    st.guide = {
      text: `RING ${world.nextIdx + 1} OF ${world.rings.length} · ${dist} M`,
      sub: alt, arrow, final: false,
    };
  } else {
    const rw = world.runway;
    const dist = Math.max(0, Math.round(rw.z - p.z));
    const rel = Math.atan2(rw.x - p.x, rw.z - p.z) - p.heading;
    const arrow = Math.sin(rel) > 0.1 ? 1 : Math.sin(rel) < -0.1 ? -1 : 0;
    st.guide = {
      text: `FINAL · RWY 09 · ${dist} M`,
      sub: "PULAU ELANG — DESCEND · 55–85 KT",
      arrow, final: true,
    };
  }
}

// ------------------------------------------------------------ cameras

function flightCam() {
  const p = st.plane;
  return {
    x: p.x, y: p.y + 7, z: p.z, heading: p.heading,
    pitchPx: -p.pitch * 40,
  };
}

function titleCam() {
  // A slow cinematic pass: a virtual plane ferries along route 1.
  const z = (st.titleZ % 5200);
  const x = Math.sin(z * 0.0011) * 130;
  const y = 185 + Math.sin(z * 0.0007) * 22;
  const heading = Math.cos(z * 0.0011) * 0.14;
  return {
    cam: { x, y: y + 7, z, heading, pitchPx: 6 },
    plane: {
      x, y, z: z + 55, speed: 44, throttle: 0.7,
      bank: Math.cos(z * 0.0011) * 0.3, pitch: 0,
      screenX: -305, screenY: -138,
    },
  };
}

// ------------------------------------------------------------ frame

let perfT = 0;
let lastTs = 0;

function frame(ts) {
  perfT = ts / 1000;
  const dt = Math.min(0.033, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  const t = perfT;

  // Fit the window, letterboxed, always rendering at 1280x720.
  const cw = innerWidth, ch = innerHeight;
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const scale = Math.min(cw / W, ch / H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0b1622";
  ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(scale, 0, 0, scale, (cw - W * scale) / 2, (ch - H * scale) / 2);

  if (st.mode === "title") {
    st.titleZ += dt * 44;
    if (!st.world) { st.world = buildWorld(st.route); st.world.nextIdx = 0; }
    if (tapped("ArrowLeft")) { st.routeIdx = (st.routeIdx + ROUTES.length - 1) % ROUTES.length; click(); }
    if (tapped("ArrowRight")) { st.routeIdx = (st.routeIdx + 1) % ROUTES.length; click(); }
    if (tapped("Digit1", "Digit2", "Digit3")) {
      st.routeIdx = Number([...input.pressed].find((c) => c.startsWith("Digit"))?.slice(5)) - 1;
    }
    const { cam, plane } = titleCam();
    const w = buildWorld(ROUTES[st.routeIdx]);
    w.nextIdx = 0;
    drawWorld(ctx, w, cam, plane, t, "chase");
    drawTitle(ctx, st, t);
    if (tapped("Enter") || (input.mouseDown && !st._clickGuard)) {
      if (st.routeIdx + 1 <= st.unlocked) { initAudio(); startRoute(st.routeIdx); }
    }
  } else if (st.mode === "flying" || st.mode === "paused") {
    if (st.mode === "flying") {
      if (tapped("KeyP")) st.mode = "paused";
      else updateFlight(dt);
    } else if (tapped("KeyP")) st.mode = "flying";
    if (tapped("KeyC")) st.view = st.view === "chase" ? "cockpit" : "chase";
    if (tapped("Escape")) { st.mode = "title"; st.world = null; engineSound(0, false); }
    const cam = flightCam();
    drawWorld(ctx, st.world, cam, st.plane, t, st.view);
    if (st.view === "cockpit") {
      drawCockpit(ctx);
      drawCockpitHud(ctx, st);
    } else {
      drawChaseHud(ctx, st);
    }
    drawBanner(ctx, st, t);
    if (st.mode === "paused") drawPaused(ctx);
  } else if (st.mode === "complete") {
    const cam = flightCam();
    drawWorld(ctx, st.world, cam, st.plane, t, "chase");
    drawComplete(ctx, st);
    if (tapped("Enter")) {
      if (st.routeIdx + 1 < ROUTES.length && st.routeIdx + 2 <= st.unlocked) startRoute(st.routeIdx + 1);
      else { st.mode = "title"; st.world = null; }
    }
    if (tapped("KeyR")) startRoute(st.routeIdx);
    if (tapped("Escape")) { st.mode = "title"; st.world = null; }
  } else if (st.mode === "crashed") {
    const cam = flightCam();
    drawWorld(ctx, st.world, cam, st.plane, t, "chase");
    drawCrashed(ctx, st);
    if (tapped("KeyR")) startRoute(st.routeIdx);
    if (tapped("Escape")) { st.mode = "title"; st.world = null; }
  }

  endFrame();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ boot

initInput(canvas);
canvas.addEventListener("pointerdown", () => { initAudio(); });
const shotName = new URLSearchParams(location.search).get("shot");
if (shotName) applyShot(st, shotName, { startRoute, setBanner });
requestAnimationFrame(frame);
