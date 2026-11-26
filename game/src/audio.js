// audio.js — all sound is synthesized WebAudio: engine, wind, chimes, thuds.
export function createAudio() {
  let ac = null, engineOsc = null, engineOsc2 = null, engineGain = null, windGain = null, master = null;
  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      engineOsc = ac.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineOsc2 = ac.createOscillator(); engineOsc2.type = 'square'; engineOsc2.frequency.value = 28;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      engineGain = ac.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(lp); engineOsc2.connect(lp); lp.connect(engineGain); engineGain.connect(master);
      engineOsc.start(); engineOsc2.start();
      const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const wind = ac.createBufferSource(); wind.buffer = nb; wind.loop = true;
      const wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 600; wf.Q.value = 0.6;
      windGain = ac.createGain(); windGain.gain.value = 0;
      wind.connect(wf); wf.connect(windGain); windGain.connect(master);
      wind.start();
    } catch (e) { /* audio is optional */ }
  }
  function blip(freq, t0, dur, type = 'sine', vol = 0.16) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t0 + dur);
    o.connect(g); g.connect(master);
    o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dur + 0.02);
  }
  return {
    unlock: ensure,
    engine(rpm, speed, running) {
      if (!ac) return;
      const t = ac.currentTime;
      engineOsc.frequency.setTargetAtTime(40 + rpm * 95, t, 0.08);
      engineOsc2.frequency.setTargetAtTime(20 + rpm * 48, t, 0.08);
      engineGain.gain.setTargetAtTime(running ? 0.028 + rpm * 0.05 : 0, t, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.11, speed * 0.0011), t, 0.15);
    },
    gate() { blip(880, 0, 0.14); blip(1318, 0.07, 0.2); },
    missed() { blip(220, 0, 0.25, 'square', 0.1); },
    touchdown() { blip(72, 0, 0.22, 'triangle', 0.3); blip(1180, 0.02, 0.1, 'sine', 0.05); },
    click() { blip(660, 0, 0.06, 'triangle', 0.08); },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => blip(f, i * 0.11, 0.3, 'triangle', 0.14)); },
    crash() {
      if (!ac) return;
      blip(60, 0, 0.5, 'sawtooth', 0.3); blip(44, 0.05, 0.6, 'square', 0.22);
    },
  };
}
