// Tüm sesler Web Audio ile sentezleniyor; dışarıdan ses dosyası yok.

let ctx = null;
let master = null;
let fanSrc = null;
let fanGain = null;
let muted = false;

export function initAudio() {
  if (ctx) { ctx.resume?.(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.55;
}

function tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, slide = null } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function getNoise() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function noise(dur, { vol = 0.2, at = 0, freq = 2000, q = 1, type = 'bandpass' } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const s = ctx.createBufferSource();
  s.buffer = getNoise();
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random());
  s.stop(t + dur + 0.02);
}

export const sfx = {
  click() { noise(0.03, { vol: 0.25, freq: 3200 }); },
  pick() { noise(0.18, { vol: 0.06, freq: 900, q: 0.6 }); tone(520, 0.08, { vol: 0.04, type: 'triangle' }); },
  snap() {
    noise(0.025, { vol: 0.45, freq: 4200, q: 2 });
    noise(0.03, { vol: 0.35, freq: 2600, q: 2, at: 0.05 });
  },
  error() {
    tone(150, 0.16, { type: 'square', vol: 0.09 });
    tone(110, 0.24, { type: 'square', vol: 0.09, at: 0.18 });
  },
  beep(len = 0.16, at = 0) { tone(880, len, { type: 'square', vol: 0.07, at }); },
  chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.55, { vol: 0.09, at: i * 0.11, type: 'triangle' })); },
  cash() {
    tone(1319, 0.1, { vol: 0.12, type: 'triangle' });
    tone(1760, 0.4, { vol: 0.12, type: 'triangle', at: 0.09 });
    noise(0.12, { vol: 0.08, freq: 6500, at: 0.04 });
  },
  doorbell() { tone(988, 0.5, { vol: 0.1 }); tone(784, 0.8, { vol: 0.1, at: 0.42 }); },
  powerDown() { tone(380, 0.5, { type: 'sawtooth', vol: 0.04, slide: 50 }); },
  relay() { noise(0.02, { vol: 0.3, freq: 1500, q: 3 }); },
};

export function setFan(on) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (on && !fanSrc) {
    fanSrc = ctx.createBufferSource();
    fanSrc.buffer = getNoise();
    fanSrc.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 520;
    fanGain = ctx.createGain();
    fanGain.gain.setValueAtTime(0.0001, t);
    fanGain.gain.exponentialRampToValueAtTime(0.11, t + 0.8);
    fanSrc.connect(f).connect(fanGain).connect(master);
    fanSrc.start();
  } else if (!on && fanSrc) {
    const s = fanSrc;
    fanGain.gain.cancelScheduledValues(t);
    fanGain.gain.setValueAtTime(fanGain.gain.value, t);
    fanGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    s.stop(t + 1);
    fanSrc = null;
  }
}
