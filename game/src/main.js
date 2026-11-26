// main.js — RAJAWALI WINGS: game state, flight model, cameras, scoring.
// A 3D archipelago air race: pick an airframe and a sortie in the hangar,
// fly the gold gates, then grease the landing on the island runway.
import * as THREE from 'three';
import { buildWorld, buildGates, setGateState, updateWorld, updatePAPI, heightAt, RUNWAY, SORTIES } from './world3d.js';
import { AIRCRAFT, buildAircraft } from './plane.js';
import { drawFlightHud, drawCockpitHud, zoneName } from './hud.js';
import { createScreens } from './screens.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';

const glCanvas = document.getElementById('gl');
const hudCanvas = document.getElementById('hud');
const ctx = hudCanvas.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
renderer.setSize(1280, 720, false);
renderer.setPixelRatio(1);
const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.5, 42000);
const input = createInput(hudCanvas);
const audio = createAudio();
const screens = createScreens();
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');

const sel = { aircraft: 0, sortie: 0, lighting: 'pagi' };
let lightingTouched = false;
let mode = 'menu'; // menu | fly | results | crashed
let paused = false;
let view = 'chase';
let scene = null, world = null, planeObj = null, shadowDisc = null;
let P = null, gateIdx = 0, gatesDone = 0, score = 0, combo = 0, maxCombo = 0;
let phase = 'gates', elapsed = 0, banner = null, res = null, crashInfo = null;
let gateNormals = [], prevRel = 0, landed = false, wasAirborne = false;
let camPos = new THREE.Vector3(-460, 60, 460);
const clock = new THREE.Clock();

const sortie = () => SORTIES[sel.sortie];
const aircraft = () => AIRCRAFT[sel.aircraft];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const courseDegOf = (c) => ((90 - c * 180 / Math.PI) % 360 + 360) % 360;

function disposeScene() {
  if (!scene) return;
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
  });
}
function buildScene() {
  disposeScene();
  scene = new THREE.Scene();
  world = buildWorld(scene, sel.lighting);
  planeObj = buildAircraft(aircraft().id);
  planeObj.group.rotation.order = 'YZX';
  scene.add(planeObj.group);
  shadowDisc = new THREE.Mesh(new THREE.CircleGeometry(7.5, 20),
    new THREE.MeshBasicMaterial({ color: 0x06131c, transparent: true, opacity: 0.32, depthWrite: false }));
  shadowDisc.rotation.x = -Math.PI / 2;
  scene.add(shadowDisc);
}

function gateNormal(i) {
  const s = sortie();
  const g = s.gates[i];
  const n = s.gates[i + 1] || { x: RUNWAY.cx - Math.cos(s.landHdg) * 800, y: 55, z: RUNWAY.cz };
  const v = new THREE.Vector3(n.x - g.x, 0, n.z - g.z);
  return v.normalize();
}

function resetFlight() {
  const s = sortie();
  P = {
    x: -390, y: RUNWAY.y + 2.3, z: RUNWAY.cz, course: 0, pitch: 0, roll: 0,
    speed: 0, vy: 0, throttle: 0, fuel: s.startFuel, airframe: 1,
    gearDown: true, flaps: 0, onGround: true, stall: false, flameout: false,
  };
  gateIdx = 0; gatesDone = 0; score = 0; combo = 0; maxCombo = 0;
  phase = 'gates'; elapsed = 0; landed = false; wasAirborne = false; paused = false;
  gateNormals = s.gates.map((_, i) => gateNormal(i));
  prevRel = -1e9;
  buildGates(scene, world, s);
  banner = { title: 'THROTTLE UP', sub: 'W — full throttle · pull ↓ at rotate speed', until: performance.now() + 4600 };
  camPos.set(P.x - 30, P.y + 9, P.z + 14);
  mode = 'fly';
}

function setBanner(title, sub, secs = 3.4) {
  banner = { title, sub, until: performance.now() + secs * 1000 };
}

