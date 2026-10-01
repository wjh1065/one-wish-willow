// One Wish Willow: the commercial as a pixel toy, with a darker ending. Take the willow out of its box, write your
// one wish, snap the stick in two with both fists. The lights go down and it tells you the wish will be granted.
// One wish per device, for life (the Reset button in the top bar starts over, for trying it again).
import { FIST, FONT, H, P, STICK_L, STICK_T, W, breakStick, drawBox, drawFist, drawSparkle, drawStick, hash, rng } from "./art.js";
import { shareCard } from "./card.js";
import * as sound from "./sound.js";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "owwillow.wish.v1";
const MUTE_KEY = "owwillow.muted";

const ENTER = bezier(0, 0, 0, 1);
const MOVE = bezier(0.65, 0, 0.35, 1);
const EXIT = bezier(0.55, 0, 0.9, 0.45);

const HEADLINES = {
  ad: ["You only get one wish.", "Buy now."],
  open: ["You only get one wish.", "Buy now."],
  wish: ["Make it count.", ""],
  snap: ["Crack it.", ""],
  crack: ["", ""],
  rest: ["", ""],
};
const PANELS = { ad: "panel-ad", open: "panel-ad", wish: "panel-wish", snap: "panel-snap", crack: null, rest: null };
// After the snap the wish piles up over everything, then fades; in the dark the words come one at a time
// (seconds after the pieces land; the crack itself takes 1.1 s before that)
const WALL = { from: 0.15, full: 3.0, fade: 3.5, gone: 4.8 }; // seconds after the crack
const AFTER = [
  { at: 3.6, line: "It heard you." },
  { at: 5.8, line: "It will be granted.", red: true, sound: "boom" },
  { at: 8.0, small: "Whatever it takes." },
  { at: 9.0, panel: true },
];
const canvas = $("stage");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const art = {
  box: drawBox(),
  fistL: drawFist(false),
  fistR: drawFist(true),
  sparkle: drawSparkle(P.white),
  sparkleRed: drawSparkle(P.red),
  background: drawBackground(),
  vignette: drawVignette(),
};
// Where the stick lies on the stage while it is held
const HOLD = { x: (W - STICK_L) / 2, y: 76 };
const FLOOR = 118;
const BEND = 12; // how far the middle of the stick bows up at full strain
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const game = {
  scene: "ad",
  since: 0,
  seed: hash(String(Date.now())),
  stick: null,
  tension: 0,
  holding: false, // both hands on it
  hands: { left: new Set(), right: new Set() }, // what holds each end: pointer ids, or keys
  firstGrip: null,
  tries: 0,
  bendTime: 2,
  threshold: 1,
  lastCreak: 0,
  halves: null,
  particles: [],
  saved: null,
  crackTension: 0,
};
game.stick = drawStick(game.seed);

// ---------- the scenes ----------

function go(scene) {
  game.scene = scene;
  game.since = now();
  game.told = 0;
  const [line, small] = HEADLINES[scene];
  headline(line, small);
  for (const id of ["panel-ad", "panel-wish", "panel-snap", "panel-granted"]) $(id).hidden = id !== PANELS[scene];
  $("tv").classList.toggle("holdable", scene === "snap");
  $("tv").classList.toggle("openable", scene === "ad");
  document.body.classList.toggle("dark", scene === "crack" || scene === "rest");
}

function headline(line, small = "", { red = false } = {}) {
  const el = $("headline");
  $("headline-line").textContent = line;
  $("headline-small").textContent = small;
  $("headline-small").hidden = !small;
  el.classList.toggle("red", red);
  // Each new line comes up slowly out of the dark
  el.classList.remove("rise");
  void el.offsetWidth;
  if (line || small) el.classList.add("rise");
}

// The words after the snap, in order; a page opened later shows where they ended
function tell(age, all = false) {
  while (game.told < AFTER.length && (all || age >= AFTER[game.told].at)) {
    const step = AFTER[game.told++];
    if (step.line) headline(step.line, "", { red: step.red });
    if (step.small) headline($("headline-line").textContent, step.small, { red: true });
    if (step.sound === "boom" && !all) sound.boom();
    if (step.panel) showGranted();
  }
}

