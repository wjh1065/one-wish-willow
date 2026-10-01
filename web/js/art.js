// The pixel art, drawn in code on small canvases so every edge stays on the grid: the triangular box from the
// commercial, the holey willow stick, the two fists that snap it, and a tiny capitals font for the box print.

export const W = 176; // the stage: a tall old television screen
export const H = 160;

export const P = {
  ink: "#2a1d17",
  cream: "#f1e3c6",
  cream2: "#dcc8a2",
  paper: "#fbf1dc",
  red: "#c8342b",
  red2: "#96241e",
  redL: "#e25a4c",
  wood: "#6b4f39",
  wood2: "#46321f",
  woodL: "#8f6e4d",
  fiber: "#d9b98a",
  hole: "#eadfc9",
  holeS: "#b5a285",
  skin: "#eab892",
  skin2: "#c98b66",
  sleeve: "#b8342c",
  sleeve2: "#eedcb9",
  hairM: "#4a2e1c",
  hairW: "#b8452a",
  white: "#fff8ea",
  gold: "#f2c14e",
};

// A small seeded random source, so the same seed always draws the same stick and the same break
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

// A canvas to draw on pixel by pixel
export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  px(x, y, color) {
    if (!color || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  // Every pixel whose center falls inside the polygon
  poly(points, color) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = 0; x < this.w; x++) if (inside(points, x + 0.5, y + 0.5)) this.px(x, y, color);
    }
  }

  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, color);
      }
    }
  }

  text(str, x, y, color, zoom = 1) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const glyph = FONT[ch];
      if (glyph) {
        glyph.forEach((row, gy) => [...row].forEach((c, gx) => {
          if (c === "#") this.rect(cx + gx * zoom, y + gy * zoom, zoom, zoom, color);
        }));
      }
      cx += 4 * zoom;
    }
    return cx - x;
  }

  // A dark line around everything drawn, as pixel art has
  outline(color = P.ink) {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const a = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : img.data[(y * this.w + x) * 4 + 3]);
    const edge = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (a(x, y) === 0 && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) edge.push([x, y]);
      }
    }
    for (const [x, y] of edge) this.px(x, y, color);
    return this;
  }
}

function inside(points, x, y) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// Capitals in a 3x5 grid, for the print on the box
export const FONT = {
  A: [".#.", "#.#", "###", "#.#", "#.#"], B: ["##.", "#.#", "##.", "#.#", "##."], C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."], E: ["###", "#..", "##.", "#..", "###"], F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"], H: ["#.#", "#.#", "###", "#.#", "#.#"], I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", ".#."], K: ["#.#", "#.#", "##.", "#.#", "#.#"], L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "###", "#.#", "#.#"], N: ["##.", "#.#", "#.#", "#.#", "#.#"], O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."], Q: [".#.", "#.#", "#.#", "##.", ".##"], R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."], T: ["###", ".#.", ".#.", ".#.", ".#."], U: ["#.#", "#.#", "#.#", "#.#", "###"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."], W: ["#.#", "#.#", "###", "###", "#.#"], X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."], Z: ["###", "..#", ".#.", "#..", "###"], "!": [".#.", ".#.", ".#.", "...", ".#."],
  ".": ["...", "...", "...", "...", ".#."], "'": [".#.", ".#.", "...", "...", "..."], " ": ["...", "...", "...", "...", "..."],
};

// ---------- the box: a long triangular carton lying on its side, printed like the one in the commercial ----------

const BOX_CREAM = "#f4e4bd";
const BOX_CREAM2 = "#e2cc9b";
const BOX_RED = "#b3302a";