function targetPoint() {
  const s = sortie();
  if (phase === 'final') {
    const dir = s.landHdg === 0 ? -1 : 1;
    return { x: RUNWAY.cx + dir * (RUNWAY.len / 2), y: RUNWAY.y + 4, z: RUNWAY.cz };
  }
  const g = s.gates[gateIdx];
  return g ? { x: g.x, y: g.y, z: g.z } : { x: RUNWAY.cx, y: 60, z: RUNWAY.cz };
}

function crash(cause) {
  mode = 'crashed';
  crashInfo = { cause, gatesPassed: gatesDone, score };
  audio.crash();
  audio.engine(0, 0, false);
}

function finishSortie(sinkFpm, centerlineM) {
  const s = sortie();
  let grade, landPts;
  if (sinkFpm > -260 && centerlineM < 6 && P.speed < aircraft().stall * 1.5) { grade = 'PERFECT'; landPts = 600; }
  else if (sinkFpm > -430 && centerlineM < 11) { grade = 'SMOOTH'; landPts = 420; }
  else if (sinkFpm > -660 && centerlineM < 17) { grade = 'FIRM'; landPts = 260; }
  else { grade = 'HARD'; landPts = 120; P.airframe = Math.max(0.4, P.airframe - 0.25); }
  const fuelPts = Math.round(P.fuel * 200);
  const par = s.gates.length * 22 + 75;
  const timePts = Math.max(0, Math.round((par - elapsed) * 2));
  const total = score + landPts + fuelPts + timePts;
  const mm = Math.floor(elapsed / 60), ss = Math.floor(elapsed % 60);
  res = {
    sortie: s, timeText: `${mm}:${String(ss).padStart(2, '0')}`, gatesPassed: gatesDone,
    maxCombo, landingGrade: grade, sinkFpm: Math.round(sinkFpm), centerlineM: Math.round(centerlineM),
    fuelLeft: P.fuel, gatePts: score, landPts, fuelPts, timePts, total,
    stars: total >= 1450 ? 3 : total >= 1000 ? 2 : 1,
  };
  try {
    const k = `rajawali-best-${s.id}`;
    const prev = Number(localStorage.getItem(k) || 0);
    if (total > prev) localStorage.setItem(k, String(total));
  } catch (e) { /* private mode */ }
  mode = 'results';
  audio.fanfare();
}