function frame() {
  const t = now();
  const dt = Math.min(0.05, t - (game.last ?? t));
  game.last = t;
  update(t, dt);
  draw(t);
  requestAnimationFrame(frame);
}

function update(t, dt) {
  const age = t - game.since;
  if (game.scene === "open" && age > 1.5) go("wish");
  if (game.scene === "snap") {
    if (game.holding) {
      game.tension += dt / game.bendTime;
      // The harder it bends, the faster the creaks come, and the heart beats faster
      if (t - game.lastCreak > 0.2 - game.tension * 0.12) {
        sound.creak(game.tension);
        game.lastCreak = t;
      }
      if (t - (game.lastBeat ?? 0) > 0.8 - game.tension * 0.45) {
        sound.heartbeat(game.tension);
        game.lastBeat = t;
      }
      if (game.tension >= game.threshold) crack(t);
    } else {
      game.tension = Math.max(0, game.tension - dt * 2.4);
    }
    $("tension-fill").style.width = `${Math.round(Math.min(1, game.tension / game.threshold) * 100)}%`;
  }
  // Measured again: the snap above may have started the crack in this very frame
  if (game.scene === "crack" && t - game.since > 1.1) {
    go("rest");
    sound.drone();
  }
  if (game.scene === "rest") tell(t - game.since);
  wall(t);
  for (const p of game.particles) {
    if (p.resting) continue;
    p.vy += 300 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y >= p.floor) {
      p.y = p.floor;
      p.resting = true;
    }
  }
}

function draw(t) {
  const age = t - game.since;
  ctx.save();
  // A hard snap shakes the picture for a moment
  if (game.scene === "crack" && age < 0.3 && !reducedMotion) {
    const k = (1 - age / 0.3) * 3;
    ctx.translate(Math.round((Math.random() - 0.5) * 2 * k), Math.round((Math.random() - 0.5) * 2 * k));
  } else if (game.scene === "snap" && game.tension > 0.55 && !reducedMotion) {
    ctx.translate(Math.round((Math.random() - 0.5) * game.tension * 2), 0);
  }
  ctx.drawImage(art.background, 0, 0);
  if (game.scene === "ad") drawAd(t);
  if (game.scene === "open") drawOpening(age, t);
  if (game.scene === "wish") drawWishing(t);
  if (game.scene === "snap") drawSnapping(t);
  if (game.scene === "crack") drawCracking(age, t);
  if (game.scene === "rest") drawResting(ctx, t);
  ctx.restore();
  // The room darkens: as the stick strains, and for good once it has broken
  if (game.scene === "snap") dim(ctx, game.tension * 0.35);
  if (game.scene === "crack") dim(ctx, clamp((age - 0.4) / 0.7) * 0.75);
  if (game.scene === "rest") {
    dim(ctx, 0.75);
  }
  drawFilm(t);
}

// The product shot: the carton, and the stick lying in front of it
function drawAd(t) {
  const bob = Math.round(Math.sin(t * 1.6));
  shadow(ctx, 88, 108, 70, 3);
  shadow(ctx, 88, 136, 66, 3);
  ctx.drawImage(art.box, 12, 48 + bob);
  ctx.drawImage(game.stick, HOLD.x, 118);
  twinkle(t, [[4, 50], [166, 40], [168, 112], [4, 120]]);
}

// The stick comes out and floats up to the middle; the box slides away
function drawOpening(age, t) {
  const boxOut = EXIT(clamp((age - 0.35) / 0.7));
  const wiggle = age < 0.35 ? Math.round(Math.sin(age * 60) * 2) : 0;
  shadow(ctx, 88 - boxOut * 170, 108, 70, 3);
  ctx.drawImage(art.box, Math.round(12 - boxOut * 170) + wiggle, 48);
  const p = MOVE(clamp((age - 0.25) / 0.9));
  ctx.drawImage(game.stick, HOLD.x, Math.round(lerp(118, HOLD.y, p)));
  if (age > 1.0) burst(t, W / 2, HOLD.y + STICK_T / 2, (age - 1.0) / 0.5, 7);
}

