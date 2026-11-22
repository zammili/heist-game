// GILDED — sound. One job: every beep, chime and siren, synthesized with
// WebAudio, no audio files. The audio context is created on the first user
// gesture (browsers demand it) and stays silent until then; shot mode never
// touches it. M toggles mute.
let ctx = null;
let muted = false;
let ambientNodes = null;

function ensureContext() {
  if (ctx) return ctx;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  ctx = new AudioContext();
  return ctx;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const Sound = {
  unlock() {
    const c = ensureContext();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    if (c) startAmbient();
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() {
    return muted;
  },
  coin() {
    tone(1320, 0.09, 'sine', 0.12);
    tone(1760, 0.12, 'sine', 0.10, 0.06);
  },
  loot() {
    tone(880, 0.12, 'triangle', 0.14);
    tone(1174, 0.14, 'triangle', 0.12, 0.08);
    tone(1568, 0.2, 'triangle', 0.12, 0.16);
  },
  gem() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.13, i * 0.07));
  },
  spotted() {
    tone(220, 0.18, 'sawtooth', 0.10, 0, 440);
    tone(220, 0.18, 'sawtooth', 0.10, 0.16, 440);
  },
  caught() {
    tone(392, 0.5, 'sawtooth', 0.16, 0, 98);
    tone(196, 0.7, 'square', 0.08, 0.1, 65);
  },
  escape() {
    [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.09));
  },
  win() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, 'triangle', 0.13, i * 0.11));
  },
  step(sneaking) {
    tone(sneaking ? 140 : 190, 0.05, 'sine', sneaking ? 0.02 : 0.035);
  },
};

// A low, slow two-oscillator drone under everything — the gallery at night.
function startAmbient() {
  if (!ctx || ambientNodes || muted) return;
  const g = ctx.createGain();
  g.gain.value = 0.035;
  g.connect(ctx.destination);
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 55;
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = 55.7;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);
  o1.connect(g);
  o2.connect(g);
  o1.start();
  o2.start();
  lfo.start();
  ambientNodes = { g, o1, o2, lfo };
}