function stepFlight(dt) {
  const ac = aircraft();
  const s = sortie();
  elapsed += dt;
  // Throttle + speed.
  if (input.keys.has('KeyW')) P.throttle = clamp(P.throttle + dt * 0.55, 0, 1);
  if (input.keys.has('KeyS')) P.throttle = clamp(P.throttle - dt * 0.7, 0, 1);
  if (P.flameout) P.throttle = 0;
  const abBoost = ac.id === 'elang' && P.throttle > 0.92 ? 1.12 : 1;
  const targetSpeed = P.throttle * ac.maxSpeed * abBoost * (P.gearDown ? 0.97 : 1);
  const rate = targetSpeed > P.speed ? ac.accel : ac.accel * 1.7;
  P.speed += clamp(targetSpeed - P.speed, -rate * dt, rate * dt);
  if (P.onGround && !landed) P.speed = Math.max(0, P.speed);
  // Fuel.
  P.fuel -= dt * (0.0016 + P.throttle * 0.0042) * ac.burn * (P.onGround ? 0.4 : 1);
  if (P.fuel <= 0) { P.fuel = 0; if (!P.flameout) { P.flameout = true; setBanner('FLAMEOUT', 'Out of fuel — glide for the runway', 4); } }

  // Controls.
  const pitchIn = (input.keys.has('ArrowDown') ? 1 : 0) - (input.keys.has('ArrowUp') ? 1 : 0);
  const rollIn = (input.keys.has('ArrowRight') ? 1 : 0) - (input.keys.has('ArrowLeft') ? 1 : 0);
  const yawIn = (input.keys.has('KeyD') ? 1 : 0) - (input.keys.has('KeyA') ? 1 : 0);
  if (!P.onGround) {
    P.pitch = clamp(P.pitch + pitchIn * dt * 0.85 - P.pitch * dt * (pitchIn ? 0.1 : 0.55), -0.62, 0.62);
    const targetRoll = rollIn * 1.0;
    P.roll += clamp(targetRoll - P.roll, -dt * 2.4, dt * 2.4);
    const turnRate = clamp(9.8 * Math.tan(P.roll) / Math.max(P.speed, 20), -ac.turn, ac.turn);
    P.course += turnRate * dt + yawIn * dt * 0.22;
    P.course += P.roll * dt * 0.12; // adverse-yaw assist keeps turns honest
  } else {
    P.pitch = landed ? 0 : clamp(P.pitch + pitchIn * dt * 0.5 - P.pitch * dt * 0.8, -0.1, 0.3);
    P.roll *= Math.max(0, 1 - dt * 6);
    P.course += yawIn * dt * clamp(P.speed / 26, 0, 0.5) + rollIn * dt * clamp(P.speed / 40, 0, 0.3);
  }

  // Vertical.
  const stallSpeed = ac.stall * (1 - P.flaps * 0.006);
  P.stall = !P.onGround && P.speed < stallSpeed;
  let vy = P.speed * Math.sin(P.pitch);
  vy += (P.flaps / 30) * (P.speed > stallSpeed * 0.8 ? 1.1 : 0);
  if (P.stall) vy -= (stallSpeed - P.speed) * 0.42 + 1.2;
  if (P.flameout) vy -= 1.4;
  P.vy = vy;

  // Wind (meteorological FROM → vector), gusts in the storm sortie.
  const gust = s.id === 3 ? Math.sin(elapsed * 0.9) * 2.6 + Math.sin(elapsed * 2.7) * 1.4 : 0;
  const windKt = s.wind.kt + gust;
  const windRad = (s.wind.from + 180) * Math.PI / 180;
  const windX = Math.sin(windRad) * windKt * 0.514, windZ = -Math.cos(windRad) * windKt * 0.514;

  const fx = Math.cos(P.course) * Math.cos(P.pitch), fz = Math.sin(P.course) * Math.cos(P.pitch);
  P.x += (fx * P.speed + windX * (P.onGround ? 0 : 1)) * dt;
  P.z += (fz * P.speed + windZ * (P.onGround ? 0 : 1)) * dt;
  if (!P.onGround) P.y += vy * dt;

  // Ground contact.
  const gh = heightAt(P.x, P.z);
  const groundY = gh <= 0 ? 0.9 : gh + 2.3;
  if (P.y <= groundY) {
    const onRunway = Math.abs(P.x - RUNWAY.cx) <= RUNWAY.len / 2 + 30 && Math.abs(P.z - RUNWAY.cz) <= RUNWAY.wid / 2 + 12 && gh > 20;
    if (!P.onGround) {
      // Touchdown moment.
      const sinkFpm = P.vy * 196.85;
      if (onRunway && P.gearDown && sinkFpm > -980) {
        audio.touchdown();
        landed = true;
        P.onGround = true; P.y = groundY; P.pitch = 0;
        touchdownSink = sinkFpm; touchdownCL = Math.abs(P.z - RUNWAY.cz);
        setBanner('TOUCHDOWN — ' + (sinkFpm > -260 ? 'GREASED IT' : sinkFpm > -430 ? 'SMOOTH' : sinkFpm > -660 ? 'FIRM' : 'HARD'), 'Roll out and stop to file the flight', 3.6);
      } else if (onRunway && !P.gearDown) {
        return crash('GEAR-UP LANDING — THE AIRFRAME SLIDES AND BREAKS UP');
      } else if (onRunway && sinkFpm <= -980) {
        return crash('HARD IMPACT — THE AIRFRAME IS LOST');
      } else if (gh <= 0) {
        return crash(ac.id === 'rajawali' && sinkFpm > -300 ? 'DITCHED IN THE BAY — FLOATS HELD, SORTIE OVER' : 'DOWN IN THE BAY — THE AIRFRAME IS LOST');
      } else {
        return crash('CAME DOWN OFF THE RUNWAY — TERRAIN IMPACT');
      }
    }
    P.y = groundY;
    if (landed) {
      P.throttle = 0;
      P.speed = Math.max(0, P.speed - dt * 13);
      if (P.speed < 2.5) { P.speed = 0; return finishSortie(touchdownSink, touchdownCL); }
    } else if (P.speed > stallSpeed * 1.03 && P.pitch > 0.045) {
      P.onGround = false; wasAirborne = true;
      setBanner('AIRBORNE', 'Follow the amber marker on the compass to gate 1', 3.2);
    }
  } else if (P.y > groundY + 1.2) {
    P.onGround = false;
  }
  if (P.y > 1600) P.y = 1600;

  // Gates.
  if (phase === 'gates' && world.gates[gateIdx]) {
    const g = world.gates[gateIdx];
    const dx = P.x - g.x, dy = P.y - g.y, dz = P.z - g.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const rel = dx * gateNormals[gateIdx].x + dz * gateNormals[gateIdx].z;
    if (dist < 31) {
      combo += 1; maxCombo = Math.max(maxCombo, combo);
      const pts = 150 + (combo - 1) * 25;
      score += pts; gatesDone += 1;
      setGateState(world, gateIdx, 'passed');
      audio.gate();
      setBanner(`GATE ${gateIdx + 1} CLEAR  +${pts}`, combo > 1 ? `Combo ×${combo} — keep the streak` : '', 1.6);
      gateIdx += 1; prevRel = -1e9;
      if (gateIdx >= world.gates.length) {
        phase = 'final';
        setBanner('FINAL APPROACH', `Land on RWY ${s.landHdg === 0 ? '09' : '27'} — gear down, follow the PAPI`, 4.2);
      } else setGateState(world, gateIdx, 'next');
    } else if (prevRel < 0 && rel >= 0 && dist < 320) {
      combo = 0;
      setGateState(world, gateIdx, 'missed');
      audio.missed();
      setBanner(`GATE ${gateIdx + 1} MISSED`, 'No points — press on to the next gate', 2.2);
      gateIdx += 1; prevRel = -1e9;
      if (gateIdx >= world.gates.length) { phase = 'final'; setBanner('FINAL APPROACH', `Land on RWY ${s.landHdg === 0 ? '09' : '27'} — gear down, follow the PAPI`, 4.2); }
      else setGateState(world, gateIdx, 'next');
    } else {
      prevRel = rel;
    }
  }

  // PAPI on final.
  if (phase === 'final') {
    const dir = s.landHdg === 0 ? -1 : 1;
    const thrX = RUNWAY.cx + dir * (RUNWAY.len / 2);
    const along = s.landHdg === 0 ? thrX - P.x : P.x - thrX;
    if (along > -50 && along < 2200 && !P.onGround) {
      const glideY = RUNWAY.y + Math.max(0, along) * 0.0524;
      updatePAPI(world, s.landHdg === 0 ? '09' : '27', P.y - glideY);
    }
  }

  // One-shot keys in flight.
  if (input.take('KeyC')) { view = view === 'chase' ? 'cockpit' : 'chase'; camera.fov = view === 'cockpit' ? 66 : 62; camera.updateProjectionMatrix(); }
  if (input.take('KeyG')) { P.gearDown = !P.gearDown; audio.click(); }
  if (input.take('KeyF')) { P.flaps = P.flaps >= 30 ? 0 : P.flaps + 15; audio.click(); }
  if (input.take('KeyP') || input.take('Escape')) paused = true;

  audio.engine(P.throttle, P.speed, true);
}
let touchdownSink = 0, touchdownCL = 0;