function drawWishing(t) {
  const bob = Math.round(Math.sin(t * 2) * 1.2);
  shadow(ctx, W / 2, FLOOR + 6, 60, 4);
  ctx.drawImage(game.stick, HOLD.x, HOLD.y + bob);
  twinkle(t, [[HOLD.x + 4, HOLD.y - 12], [HOLD.x + STICK_L - 8, HOLD.y - 8], [W / 2, HOLD.y - 18], [HOLD.x + 30, HOLD.y + 24]]);
}

function drawSnapping(t) {
  shadow(ctx, W / 2, FLOOR + 6, 60, 4);
  bentStick(ctx, game.stick, HOLD.x, HOLD.y, game.tension);
  fists(ctx, game.tension, 0);
  // "HOLD" and a bobbing arrow over each fist that is not held yet: this is where to press
  for (const [side, at] of [["left", 26], ["right", STICK_L - 26]]) {
    if (game.hands[side].size) continue;
    const x = Math.round(HOLD.x + at);
    const bob = Math.floor(t * 3) % 2;
    const blink = Math.floor(t * 2.5) % 2 === 0;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) letters(ctx, "HOLD", x - 15 + dx, HOLD.y - 38 + dy, P.cream, 2);
    letters(ctx, "HOLD", x - 15, HOLD.y - 38, blink ? P.red : P.red2, 2);
    arrow(ctx, x, HOLD.y - 24 + bob);
  }
}

// A small arrow pointing down, red with a pale edge
function arrow(g, x, y) {
  const rows = ["#######", ".#####.", "..###..", "...#..."];
  g.fillStyle = P.cream;
  rows.forEach((row, ry) => [...row].forEach((c, rx) => c === "#" && g.fillRect(x - 4 + rx, y + ry - 1, 3, 3)));
  g.fillStyle = P.red;
  rows.forEach((row, ry) => [...row].forEach((c, rx) => c === "#" && g.fillRect(x - 3 + rx, y + ry, 1, 1)));
}

// The stick bows upward in the middle as the fists push it
function bentStick(g, stick, x0, y0, tension) {
  for (let x = 0; x < STICK_L; x++) {
    const dy = -Math.round(tension * BEND * Math.sin((Math.PI * x) / (STICK_L - 1)));
    g.drawImage(stick, x, 0, 1, STICK_T, x0 + x, y0 + dy, 1, STICK_T);
  }
}

// Two fists in striped sleeves, gripping near each end (a gripping fist sits a pixel lower, pressing down);
// after the snap they pull apart and drop away
function fists(g, tension, away) {
  for (const [side, at] of [[-1, 26], [1, STICK_L - 26]]) {
    const dy = -Math.round(tension * BEND * Math.sin((Math.PI * at) / (STICK_L - 1)));
    const press = game.scene === "snap" && game.hands[side < 0 ? "left" : "right"].size ? 1 : 0;
    const x = Math.round(HOLD.x + at - FIST / 2 - side * tension * 4 + side * away * 40);
    const y = Math.round(HOLD.y + STICK_T / 2 + dy - 10 + away * 60) + press;
    // The sleeve: red and cream stripes down to the bottom edge
    for (let sy = y + 17; sy < H + 4; sy++) {
      const band = Math.floor((sy - y - 17) / 4) % 2;
      g.fillStyle = P.ink;
      g.fillRect(x + 1, sy, FIST - 2, 1);
      g.fillStyle = band ? P.sleeve2 : P.sleeve;
      g.fillRect(x + 2, sy, FIST - 4, 1);
    }
    g.drawImage(side < 0 ? art.fistL : art.fistR, x, y);
  }
}

