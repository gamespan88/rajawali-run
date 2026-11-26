// audio.js — all sound is synthesised with WebAudio: a twin-prop engine
// whose pitch follows the throttle, a ring chime, a landing fanfare and
// a splash thud. No audio files. Starts on the first user gesture.

let ac = null;
let engineOsc = null;
let engineOsc2 = null;
let engineGain = null;

export function initAudio() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = ac.createOscillator();
    engineOsc2 = ac.createOscillator();
    engineGain = ac.createGain();
    engineOsc.type = "sawtooth";
    engineOsc2.type = "square";
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    engineGain.gain.value = 0;
    engineOsc.connect(lp);
    engineOsc2.connect(lp);
    lp.connect(engineGain);
    engineGain.connect(ac.destination);
    engineOsc.start();
    engineOsc2.start();
  } catch {
    ac = null;
  }
}

export function engineSound(throttle, running) {
  if (!ac || !engineOsc) return;
  const f = 55 + throttle * 65;
  engineOsc.frequency.value = f;
  engineOsc2.frequency.value = f * 1.5 + 2;
  engineGain.gain.setTargetAtTime(running ? 0.028 + throttle * 0.03 : 0, ac.currentTime, 0.12);
}

function blip(freq, t0, dur, type = "sine", vol = 0.12) {
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t0 + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start(ac.currentTime + t0);
  o.stop(ac.currentTime + t0 + dur + 0.02);
}

export function ringChime(combo) {
  const base = 660 + Math.min(combo, 8) * 40;
  blip(base, 0, 0.16, "sine", 0.14);
  blip(base * 1.5, 0.07, 0.22, "sine", 0.12);
}

export function missBuzz() {
  blip(160, 0, 0.22, "sawtooth", 0.06);
}

export function fanfare() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((n, i) => blip(n, i * 0.13, 0.34, "triangle", 0.13));
  blip(1318, 0.56, 0.5, "triangle", 0.12);
}

export function thud() {
  blip(70, 0, 0.4, "sine", 0.22);
  blip(48, 0.05, 0.5, "sine", 0.18);
}

export function click() {
  blip(880, 0, 0.07, "square", 0.05);
}