function syncPlaneMesh() {
  const g = planeObj.group;
  g.position.set(P.x, P.y, P.z);
  g.rotation.y = -P.course;
  g.rotation.z = P.pitch;
  g.rotation.x = -P.roll;
  for (const p of planeObj.props) {
    p.rotation.x -= (2 + P.throttle * 60) * (1 / 60);
    for (const child of p.children) {
      if (child.userData.blade) child.visible = view !== 'cockpit';
      if (child.userData.disc) child.material.opacity = view === 'cockpit' ? 0.2 : 0.13;
    }
  }
  for (const b of planeObj.burners) {
    const on = P.throttle > 0.04;
    b.visible = on;
    const s = 0.35 + P.throttle * (P.throttle > 0.92 ? 1.5 : 0.95) + Math.sin(performance.now() * 0.05) * 0.06;
    b.scale.set(s, 1, 1);
  }
  const gh = heightAt(P.x, P.z);
  shadowDisc.position.set(P.x, Math.max(gh, 0) + 0.4, P.z);
  const alt = clamp(P.y - gh, 0, 300);
  shadowDisc.material.opacity = 0.32 * (1 - alt / 320);
  shadowDisc.scale.setScalar(1 + alt / 90);
}

function updateCamera(dt) {
  if (mode === 'menu' || mode === 'results' || mode === 'crashed') {
    const cx = mode === 'menu' ? -330 : P ? P.x : -330;
    const cz = RUNWAY.cz, cy = RUNWAY.y + 2.3;
    const ang = SHOT ? -0.5 : performance.now() * 0.00004;
    const r = mode === 'menu' ? 64 : 120;
    camera.position.set(cx + Math.cos(ang) * r, cy + (mode === 'menu' ? 13 : 26), cz + Math.sin(ang) * r);
    camera.lookAt(cx + 10, cy + 5, cz);
    camera.fov = 55; camera.updateProjectionMatrix();
    return;
  }
  const f = new THREE.Vector3(Math.cos(P.course) * Math.cos(P.pitch), Math.sin(P.pitch), Math.sin(P.course) * Math.cos(P.pitch));
  if (view === 'cockpit') {
    const fh = new THREE.Vector3(Math.cos(P.course), 0, Math.sin(P.course));
    camera.position.set(P.x + fh.x * 2.6, P.y + 1.55, P.z + fh.z * 2.6);
    camera.lookAt(P.x + f.x * 100, P.y + 1.55 + f.y * 100, P.z + f.z * 100);
    camera.rotateZ(-P.roll * 0.9);
    return;
  }
  const dist = aircraft().id === 'elang' ? 23 : 19.5;
  const desired = new THREE.Vector3(P.x - f.x * dist, P.y - f.y * dist + 4.2, P.z - f.z * dist);
  const k = 1 - Math.exp(-dt * 3.4);
  camPos.lerp(desired, k);
  camera.position.copy(camPos);
  camera.lookAt(P.x + f.x * 34, P.y + 2.6, P.z + f.z * 34);
  camera.rotateZ(-P.roll * 0.3);
}