function drawCracking(age, t) {
  shadow(ctx, W / 2, FLOOR + 6, 64, 4);
  const pose = restPose(game.saved.pieces);
  const p = ENTER(clamp(age / 0.75));
  const lift = Math.sin(clamp(age / 0.75) * Math.PI) * 12;
  const bend = game.crackTension * 9;
  drawPiece(ctx, "left", lerp(pose.left.x0, pose.left.x, p), lerp(pose.left.y0, pose.left.y, p) - lift, lerp(-bend, pose.left.angle, p));
  drawPiece(ctx, "right", lerp(pose.right.x0, pose.right.x, p), lerp(pose.right.y0, pose.right.y, p) - lift, lerp(bend, pose.right.angle, p));
  fists(ctx, 0, EXIT(clamp(age / 0.6)));
  drawParticles(ctx);
  burst(t, pose.breakX, HOLD.y, age / 0.7, 9);
  // CRACK! in the box's own lettering, big for a moment
  if (age < 0.9) {
    const zoom = age < 0.12 ? 3 : 2;
    const word = "CRACK!";
    const w = word.length * 4 * zoom;
    const x = Math.round(pose.breakX - w / 2), y = HOLD.y - 24 - (zoom - 2) * 4;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) letters(ctx, word, x + dx, y + dy, P.cream, zoom);
    letters(ctx, word, x, y, P.red, zoom);
  }
  if (age < 0.08) flash(0.9);
  else if (age < 0.16) flash(0.4);
}

function drawResting(g, t) {
  const pose = restPose(game.saved.pieces);
  shadow(g, W / 2, FLOOR + 6, 64, 4);
  drawPiece(g, "left", pose.left.x, pose.left.y, pose.left.angle);
  drawPiece(g, "right", pose.right.x, pose.right.y, pose.right.angle);
  drawParticles(g);
}

