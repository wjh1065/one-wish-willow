// Sounds made on the spot with WebAudio: the paper box, the creaking wood and a heartbeat, the crack, the dark after.
// Browsers only allow sound after a tap, so nothing plays until the first press.

let audio = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

export function wake() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
}

function ready() {
  return audio && !muted && audio.state === "running";
}

function noise(seconds) {
  const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * seconds)), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  return source;
}

// A short burst of filtered noise, shaped by a quick fade
function burst({ seconds, type, frequency, q = 1, gain, attack = 0.004 }) {
  const now = audio.currentTime;
  const src = noise(seconds);
  const filter = audio.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const amp = audio.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  src.connect(filter).connect(amp).connect(audio.destination);
  src.start(now);
}

function tone(frequency, start, seconds, gain = 0.08, type = "triangle") {
  const now = audio.currentTime + start;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  const amp = audio.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
  osc.connect(amp).connect(audio.destination);
  osc.start(now);
  osc.stop(now + seconds + 0.02);
}

export function paper() {
  if (!ready()) return;
  burst({ seconds: 0.35, type: "highpass", frequency: 2500, gain: 0.12, attack: 0.05 });
}

// Wood straining: the harder it bends, the lower and louder the creak
export function creak(tension) {
  if (!ready()) return;
  burst({ seconds: 0.06 + tension * 0.05, type: "bandpass", frequency: 900 - tension * 500, q: 8, gain: 0.05 + tension * 0.25 });
}

export function crack() {
  if (!ready()) return;
  burst({ seconds: 0.18, type: "highpass", frequency: 1200, gain: 0.9, attack: 0.001 });
  burst({ seconds: 0.35, type: "lowpass", frequency: 300, gain: 0.6, attack: 0.002 });
}

// A heart, lub-dub, louder as the wood strains
export function heartbeat(tension) {
  if (!ready()) return;
  const gain = 0.25 + tension * 0.5;
  thump(0, gain);
  thump(0.14, gain * 0.7);
}

function thump(start, gain) {
  const now = audio.currentTime + start;
  const osc = audio.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(70, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
  const amp = audio.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(amp).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

// A low hum that settles over the dark room after the snap
export function drone() {
  if (!ready()) return;
  const now = audio.currentTime;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;
  const amp = audio.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(0.12, now + 2.5);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + 11);
  filter.connect(amp).connect(audio.destination);
  for (const f of [55, 58.3, 82.4]) {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = f;
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + 11.2);
  }
}

// One heavy low hit, for the moment it says the wish will be granted
export function boom() {
  if (!ready()) return;
  thump(0, 0.9);
  burst({ seconds: 1.4, type: "lowpass", frequency: 160, gain: 0.35, attack: 0.01 });
}

// A harsh hiss under a low hit, as the wish floods the screen
export function screech() {
  if (!ready()) return;
  burst({ seconds: 1.1, type: "bandpass", frequency: 2600, q: 1.5, gain: 0.3, attack: 0.01 });
  thump(0, 0.7);
}

// A copy of the wish slapped on: a short dull pat (louder when many land at once)
let lastSlap = 0;
export function slap(amount) {
  if (!ready() || audio.currentTime - lastSlap < 0.05) return;
  lastSlap = audio.currentTime;
  burst({ seconds: 0.05, type: "bandpass", frequency: 700 + Math.random() * 500, q: 3, gain: 0.08 + amount * 0.12 });
}

export function tick() {
  if (!ready()) return;
  tone(1320, 0, 0.05, 0.03, "square");
}