function hudState() {
  const s = sortie();
  const tp = targetPoint();
  const dx = tp.x - P.x, dz = tp.z - P.z;
  const nextDist = Math.sqrt(dx * dx + dz * dz);
  const targetCourse = Math.atan2(dz, dx);
  let locDev = 0, glideDev = 0;
  if (phase === 'final') {
    const dir = s.landHdg === 0 ? -1 : 1;
    const thrX = RUNWAY.cx + dir * (RUNWAY.len / 2);
    const along = s.landHdg === 0 ? thrX - P.x : P.x - thrX;
    const glideY = RUNWAY.y + Math.max(0, along) * 0.0524;
    glideDev = clamp((P.y - glideY) / 34, -1, 1);
    locDev = clamp((P.z - RUNWAY.cz) / 42, -1, 1);
  }
  return {
    view, zone: zoneName(P.x, P.z).replace('PULAU ', '') + (zoneName(P.x, P.z).startsWith('PULAU') ? '' : ''),
    sector: zoneName(P.x, P.z) + ' SECTOR',
    aircraft: aircraft(), sortie: s, phase,
    gates: world.gates.map((g) => ({ x: g.x, z: g.z, state: g.state })),
    gateIdx, gatesDone, score, combo, nextDist, targetDeg: courseDegOf(targetCourse),
    locDev, glideDev,
    banner: banner && performance.now() < banner.until ? banner : null,
    wind: s.wind,
    plane: {
      x: P.x, z: P.z, course: P.course, courseDeg: courseDegOf(P.course),
      pitchDeg: P.pitch * 180 / Math.PI, roll: P.roll,
      knots: P.speed * 1.944, feet: P.y * 3.281, vsFpm: P.vy * 196.85,
      throttle: P.throttle, fuel: P.fuel, airframe: P.airframe,
      gearDown: P.gearDown, flaps: P.flaps, onGround: P.onGround,
      stall: P.stall, flameout: P.flameout, driftX: 0,
    },
  };
}