export function drawBox() {
  const b = new Pix(152, 58);
  // The end of the carton: a red triangle inside a cream rim, with the name stacked on it
  b.poly([[0, 57], [17, 1], [36, 57]], BOX_CREAM2);
  b.poly([[4, 55], [17, 8], [32, 55]], BOX_RED);
  b.text("ONE", 12, 34, BOX_CREAM);
  b.text("WISH", 10, 41, BOX_CREAM);
  b.text("WILLOW", 6, 48, BOX_CREAM);
  // The long face
  const face = [[17, 1], [151, 1], [151, 57], [36, 57]];
  b.poly(face, BOX_CREAM);
  const onFace = (x, y) => y >= 1 && y <= 57 && x <= 151 && x >= 17 + ((36 - 17) * (y - 1)) / 56;
  const red = (test) => {
    for (let y = 1; y < 58; y++) for (let x = 17; x < 152; x++) if (onFace(x + 0.5, y + 0.5) && test(x, y)) b.px(x, y, BOX_RED);
  };
  // Red sweeps: a curve down from the top left, a panel across the top right, an arc along the bottom
  red((x, y) => x < 66 && y < 2 + 22 * (1 - smooth((x - 18) / 48)));
  red((x, y) => x > 96 && y < 2 + 24 * smooth((x - 96) / 24));
  red((x, y) => x > 66 && x < 128 && y > 57 - 9 * Math.sin((Math.PI * (x - 66)) / 62));
  // The top right panel, in cream
  b.text("AMAZE YOUR", 112, 6, BOX_CREAM);
  b.text("FRIENDS!", 118, 13, BOX_CREAM);
  starAt(b, 108, 9, BOX_CREAM);
  starAt(b, 148, 20, BOX_CREAM);
  // The name in taller letters, in an arch
  let x = 34;
  const name = "ONE WISH WILLOW";
  [...name].forEach((ch) => {
    const glyph = TITLE[ch];
    const t = (x - 34) / 70;
    const y = 18 - Math.round(Math.sin(Math.min(1, t) * Math.PI) * 6);
    glyph?.forEach((row, gy) => [...row].forEach((c, gx) => c === "#" && b.px(x + gx, y + gy, BOX_RED)));
    x += glyph ? glyph[0].length + 1 : 3;
  });
  // "CRACK" and the little snapped stick under it
  b.text("CRACK", 36, 29, BOX_RED);
  for (const [dx, dy] of [[-4, -3], [4, -3], [-5, 1], [5, 1], [0, -5]]) {
    b.px(47 + dx, 38 + dy, BOX_RED);
    b.px(47 + Math.sign(dx) + dx / 2, 38 + dy / 2, BOX_RED);
  }
  b.rect(45, 39, 1, 13, BOX_RED);
  b.rect(49, 39, 1, 13, BOX_RED);
  b.rect(45, 51, 5, 1, BOX_RED);
  b.px(46, 39, BOX_RED);
  b.px(48, 38, BOX_RED);
  b.px(47, 44, BOX_RED);
  // The happy couple, drawn in red line work
  couple(b, 60, 26);
  // A trail of stars and hearts from the crack up to the panel
  for (const [x, y, kind] of [[40, 48], [54, 44, 1], [58, 52], [66, 46, 1], [74, 50], [96, 30, 1], [100, 36], [104, 26],
    [108, 34, 1], [112, 24], [98, 44], [90, 22, 1], [56, 36], [36, 40, 1], [118, 30], [106, 42, 1]]) {
    if (kind) heartAt(b, x, y, BOX_RED);
    else starAt(b, x, y, BOX_RED);
  }
  // You only get ONE WISH
  b.text("YOU ONLY", 118, 29, BOX_RED);
  b.text("GET", 130, 35, BOX_RED);
  b.text("ONE WISH", 118, 42, BOX_RED);
  b.outline();
  return b.canvas;
}