// Dark, redder toward the edges, with a little light left on the broken stick
function dim(g, amount) {
  if (amount <= 0) return;
  const grad = g.createRadialGradient(W / 2, FLOOR - 6, 10, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0, `rgb(24 4 4 / ${amount * 0.55})`);
  grad.addColorStop(1, `rgb(10 0 0 / ${Math.min(0.97, amount * 1.25)})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
}


// ---------- the wall: the wish, stuck on again and again until it covers everything ----------

// Every copy of the wish, decided at the snap: where it lands, how big, how crooked, and when. Few at first, then
// faster and faster, until the window is buried in it
function fillWall(wish) {
  const text = wish.trim() || "?";
  const el = $("wall");
  const ratio = Math.min(2, devicePixelRatio || 1);
  el.width = Math.round(innerWidth * ratio);
  el.height = Math.round(innerHeight * ratio);
  const g = el.getContext("2d");
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  const base = Math.max(22, Math.min(innerWidth, 900) / 14);
  const r = rng(game.seed ^ 0x5717);
  const stamps = [];
  // Enough strips to bury the window, each roughly as long as the wish written at its size
  g.font = `bold ${base}px Galmuri11`;
  const strip = g.measureText(text).width * base * 1.1;
  const count = Math.min(700, Math.ceil(((innerWidth * innerHeight) / strip) * 3));
  for (let i = 0; i < count; i++) {
    const u = i / count;
    stamps.push({
      // ease in: a lone copy, then a handful, then a flood
      at: WALL.from + (WALL.full - WALL.from) * Math.pow(u, 0.45),
      x: r() * (innerWidth + 120) - 60,
      y: r() * (innerHeight + 60) - 30,
      size: base * (0.7 + r() * 1.1) * (u < 0.02 ? 1.8 : 1),
      angle: (r() - 0.5) * (u < 0.3 ? 40 : 16),
      kind: r() < 0.72 ? "strip" : r() < 0.6 ? "ink" : "blood",
    });
  }
  game.wall = { text, stamps, next: 0, g };
  g.clearRect(0, 0, innerWidth, innerHeight);
  el.classList.remove("fade");
  el.hidden = true;
}

// Stick on the copies whose time has come (the canvas keeps the ones already there), then let it all fade
function wall(t) {
  const w = game.wall;
  if (!w || !game.cracked || !game.crackedAt) return;
  const age = t - game.crackedAt;
  const el = $("wall");
  if (age < WALL.from || age > WALL.gone) {
    el.hidden = true;
    return;
  }
  if (el.hidden) {
    el.hidden = false;
    sound.screech();
  }
  if (age > WALL.fade) el.classList.add("fade");
  const g = w.g;
  let added = 0;
  while (w.next < w.stamps.length && w.stamps[w.next].at <= age) {
    const s = w.stamps[w.next++];
    g.save();
    g.translate(s.x, s.y);
    g.rotate((s.angle * Math.PI) / 180);
    g.font = `bold ${Math.round(s.size)}px Galmuri11`;
    g.textBaseline = "middle";
    const width = g.measureText(w.text).width;
    if (s.kind === "strip") {
      g.fillStyle = "#c3161c";
      g.fillRect(-width / 2 - s.size * 0.25, -s.size * 0.62, width + s.size * 0.5, s.size * 1.24);
      g.fillStyle = "#140303";
    } else {
      g.fillStyle = s.kind === "ink" ? "#140303" : "#c3161c";
    }
    g.fillText(w.text, -width / 2, 0);
    g.restore();
    added += 1;
  }
  if (added) sound.slap(Math.min(1, added / 6));
}

// Where the two halves come to rest, from how the stick broke: the same pieces always lie the same way
function restPose(pieces) {
  const lenL = STICK_L * pieces.split, lenR = STICK_L - lenL;
  const gap = 6 + pieces.ragged * 6;
  const a = 4 + Math.abs(pieces.tilt) / 3;
  const breakX = HOLD.x + lenL;
  // The two pieces and the gap between them, centered as a group so neither end leaves the screen
  const from = (W - (lenL + gap + lenR)) / 2;
  return {
    breakX,
    left: { x0: HOLD.x + lenL / 2, y0: HOLD.y + STICK_T / 2, x: from + lenL / 2, y: FLOOR - 2, angle: pieces.tilt >= 0 ? -a : a * 0.5 },
    right: { x0: HOLD.x + lenL + lenR / 2, y0: HOLD.y + STICK_T / 2, x: from + lenL + gap + lenR / 2, y: FLOOR - 1, angle: pieces.tilt >= 0 ? a * 0.6 : -a },
  };
}

function drawPiece(g, side, cx, cy, angle) {
  const half = game.halves[side];
  const split = game.saved.pieces.split;
  // The middle of this half within its canvas, to turn it about its own center
  const mid = half.pad + (side === "left" ? (STICK_L * split) / 2 : STICK_L * split + (STICK_L * (1 - split)) / 2);
  g.save();
  g.translate(Math.round(cx), Math.round(cy));
  g.rotate((angle * Math.PI) / 180);
  g.drawImage(half.canvas, -Math.round(mid), -Math.round(half.canvas.height / 2));
  g.restore();
}

// ---------- small things on the stage ----------

function sprite(g, image, cx, cy, angle) {
  g.save();
  g.translate(Math.round(cx), Math.round(cy));
  g.rotate((angle * Math.PI) / 180);
  g.drawImage(image, -Math.round(image.width / 2), -Math.round(image.height / 2));
  g.restore();
}

function shadow(g, cx, cy, rx, ry) {
  g.fillStyle = "rgb(60 40 30 / 0.16)";
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
}

function twinkle(t, spots) {
  spots.forEach(([x, y], i) => {
    const phase = (t * 1.3 + i * 0.37) % 1;
    if (phase < 0.45) ctx.drawImage(i % 2 ? art.sparkleRed : art.sparkle, Math.round(x), Math.round(y));
  });
}

// Sparkles flying out from a point
function burst(t, x, y, progress, count) {
  if (progress <= 0 || progress >= 1) return;
  const p = ENTER(progress);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.3;
    const r = 6 + p * 30;
    if ((i + Math.floor(t * 12)) % 3 === 0) continue;
    ctx.drawImage(i % 3 ? art.sparkle : art.sparkleRed, Math.round(x + Math.cos(a) * r - 2), Math.round(y + Math.sin(a) * r * 0.7 - 2));
  }
}

function drawParticles(g) {
  for (const p of game.particles) {
    g.fillStyle = p.color;
    g.fillRect(Math.round(p.x), Math.round(p.y), p.size, 1);
  }
}

function letters(g, word, x, y, color, zoom) {
  g.fillStyle = color;
  let cx = x;
  for (const ch of word) {
    const glyph = FONT[ch] ?? [];
    glyph.forEach((row, gy) => [...row].forEach((c, gx) => c === "#" && g.fillRect(cx + gx * zoom, y + gy * zoom, zoom, zoom)));
    cx += 4 * zoom;
  }
}

function flash(alpha) {
  ctx.fillStyle = `rgb(255 250 235 / ${alpha})`;
  ctx.fillRect(-4, -4, W + 8, H + 8);
}

// Film: a dark edge and a little grain, like the commercial's old tape
function drawFilm() {
  ctx.drawImage(art.vignette, 0, 0);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgb(255 255 255 / 0.08)" : "rgb(40 20 10 / 0.08)";
    ctx.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, 1);
  }
  canvas.style.filter = `brightness(${(0.985 + Math.random() * 0.03).toFixed(3)})`;
}

// A warm backdrop, lighter in the middle, in a few dithered steps so it stays pixel-made
function drawBackground() {
  const c = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = c.getContext("2d");
  const steps = ["#e6ddd3", "#dcd1c6", "#d0c3b7", "#c2b4a8", "#b3a499"];
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W * 0.62), dy = (y - H * 0.42) / (H * 0.7);
      const v = Math.min(steps.length - 1.001, Math.sqrt(dx * dx + dy * dy) * (steps.length - 1));
      const base = Math.floor(v);
      const pick = v - base > (bayer[y % 4][x % 4] + 0.5) / 16 ? base + 1 : base;
      g.fillStyle = steps[Math.min(steps.length - 1, pick)];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function drawVignette() {
  const c = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.72);
  grad.addColorStop(0, "rgb(30 15 8 / 0)");
  grad.addColorStop(1, "rgb(30 15 8 / 0.55)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  return c;
}

// ---------- snapping ----------

// It takes both hands: one on each end, held at the same time. A touch on the left half of the screen (or the
// left button, or the left arrow key) is the left hand; the right likewise.
function grip(side, id, e) {
  if (game.scene !== "snap") return;
  e?.preventDefault();
  sound.wake();
  game.hands[side].add(id);
  hands();
}

function release(id) {
  for (const set of Object.values(game.hands)) set.delete(id);
  hands();
}

function letGo() {
  game.hands.left.clear();
  game.hands.right.clear();
  hands();
}

function hands() {
  const left = game.hands.left.size > 0, right = game.hands.right.size > 0;
  const both = left && right;
  if (both && !game.holding) {
    game.tries += 1;
    game.firstGrip ??= now();
  }
  if (game.scene === "snap") {
    if (!both && game.holding && game.tension > 0.1) $("snap-hint").textContent = "Don't let go.";
    else if (left !== right && !game.holding) $("snap-hint").textContent = "Both fists. At the same time.";
  }
  game.holding = both;
}

function crack(t) {
  const wish = $("wish").value.trim();
  const r = rng(game.seed ^ 0xbeef);
  const holdS = t - game.firstGrip;
  const pieces = {
    // Somewhere between the two fists, most often near the middle
    split: round2(Math.max(0.3, Math.min(0.7, 0.5 + (r() + r() + r() - 1.5) * 0.2))),
    splinters: Math.floor(r() * 4) + (game.tries > 1 ? 1 : 0),
    ragged: round2(clamp(r() * 0.8 + (holdS > 4 ? 0.2 : 0), 0, 1)),
    tilt: Math.round((r() - 0.5) * 50),
    hold_s: round2(Math.min(600, holdS)),
    tries: Math.min(50, game.tries),
  };
  letGo();
  game.crackTension = game.tension;
  // The wish is spent the moment the stick breaks
  game.saved = { wish, seed: game.seed, pieces, at: Date.now() };
  save();
  game.halves = breakStick(game.stick, game.seed, pieces);
  game.particles = splinterBits(pieces, game.seed, true);
  fillWall(wish);
  game.cracked = true; // broken just now, on this page (not a revisit)
  game.crackedAt = now();
  sound.crack();
  navigator.vibrate?.(60);
  go("crack");
}

// Bits of wood thrown off by the snap; they land and stay where they fell
function splinterBits(pieces, seed, flying) {
  const r = rng(seed ^ 0xa11ce);
  const x0 = HOLD.x + STICK_L * pieces.split, y0 = HOLD.y + STICK_T / 2;
  return Array.from({ length: 10 + pieces.splinters * 3 }, () => {
    const vx = (r() - 0.5) * 140, vy = -40 - r() * 90;
    const floor = FLOOR + 2 + Math.floor(r() * 8);
    // Where it would come to rest, for a page opened after the snap
    const air = (-vy + Math.sqrt(vy * vy + 2 * 300 * (floor - y0))) / 300;
    const color = r() < 0.5 ? P.fiber : r() < 0.5 ? P.wood : P.wood2;
    const size = r() < 0.3 ? 2 : 1;
    return flying
      ? { x: x0, y: y0, vx, vy, floor, color, size, resting: false }
      : { x: x0 + vx * air, y: floor, vx: 0, vy: 0, floor, color, size, resting: true };
  });
}

// ---------- after ----------

function showGranted() {
  const s = game.saved;
  $("my-wish").textContent = `“${s.wish}”`;
  $("wished-on").replaceChildren(
    `Wished on ${new Date(s.at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`,
    document.createElement("br"),
    "There are no more wishes.",
  );
  $("panel-granted").hidden = false;
}

async function saveCard() {
  const s = game.saved;
  if (!s) return;
  // The broken pieces in the dark, as they lie now, on a small stage of their own
  const scene = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = scene.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(art.background, 0, 0);
  drawResting(g, null);
  dim(g, 0.75);
  g.drawImage(art.vignette, 0, 0);
  const url = `${location.origin}${location.pathname}`;
  const result = await shareCard({ wish: s.wish, scene, at: s.at, url });
  if (result === "saved+link") flashLabel($("save-card"), "Saved. Link copied.");
  else if (result === "saved") flashLabel($("save-card"), "Saved");
}

// ---------- panels, saving, reset ----------

function setupPanels() {
  // The button under the screen, or the box itself on the screen
  const openBox = () => {
    if (game.scene !== "ad") return;
    sound.wake();
    sound.paper();
    go("open");
  };
  $("open-box").addEventListener("click", openBox);
  canvas.addEventListener("click", openBox);
  const wish = $("wish");
  const count = () => {
    $("wish-count").textContent = `${[...wish.value].length}/60`;
    $("make-wish").disabled = !wish.value.trim();
  };
  wish.addEventListener("input", count);
  // A phone keyboard pushes the page up; when it goes away, the page goes back to the top
  wish.addEventListener("blur", () => setTimeout(() => scrollTo({ top: 0, behavior: "smooth" }), 60));
  let tall = visualViewport?.height ?? 0;
  visualViewport?.addEventListener("resize", () => {
    if (visualViewport.height > tall + 80 && game.scene === "wish") scrollTo({ top: 0, behavior: "smooth" });
    tall = visualViewport.height;
  });
  count();
  $("make-wish").addEventListener("click", () => {
    if (!wish.value.trim()) return;
    $("confirm-wish").textContent = `“${wish.value.trim()}”`;
    sound.wake();
    sound.heartbeat(0.3);
    $("confirm").showModal();
    $("confirm-no").focus(); // the safe choice has the focus
  });
  $("confirm-no").addEventListener("click", () => {
    $("confirm").close();
    wish.focus();
  });
  $("confirm-yes").addEventListener("click", () => {
    $("confirm").close();
    wish.readOnly = true;
    sound.wake();
    sound.tick();
    const r = rng(game.seed ^ 0x5eed);
    game.bendTime = 1.5 + r() * 0.9;
    game.threshold = 0.82 + r() * 0.18;
    go("snap");
    // A mouse has one button: on a computer the two fists are also the ← and → keys
    $("snap-hint").textContent = matchMedia("(pointer: coarse)").matches
      ? "Press and hold both fists."
      : "Press and hold both fists. On a keyboard: ← and → together.";
  });
  // Each finger is its own pointer, so two fingers can hold the two fists at once: a press on the left half of
  // the screen is the left fist, on the right half the right one
  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    grip(e.clientX < r.left + r.width / 2 ? "left" : "right", `p${e.pointerId}`, e);
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => release(`p${e.pointerId}`));
  canvas.addEventListener("pointercancel", (e) => release(`p${e.pointerId}`));
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  const KEY_SIDE = { ArrowLeft: "left", KeyA: "left", KeyF: "left", ArrowRight: "right", KeyL: "right", KeyJ: "right" };
  addEventListener("keydown", (e) => {
    if (KEY_SIDE[e.code] && game.scene === "snap" && !e.repeat) grip(KEY_SIDE[e.code], e.code, e);
  });
  addEventListener("keyup", (e) => KEY_SIDE[e.code] && release(e.code));
  addEventListener("blur", letGo);
  $("save-card").addEventListener("click", saveCard);
  $("sound").addEventListener("click", () => {
    sound.wake();
    sound.setMuted(!sound.isMuted());
    try {
      localStorage.setItem(MUTE_KEY, sound.isMuted() ? "1" : "0");
    } catch {
      /* the choice just is not remembered */
    }
    renderSound();
  });
}

function renderSound() {
  $("sound").textContent = sound.isMuted() ? "Sound off" : "Sound on";
  $("sound").setAttribute("aria-pressed", String(!sound.isMuted()));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.saved));
  } catch {
    /* storage blocked: the wish holds for this visit only */
  }
}

// The Reset button in the top bar, for anyone who wants to try it again. An older build had a debug panel
// that stayed on once opened; its switch is cleared here so the panel's leftovers do not linger.
function setupReset() {
  try {
    localStorage.removeItem("owwillow.debug");
  } catch {
    /* nothing stored */
  }
  $("reset").addEventListener("click", reset);
}

// Forget the wish on this device and start again from the box
function reset() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nothing saved */
  }
  location.replace(location.pathname + location.search);
}

function flashLabel(button, text) {
  const before = button.textContent;
  button.textContent = text;
  setTimeout(() => (button.textContent = before), 2000);
}

// The stage is drawn at 176x160 and shown at the largest whole-number scale that fits the width, and leaves room
// under it for the panel's first button, so nobody has to scroll to find the way on
const PANEL_ROOM = 300; // the top bar and the panel's heading, a line of text and its button
function fit() {
  const roomW = Math.min(document.documentElement.clientWidth - 12, 720);
  const roomH = (visualViewport?.height ?? innerHeight) - PANEL_ROOM;
  const scale = Math.max(1, Math.min(Math.floor(roomW / W), Math.floor(roomH / H)));
  $("tv").style.setProperty("--scale", scale);
  $("tv").style.width = `${W * scale}px`;
  // The panel under it keeps the same width, at least as wide as reads comfortably on a desktop
  document.querySelector(".page").style.setProperty("--tvw", `${Math.min(W * scale, 560)}px`);
}

function now() {
  return performance.now() / 1000;
}

function dateKo(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function clamp(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, p) {
  return a + (b - a) * p;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// CSS cubic-bezier(x1, y1, x2, y2): solve x for the curve parameter by bisection, return y
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s;
  const Y = (s) => ((ay * s + by) * s + cy) * s;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, s = x;
    for (let i = 0; i < 40; i++) {
      s = (lo + hi) / 2;
      if (X(s) < x) lo = s;
      else hi = s;
    }
    return Y(s);
  };
}

// ---------- start ----------

try {
  sound.setMuted(localStorage.getItem(MUTE_KEY) === "1");
} catch {
  /* sound stays on */
}
renderSound();
setupPanels();
setupReset();
fit();
addEventListener("resize", fit);
game.saved = load();
if (game.saved) {
  // The wish was made on this device already: the pieces lie where they fell
  game.seed = game.saved.seed;
  game.stick = drawStick(game.seed);
  game.halves = breakStick(game.stick, game.seed, game.saved.pieces);
  game.particles = splinterBits(game.saved.pieces, game.seed, false);
  $("wish").value = game.saved.wish;
  go("rest");
  tell(0, true);
} else {
  go("ad");
}
window.willow = game; // for tests and a look from the console
requestAnimationFrame(frame);