function projectTarget() {
  if (!P || mode !== 'fly') return null;
  const tp = targetPoint();
  const v = new THREE.Vector3(tp.x, tp.y, tp.z).project(camera);
  if (v.z > 1) return null;
  const dx = tp.x - P.x, dy = tp.y - P.y, dz = tp.z - P.z;
  return { gate: { gx: (v.x * 0.5 + 0.5) * 1280, gy: (-v.y * 0.5 + 0.5) * 720, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) } };
}

function handleMenuInput() {
  for (const c of input.clicks.splice(0)) {
    const hit = screens.hits.find((h) => c.x >= h.x && c.x <= h.x + h.w && c.y >= h.y && c.y <= h.y + h.h);
    if (!hit) continue;
    audio.unlock(); audio.click();
    if (hit.type === 'aircraft') sel.aircraft = hit.idx;
    if (hit.type === 'sortie') { sel.sortie = hit.idx; if (!lightingTouched) sel.lighting = sortie().lighting; buildScene(); parkPlane(); }
    if (hit.type === 'lighting') { sel.lighting = hit.key; lightingTouched = true; buildScene(); parkPlane(); }
    if (hit.type === 'fly') { resetFlight(); return; }
    buildSceneIfAircraft(hit);
  }
  if (input.take('Digit1')) sel.aircraft = 0;
  if (input.take('Digit2')) sel.aircraft = 1;
  if (input.take('Digit3')) sel.aircraft = 2;
  if (input.take('ArrowDown')) { sel.sortie = (sel.sortie + 1) % SORTIES.length; if (!lightingTouched) sel.lighting = sortie().lighting; buildScene(); parkPlane(); }
  if (input.take('ArrowUp')) { sel.sortie = (sel.sortie + SORTIES.length - 1) % SORTIES.length; if (!lightingTouched) sel.lighting = sortie().lighting; buildScene(); parkPlane(); }
  if (input.take('Enter')) { audio.unlock(); resetFlight(); }
}
let lastAircraft = -1;
function buildSceneIfAircraft(hit) {
  if (hit.type === 'aircraft' && sel.aircraft !== lastAircraft) { lastAircraft = sel.aircraft; buildScene(); parkPlane(); }
}
function parkPlane() {
  P = {
    x: -330, y: RUNWAY.y + 2.3, z: RUNWAY.cz, course: 0.42, pitch: 0, roll: 0,
    speed: 0, vy: 0, throttle: 0, fuel: 0.9, airframe: 1,
    gearDown: true, flaps: 0, onGround: true, stall: false, flameout: false,
  };
  syncPlaneMesh();
}