// Taller letters for the name on the box
const TITLE = {
  O: [".##.", "#..#", "#..#", "#..#", "#..#", ".##."],
  N: ["#..#", "##.#", "#.##", "#..#", "#..#", "#..#"],
  E: ["####", "#...", "###.", "#...", "#...", "####"],
  W: ["#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  I: ["###", ".#.", ".#.", ".#.", ".#.", "###"],
  S: [".###", "#...", ".##.", "...#", "...#", "###."],
  H: ["#..#", "#..#", "####", "#..#", "#..#", "#..#"],
  L: ["#...", "#...", "#...", "#...", "#...", "####"],
};

function smooth(u) {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
}

function starAt(b, x, y, color) {
  b.px(x, y, color);
  b.px(x - 1, y, color);
  b.px(x + 1, y, color);
  b.px(x, y - 1, color);
  b.px(x, y + 1, color);
}

function heartAt(b, x, y, color) {
  for (const [dx, dy] of [[-1, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) b.px(x + dx, y + dy, color);
}

// Two smiling faces side by side, a man with a quiff and a woman with curls, in red lines on the cream
function couple(b, x, y) {
  const ring = (cx, cy, r) => {
    for (let a = 0; a < 64; a++) b.px(Math.round(cx + Math.cos((a / 64) * Math.PI * 2) * r), Math.round(cy + Math.sin((a / 64) * Math.PI * 2) * r * 1.1), BOX_RED);
  };
  // Him
  ring(x + 6, y + 8, 5.5);
  b.rect(x + 1, y + 1, 10, 3, BOX_RED);
  b.rect(x + 3, y, 7, 1, BOX_RED);
  b.px(x + 10, y + 4, BOX_RED);
  b.px(x + 4, y + 8, BOX_RED);
  b.px(x + 8, y + 8, BOX_RED);
  b.rect(x + 4, y + 11, 5, 1, BOX_RED);
  b.px(x + 3, y + 10, BOX_RED);
  b.px(x + 9, y + 10, BOX_RED);
  // Her: curls all around, a bow of lips
  const hx = x + 15;
  b.ellipse(hx + 6, y + 7, 7, 7.5, BOX_RED);
  b.ellipse(hx + 6, y + 9, 4.2, 4.6, BOX_CREAM);
  b.rect(hx + 3, y + 4, 6, 1, BOX_RED);
  b.px(hx + 4, y + 8, BOX_RED);
  b.px(hx + 8, y + 8, BOX_RED);
  b.rect(hx + 5, y + 11, 3, 1, BOX_RED);
}

// ---------- the willow: a hollow lattice of dark wood with pale patches, forked at both ends ----------

export const STICK_L = 140;
export const STICK_T = 16;
const WOOD = "#4b2a1b";
const WOOD_L = "#6e412a";
const WOOD_D = "#2f1a10";
const PATCH = "#c9a066";
const PATCH_L = "#e3c089";

export function drawStick(seed) {
  const s = new Pix(STICK_L, STICK_T);
  const r = rng(seed);
  // The body, a little rounded top and bottom, stopping short of the ends where only the prongs go on
  for (let y = 1; y < STICK_T - 1; y++) {
    const color = y <= 3 ? WOOD_L : y >= STICK_T - 4 ? WOOD_D : WOOD;
    s.rect(4, y, STICK_L - 8, 1, color);
  }
  // Prongs: the lattice's ribs run out past the body at both ends, unevenly
  for (const y of [2, 7, 12]) {
    const left = Math.floor(r() * 3), right = Math.floor(r() * 3);
    s.rect(left, y, 5, 2, y === 2 ? WOOD_L : WOOD);
    s.rect(STICK_L - 5 - right, y, 5, 2, y === 2 ? WOOD_L : WOOD);
  }
  // The long openings you can see through, in two staggered rows
  for (const [row, offset] of [[4, 0], [9, 7]]) {
    let x = 9 + offset + Math.floor(r() * 4);
    while (x < STICK_L - 16) {
      const len = 8 + Math.floor(r() * 10);
      const end = Math.min(x + len, STICK_L - 10);
      s.ctx.clearRect(x, row, end - x, 3);
      s.ctx.clearRect(x + 1, row - 1 + (r() < 0.5 ? 0 : 4), end - x - 2, 1);
      x = end + 3 + Math.floor(r() * 4);
    }
  }
  // Pale patches on the ribs, where the bark wore away
  const img = () => s.ctx.getImageData(0, 0, STICK_L, STICK_T).data;
  let data = img();
  for (let i = 0; i < 26; i++) {
    const x = 6 + Math.floor(r() * (STICK_L - 12)), y = 1 + Math.floor(r() * (STICK_T - 2));
    const w = 2 + Math.floor(r() * 4);
    for (let dx = 0; dx < w; dx++) {
      if (data[(y * STICK_L + x + dx) * 4 + 3]) s.px(x + dx, y, dx === 0 ? PATCH : PATCH_L);
    }
    if (r() < 0.5 && data[((y + 1) * STICK_L + x) * 4 + 3]) s.px(x + 1, y + 1, PATCH);
    data = img();
  }
  s.outline("#1b0e08");
  return s.canvas;
}

// Where the break runs, row by row: straight when clean, zigzag when torn
export function breakLine(seed, split, ragged) {
  const r = rng(seed ^ 0x9e3779b9);
  const at = Math.round(STICK_L * split);
  return Array.from({ length: STICK_T + 2 }, () => at + Math.round((r() - 0.5) * 2 * (1 + ragged * 3)));
}

// The two halves, with pale fresh fibers along the break and a few splinters sticking out
export function breakStick(stick, seed, pieces) {
  const line = breakLine(seed, pieces.split, pieces.ragged);
  const src = stick.getContext("2d").getImageData(0, 0, STICK_L, STICK_T + 0);
  const r = rng(seed ^ 0x51ed27);
  const half = (keepLeft) => {
    const pad = 4; // room for splinters past the break
    const p = new Pix(STICK_L + pad * 2, STICK_T + 2);
    for (let y = 0; y < STICK_T; y++) {
      for (let x = 0; x < STICK_L; x++) {
        const i = (y * STICK_L + x) * 4;
        if (!src.data[i + 3]) continue;
        const left = x < line[y + 1];
        if (left !== keepLeft) continue;
        const fresh = keepLeft ? x >= line[y + 1] - 1 : x <= line[y + 1];
        const c = fresh && y > 0 && y < STICK_T - 1 ? "#a77552" : `rgb(${src.data[i]},${src.data[i + 1]},${src.data[i + 2]})`;
        p.px(x + pad, y + 1, c);
      }
    }
    // Splinters: thin fibers poking out of the break
    for (let k = 0; k < pieces.splinters; k++) {
      if ((k % 2 === 0) !== keepLeft) continue;
      const y = 2 + Math.floor(r() * (STICK_T - 3));
      const x0 = line[y] + pad;
      const len = 2 + Math.floor(r() * 3);
      for (let j = 0; j < len; j++) p.px(keepLeft ? x0 + j : x0 - 1 - j, y + (j > 1 ? (r() < 0.5 ? 1 : 0) : 0), "#a77552");
    }
    p.outline("#1b0e08");
    return { canvas: p.canvas, pad };
  };
  return { left: half(true), right: half(false), line };
}

// ---------- the hands from the commercial: fists in a red-and-cream striped sweater ----------

export const FIST = 22;

export function drawFist(flip = false) {
  const f = new Pix(FIST, 20);
  f.ellipse(11, 11, 9, 8, P.skin);
  // Knuckles along the top, with the gaps between the fingers
  for (const x of [5, 9, 13, 17]) f.ellipse(x, 5, 2.4, 2.2, P.skin);
  for (const x of [7, 11, 15]) f.rect(x, 4, 1, 6, P.skin2);
  // The thumb folded across the front
  f.rect(4, 12, 13, 3, P.skin);
  f.rect(4, 15, 13, 1, P.skin2);
  f.rect(16, 12, 2, 3, P.skin2);
  f.outline();
  if (!flip) return f.canvas;
  const m = new Pix(FIST, 20);
  m.ctx.translate(FIST, 0);
  m.ctx.scale(-1, 1);
  m.ctx.drawImage(f.canvas, 0, 0);
  return m.canvas;
}

// A four-point sparkle, the stars around the box
export function drawSparkle(color = P.white) {
  const s = new Pix(5, 5);
  s.rect(2, 0, 1, 5, color);
  s.rect(0, 2, 5, 1, color);
  return s.canvas;
}