function stageShot() {
  if (!SHOT) return;
  if (SHOT === 'title') {
    sel.aircraft = 0; sel.sortie = 0; sel.lighting = 'pagi';
    buildScene(); parkPlane();
    mode = 'menu';
  } else if (SHOT === 'rings') {
    sel.lighting = 'pagi'; buildScene(); resetFlight();
    setGateState(world, 0, 'passed'); setGateState(world, 1, 'passed');
    gateIdx = 2; gatesDone = 2; score = 675; combo = 2; maxCombo = 2;
    Object.assign(P, { x: 1830, y: 262, z: -760, pitch: 0.03, roll: -0.3, speed: 47, throttle: 0.7, fuel: 0.66, onGround: false });
    P.course = Math.atan2(-950 - P.z, 2150 - P.x);
    elapsed = 74; banner = null;
    camPos.set(P.x - 15, P.y + 5, P.z + 9);
  } else if (SHOT === 'cockpit') {
    sel.lighting = 'pagi'; buildScene(); resetFlight();
    for (let i = 0; i < world.gates.length; i++) setGateState(world, i, 'passed');
    gateIdx = world.gates.length; gatesDone = 6; score = 1275; combo = 6; maxCombo = 6;
    phase = 'final'; view = 'cockpit'; camera.fov = 66; camera.updateProjectionMatrix();
    Object.assign(P, { x: -1250, y: 70, z: 936, course: 0.015, pitch: -0.05, roll: 0.02, speed: 33, throttle: 0.34, fuel: 0.38, onGround: false, gearDown: true, flaps: 15 });
    elapsed = 158;
    updatePAPI(world, '09', P.y - (RUNWAY.y + Math.max(0, (RUNWAY.cx - RUNWAY.len / 2) - P.x) * 0.0524));
    banner = { title: 'FINAL — RWY 09', sub: 'Follow the PAPI · two white, two red', until: performance.now() + 1e9 };
  } else if (SHOT === 'complete') {
    sel.lighting = 'pagi'; buildScene(); resetFlight();
    score = 1275; gatesDone = 6;
    Object.assign(P, { x: 150, y: RUNWAY.y + 2.3, z: RUNWAY.cz, course: 0, speed: 0, throttle: 0, onGround: true });
    res = {
      sortie: SORTIES[0], timeText: '2:47', gatesPassed: 6, maxCombo: 6, landingGrade: 'SMOOTH',
      sinkFpm: -264, centerlineM: 5, fuelLeft: 0.41, gatePts: 1275, landPts: 420, fuelPts: 82, timePts: 80,
      total: 1857, stars: 3,
    };
    mode = 'results';
  }
}

buildScene();
parkPlane();
stageShot();

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (mode === 'menu') handleMenuInput();
  else if (mode === 'fly') {
    if (paused) {
      if (input.take('KeyP') || input.take('Escape')) paused = false;
      if (input.take('KeyM')) { mode = 'menu'; paused = false; buildScene(); parkPlane(); }
    } else if (!SHOT) {
      stepFlight(dt); // staged screenshots freeze the flight model for determinism
    }
    if (input.take('KeyM') && paused) { mode = 'menu'; buildScene(); parkPlane(); }
  } else if (mode === 'results') {
    if (input.take('Enter')) { sel.sortie = (sel.sortie + 1) % SORTIES.length; if (!lightingTouched) sel.lighting = sortie().lighting; buildScene(); resetFlight(); }
    if (input.take('KeyR')) { buildScene(); resetFlight(); }
    if (input.take('KeyM')) { mode = 'menu'; buildScene(); parkPlane(); }
  } else if (mode === 'crashed') {
    if (input.take('KeyR')) { buildScene(); resetFlight(); }
    if (input.take('KeyM')) { mode = 'menu'; buildScene(); parkPlane(); }
  }
  input.clicks.length = 0;
  if (P) syncPlaneMesh();
  updateWorld(world, SHOT ? 0.016 : dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  // Overlay. Always clear first: the menu/results overlays paint translucent
  // dim layers, which would compound frame over frame into darkness.
  ctx.clearRect(0, 0, 1280, 720);
  if (mode === 'menu') screens.drawMenu(ctx, sel);
  else {
    const st = hudState();
    const proj = projectTarget();
    if (view === 'cockpit' && mode === 'fly') drawCockpitHud(ctx, st, proj);
    else drawFlightHud(ctx, st, proj);
    if (mode === 'results' && res) screens.drawResults(ctx, res);
    if (mode === 'crashed' && crashInfo) screens.drawCrashed(ctx, crashInfo);
    if (paused) screens.drawPaused(ctx);
  }
  input.endFrame();
}
requestAnimationFrame(frame);
