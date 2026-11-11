// The picture for Claude Fable 5.2's hero: a street at night, drawn on one canvas.
// Everything is a function of two numbers: T, the place in the story (set by the scroll),
// and t, seconds since the hero started (the small movements: a person, a cat, a shadow).

import type { RecordEvent } from "../types";

export const END = 10.6; // the length of the story, in T

export type Layout = { W: number; H: number; mode: "wide" | "tall" | "plate" };
type Cam = { cx: number; cy: number; s: number };
type Ctx = CanvasRenderingContext2D;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---- the street -------------------------------------------------------------------------------

type Kind = "dark" | "plain" | "curtain" | "person" | "cat" | "table" | "tv" | "blind";
type Win = { x: number; y: number; w: number; h: number; kind: Kind; on?: number };
type House = {
  x: number;
  w: number;
  wall: number;
  roof: "gable" | "flat" | "salt" | "hip";
  rh: number;
  chimney?: number;
  door: number;
  porch?: boolean;
  wins: Win[];
};

// World units are roughly metres; x runs along the street, y is up from the pavement.
const HOUSES: House[] = [
  { x: 2, w: 11, wall: 6, roof: "gable", rh: 3.8, chimney: 8.2, door: 7.4, wins: [{ x: 1.5, y: 1.8, w: 2.8, h: 2.5, kind: "curtain", on: 0.9 }, { x: 4.7, y: 6.6, w: 1.6, h: 1.6, kind: "dark" }] },
  { x: 16.5, w: 8.5, wall: 9.4, roof: "flat", rh: 0.5, door: 1.4, wins: [{ x: 4.6, y: 1.7, w: 2.4, h: 2.6, kind: "tv", on: 2.6 }, { x: 1.3, y: 6, w: 2.2, h: 2.4, kind: "plain", on: 1.9 }, { x: 4.9, y: 6, w: 2.2, h: 2.4, kind: "dark" }] },
  { x: 28.5, w: 13, wall: 6.2, roof: "gable", rh: 4.4, chimney: 3, door: 9.6, porch: true, wins: [{ x: 2, y: 1.7, w: 3.4, h: 2.8, kind: "person", on: 3.2 }, { x: 5.6, y: 7, w: 1.8, h: 1.8, kind: "plain", on: 4 }] },
  { x: 47, w: 10, wall: 8, roof: "salt", rh: 2.6, door: 6.8, wins: [{ x: 1.6, y: 1.7, w: 2.6, h: 2.5, kind: "dark" }, { x: 1.6, y: 5.3, w: 2.6, h: 2.2, kind: "blind", on: 3.6 }, { x: 6, y: 5.3, w: 2.2, h: 2.2, kind: "dark" }] },
  { x: 60.5, w: 13.5, wall: 6.2, roof: "gable", rh: 4, chimney: 10.4, door: 10.6, porch: true, wins: [{ x: 1.8, y: 1.6, w: 4.6, h: 2.9, kind: "table", on: 0 }, { x: 7.2, y: 1.9, w: 2, h: 2.4, kind: "cat", on: 0 }, { x: 5.9, y: 6.9, w: 1.7, h: 1.7, kind: "dark" }] },
  { x: 78, w: 9, wall: 9, roof: "hip", rh: 2.2, door: 1.3, wins: [{ x: 4.9, y: 1.7, w: 2.5, h: 2.6, kind: "curtain", on: 0 }, { x: 1.3, y: 5.9, w: 2.2, h: 2.3, kind: "dark" }, { x: 4.9, y: 5.9, w: 2.2, h: 2.3, kind: "plain", on: 0 }] },
  { x: 90.5, w: 11.5, wall: 6, roof: "gable", rh: 3.6, chimney: 2.6, door: 2, wins: [{ x: 5.2, y: 1.7, w: 3.2, h: 2.6, kind: "person", on: 0 }, { x: 4.95, y: 6.4, w: 1.6, h: 1.6, kind: "dark" }] },
];
const LAMPS = [14.2, 57.6, 87.6, 118.5];
const TREES: [number, number, number][] = [[-5, 11, 3], [43.6, 12.5, 11], [74.4, 10, 5], [106.5, 13, 8], [124.5, 9.5, 21]];

// A bare November tree: branch segments, grouped by how thin they are.
function tree(x: number, h: number, seed: number) {
  const r = rng(seed);
  const levels: number[][][] = [[], [], [], [], [], []];
  const grow = (px: number, py: number, ang: number, len: number, depth: number) => {
    const qx = px + Math.cos(ang) * len;
    const qy = py + Math.sin(ang) * len;
    levels[5 - depth].push([px, py, qx, qy]);
    if (depth === 0) return;
    const n = depth > 3 ? 2 : r() < 0.55 ? 2 : 3;
    for (let k = 0; k < n; k++) grow(qx, qy, ang + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.22), depth - 1);
  };
  grow(x, 0, Math.PI / 2 + (r() - 0.5) * 0.14, h * 0.34, 5);
  return { x, h, levels };
}

// ---- the tower --------------------------------------------------------------------------------

const COLS = 7;
const PX = 4.6; // window pitch across
const PY = 4.2; // window pitch up
const WW = 2.7;
const WH = 2.3;
const TX = 131;
const TW = 2 * 2 + (COLS - 1) * PX + WW;
const BASE = 3.8;

// ---- colours ----------------------------------------------------------------------------------

const BONE = "#efe9da";
const TINTS = [BONE, "#f3e6c8", BONE, "#e6e8ea", "#f1ead6"]; // no two rooms have quite the same lamp

export function makeScene(input: RecordEvent[], since: string, now: string) {
  const events = [...input].sort((a, b) => a.date.localeCompare(b.date));
  const N = events.length;

  // Which windows of the tower are lit: the record fills it from the ground up, unevenly.
  const pick = rng(52);
  const cells: { c: number; r: number; p: number }[] = [];
  const candidateRows = Math.ceil(N / COLS) + 7;
  for (let r = 0; r < candidateRows; r++) for (let c = 0; c < COLS; c++) cells.push({ c, r, p: r + pick() * 5.5 });
  cells.sort((a, b) => a.p - b.p);
  // The newest light gets a window on the tower's edge, high up, with the night beside it.
  if (N > 1) {
    let edge = -1;
    for (let i = 0; i < N; i++) if (cells[i].c === 0 && (edge < 0 || cells[i].r > cells[edge].r)) edge = i;
    if (edge >= 0) [cells[edge], cells[N - 1]] = [cells[N - 1], cells[edge]];
  }
  const day = (d: string) => Date.parse(`${d.slice(0, 10)}T12:00:00Z`) / 864e5;
  const first = N ? day(events[0].date) : 0;
  const span = N ? Math.max(1, day(events[N - 1].date) - first) : 1;
  const lights = events.map((e, i) => {
    const cell = cells[i];
    // When it comes on in the story: half by its real date, half by its place in the queue.
    const u = 0.5 * ((day(e.date) - first) / span) + 0.5 * (N > 1 ? i / (N - 1) : 1);
    return { x: TX + 2 + cell.c * PX, y: BASE + cell.r * PY, c: cell.c, r: cell.r, mention: e.mention, at: 4.32 + 0.78 * u, date: e.date, i };
  });
  const topRow = lights.reduce((m, l) => Math.max(m, l.r), 0);
  const ROWS = Math.max(26, topRow + 10);
  const TH = BASE + ROWS * PY + 1.5;
  const litTop = BASE + (topRow + 1) * PY;
  const target = lights[N - 1] ?? { x: TX + 2 + 3 * PX, y: BASE + 8 * PY, c: 3, r: 8, mention: false, at: 5, date: now, i: 0 };
  const lit = new Set(lights.map((l) => l.c + l.r * COLS));

  const trees = TREES.map(([x, h, seed]) => tree(x, h, seed));
  const stars = Array.from({ length: 170 }, (_, i) => ({ u: hash(i * 3.1), v: Math.pow(hash(i * 7.7 + 2), 1.5), r: 0.5 + hash(i * 1.3 + 9) * 0.9, ph: hash(i * 5.9) * 6.28, sp: 0.4 + hash(i * 2.2) * 1.3 }));

  // Soft light, drawn once and stamped many times.
  const sprite = (r: number, g: number, b: number) => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
    gr.addColorStop(0.18, `rgba(${r},${g},${b},0.42)`);
    gr.addColorStop(0.5, `rgba(${r},${g},${b},0.1)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    return c;
  };
  const GLOW = { warm: sprite(255, 176, 96), bone: sprite(232, 226, 214), blue: sprite(150, 185, 255), lamp: sprite(255, 226, 180) };
  type Glow = { x: number; y: number; rx: number; ry: number; a: number; k: keyof typeof GLOW };

  // ---- camera ---------------------------------------------------------------------------------

  const look = (L: Layout, wx: number, wy: number, ax: number, ay: number, s: number): Cam => ({ s, cx: wx - ((ax - 0.5) * L.W) / s, cy: wy + ((ay - 0.5) * L.H) / s });
  const mix = (a: Cam, b: Cam, t: number): Cam => {
    const s = a.s * Math.pow(b.s / a.s, t);
    const ratio = b.s / a.s;
    // Zooming in, the place we are going to holds still on screen; zooming out, the place we leave does.
    const k = Math.abs(ratio - 1) < 1e-3 ? t : ratio > 1 ? 1 - ((1 - t) * a.s) / s : (t * b.s) / s;
    return { s, cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k) };
  };
  const anchors = (L: Layout) => {
    const wide = L.mode === "wide";
    const tall = L.mode === "tall";
    return {
      ax: wide ? 0.7 : 0.5, // where the subject sits, left to right
      gy: wide ? 0.9 : tall ? 0.88 : 0.92, // where the pavement sits
      winY: wide ? 0.52 : tall ? 0.67 : 0.5,
      street: wide ? Math.min(L.W / 60, (L.H * 0.5) / 17) : tall ? (L.H * 0.45) / 17 : Math.min(L.W / 38, (L.H * 0.62) / 17),
    };
  };
  type Key = { T: number; cam: Cam; ease?: "linear" | "in" };
  let keyCache: { id: string; keys: Key[] } | null = null;
  const keys = (L: Layout): Key[] => {
    const id = `${L.W}x${L.H}${L.mode}`;
    if (keyCache?.id === id) return keyCache.keys;
    const { ax, gy, winY, street } = anchors(L);
    const wide = L.mode === "wide";
    const tall = L.mode === "tall";
    const tcx = TX + TW / 2;
    const a0 = look(L, tall ? 7.4 : wide ? 27 : 17, 0, 0.5, gy, street);
    const b0 = look(L, tall ? 33.4 : 32.6, 0, tall ? 0.5 : ax - 0.02, gy, street * (tall ? 1.18 : 1.45));
    const c0 = look(L, tall ? 64.6 : 66, 0, tall ? 0.5 : ax - 0.04, gy, street * (tall ? 1.12 : 1.3));
    const c1 = look(L, tall ? 84 : 88, 0, tall ? 0.5 : ax - 0.08, gy, street * (tall ? 1 : 1.1));
    const e0 = look(L, tcx, 0, ax, gy, ((wide ? 0.4 : tall ? 0.78 : 0.34) * L.W) / TW);
    const fs = Math.min(((gy - (wide ? 0.1 : tall ? 0.42 : 0.06)) * L.H) / (litTop + 3), ((wide ? 0.36 : tall ? 0.6 : 0.3) * L.W) / TW);
    const f0 = look(L, tcx, 0, ax, gy, fs);
    const gs = wide ? (0.33 * L.H) / WH : tall ? (0.56 * L.W) / WW : (0.5 * L.H) / WH;
    const gx = wide ? ax + 0.03 : ax;
    const tx = target.x + WW / 2;
    const ty = target.y + WH / 2;
    const g0 = look(L, tx, ty, gx, winY, gs);
    const all: Key[] = [
      { T: 0, cam: a0 },
      { T: 0.5, cam: { ...a0, cx: a0.cx + 1.2 }, ease: "linear" },
      { T: 1.15, cam: b0 },
      { T: 1.8, cam: { ...b0, cx: b0.cx + 0.8 }, ease: "linear" },
      { T: 2.35, cam: c0 },
      { T: 2.95, cam: c1, ease: "linear" },
      { T: 3.6, cam: e0 },
      { T: 4.05, cam: { ...e0, cy: e0.cy + 2.5 }, ease: "linear" },
      { T: 4.6, cam: f0 },
      { T: 5.35, cam: { ...f0, s: f0.s * 1.04 }, ease: "linear" },
      { T: 5.95, cam: g0 },
      { T: 6.6, cam: look(L, tx, ty, gx, winY, gs * 1.06), ease: "linear" },
      { T: 6.9, cam: look(L, tx, ty, ax, winY, gs * 6.5), ease: "in" },
      { T: 9.6, cam: look(L, tx, ty, ax, winY, gs * 6.5) },
      { T: 9.62, cam: { ...f0, s: f0.s * 0.94 } },
      { T: END, cam: { ...f0, s: f0.s * 0.94 } },
    ];
    keyCache = { id, keys: all };
    return all;
  };
  const camera = (L: Layout, T: number): Cam => {
    const K = keys(L);
    let i = 0;
    while (i < K.length - 2 && T >= K[i + 1].T) i++;
    const a = K[i];
    const b = K[i + 1];
    const u = clamp((T - a.T) / (b.T - a.T));
    const e = b.ease === "linear" ? u : b.ease === "in" ? u * u : u * u * (3 - 2 * u);
    return mix(a.cam, b.cam, e);
  };

  // ---- small parts ----------------------------------------------------------------------------

  // A soft head-and-shoulders shape, or something shaped like one. (x, y) is its foot, h its height.
  const blob = (ctx: Ctx, x: number, y: number, h: number, up: 1 | -1, rgb: string, a: number, lean = 0, width = 1) => {
    const part = (px: number, py: number, rx: number, ry: number, alpha: number) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(${rgb},${alpha})`);
      g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.72})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    };
    part(x, y + up * h * 0.16, h * 0.22 * width, h * 0.5, a);
    part(x + lean * h, y + up * h * 0.72, h * 0.17, h * 0.18, a * 0.95);
  };

  const windowLight = (ctx: Ctx, w: Win, hx: number, a: number, t: number, glows: Glow[]) => {
    const x = hx + w.x;
    const { y, w: ww, h: wh, kind } = w;
    ctx.fillStyle = "#05060a";
    ctx.fillRect(x - 0.12, y - 0.12, ww + 0.24, wh + 0.24);
    ctx.fillStyle = "#090a10";
    ctx.fillRect(x, y, ww, wh);
    if (kind === "dark" || a <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, ww, wh);
    ctx.clip();
    ctx.globalAlpha = a;
    const shade = "rgba(38,18,6,0.9)";
    if (kind === "tv") {
      const f = 0.55 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 2.9) + 0.2 * Math.sin(t * 13.1);
      ctx.fillStyle = "#10141f";
      ctx.fillRect(x, y, ww, wh);
      const tv = ctx.createRadialGradient(x + ww * 0.2, y + wh * 0.25, 0, x + ww * 0.2, y + wh * 0.25, ww * 1.15);
      tv.addColorStop(0, `rgba(165,195,255,${0.5 + 0.35 * f})`);
      tv.addColorStop(1, "rgba(120,150,230,0.08)");
      ctx.fillStyle = tv;
      ctx.fillRect(x, y, ww, wh);
      glows.push({ x: x + ww * 0.4, y: y + wh * 0.4, rx: ww * 1.3, ry: wh * 1.3, a: a * (0.12 + 0.14 * f), k: "blue" });
    } else {
      const g = ctx.createLinearGradient(0, y, 0, y + wh);
      g.addColorStop(0, kind === "blind" ? "#d39446" : "#e79a45");
      g.addColorStop(1, kind === "blind" ? "#e9b66c" : "#ffd28a");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, ww, wh);
      glows.push({ x: x + ww / 2, y: y + wh / 2, rx: ww * 1.9, ry: wh * 1.9, a: a * 0.5, k: "warm" });
      if (y < 3) glows.push({ x: x + ww / 2, y: -0.25, rx: ww * 1.6, ry: 0.5, a: a * 0.28, k: "warm" });
    }
    ctx.fillStyle = shade;
    if (kind === "person") {
      const px = x + ww * (0.5 + 0.2 * Math.sin(t * 0.42));
      const bob = Math.abs(Math.sin(t * 1.9)) * 0.04 * Math.abs(Math.cos(t * 0.42));
      ctx.beginPath();
      ctx.ellipse(px, y - 0.05, 0.95, 1.2, 0, 0, 6.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 0.06 * Math.cos(t * 0.42), y + 1.78 + bob, 0.43, 0, 6.3);
      ctx.fill();
    } else if (kind === "table") {
      const nod = Math.sin(t * 0.9) * 0.05;
      for (const [dx, lean] of [[1.05, nod], [3.55, -nod * 0.6]] as const) {
        ctx.beginPath();
        ctx.ellipse(x + dx, y + 0.1, 0.72, 1.02, 0, 0, 6.3);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + dx + (dx < 2 ? 0.1 : -0.1) + lean, y + 1.62 + Math.abs(lean) * 0.4, 0.36, 0, 6.3);
        ctx.fill();
      }
      ctx.fillRect(x + 1.45, y, 1.7, 0.72);
      ctx.fillRect(x + ww / 2 - 0.03, y + wh - 0.75, 0.06, 0.75);
      ctx.beginPath();
      ctx.moveTo(x + ww / 2 - 0.42, y + wh - 1.02);
      ctx.lineTo(x + ww / 2 + 0.42, y + wh - 1.02);
      ctx.lineTo(x + ww / 2 + 0.2, y + wh - 0.72);
      ctx.lineTo(x + ww / 2 - 0.2, y + wh - 0.72);
      ctx.fill();
    } else if (kind === "cat") {
      const cx = x + ww * 0.52;
      const flick = Math.pow(Math.max(0, Math.sin(t * 0.8)), 6) * Math.sin(t * 9) * 0.16;
      ctx.beginPath();
      ctx.ellipse(cx, y + 0.5, 0.36, 0.6, 0, 0, 6.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 0.03, y + 1.2, 0.26, 0, 6.3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 0.21, y + 1.3);
      ctx.lineTo(cx - 0.17, y + 1.62);
      ctx.lineTo(cx - 0.02, y + 1.42);
      ctx.lineTo(cx + 0.1, y + 1.42);
      ctx.lineTo(cx + 0.24, y + 1.62);
      ctx.lineTo(cx + 0.28, y + 1.3);
      ctx.fill();
      ctx.strokeStyle = shade;
      ctx.lineWidth = 0.13;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + 0.25, y + 0.14);
      ctx.quadraticCurveTo(cx + 0.7, y + 0.05, cx + 0.72 + flick, y + 0.55 + flick);
      ctx.stroke();
    } else if (kind === "curtain") {
      ctx.fillStyle = "rgba(120,58,16,0.6)";
      for (const d of [0, 1]) {
        const ex = d ? x + ww : x;
        const dir = d ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(ex, y + wh);
        ctx.lineTo(ex + dir * ww * 0.34, y + wh);
        ctx.quadraticCurveTo(ex + dir * ww * 0.3, y + wh * 0.45, ex + dir * ww * 0.1, y);
        ctx.lineTo(ex, y);
        ctx.fill();
      }
    } else if (kind === "blind") {
      ctx.fillStyle = "rgba(60,30,8,0.3)";
      for (let k = 1; k < 9; k++) ctx.fillRect(x, y + (wh * k) / 9, ww, 0.05);
    }
    if (kind !== "tv" && kind !== "blind") {
      ctx.fillStyle = "rgba(30,14,4,0.9)";
      ctx.fillRect(x + ww / 2 - 0.045, y, 0.09, wh);
      if (kind !== "table") ctx.fillRect(x, y + wh * 0.62, ww, 0.08);
    }
    ctx.restore();
  };

  const house = (ctx: Ctx, h: House, t: number, px: number, glows: Glow[]) => {
    const { x, w, wall, rh } = h;
    if (h.chimney !== undefined) {
      ctx.fillStyle = "#07080d";
      ctx.fillRect(x + h.chimney, wall, 0.95, rh + 0.5);
    }
    ctx.fillStyle = "#0c0d15";
    ctx.fillRect(x, 0, w, wall);
    ctx.fillStyle = "#10121b";
    ctx.fillRect(x - 0.08, 0, w + 0.16, 0.32);
    const roof: [number, number][] =
      h.roof === "gable" ? [[x - 0.45, wall], [x + w / 2, wall + rh], [x + w + 0.45, wall]]
      : h.roof === "salt" ? [[x - 0.45, wall], [x + w * 0.34, wall + rh], [x + w + 0.45, wall]]
      : h.roof === "hip" ? [[x - 0.4, wall], [x + w * 0.2, wall + rh], [x + w * 0.8, wall + rh], [x + w + 0.4, wall]]
      : [[x - 0.2, wall], [x - 0.2, wall + rh], [x + w + 0.2, wall + rh], [x + w + 0.2, wall]];
    ctx.fillStyle = "#07080d";
    ctx.beginPath();
    roof.forEach(([rx, ry], i) => (i ? ctx.lineTo(rx, ry) : ctx.moveTo(rx, ry)));
    ctx.fill();
    ctx.strokeStyle = "rgba(160,176,225,0.22)";
    ctx.lineWidth = 1.1 * px;
    ctx.beginPath();
    roof.forEach(([rx, ry], i) => (i ? ctx.lineTo(rx, ry) : ctx.moveTo(rx, ry)));
    ctx.stroke();
    ctx.fillStyle = "#06070b";
    ctx.fillRect(x + h.door, 0.3, 1.5, 3);
    ctx.fillStyle = "#12141d";
    ctx.fillRect(x + h.door - 0.3, 0, 2.1, 0.3);
    if (h.porch) {
      ctx.fillStyle = "#ffdca6";
      ctx.fillRect(x + h.door + 1.75, 2.75, 0.14, 0.2);
      glows.push({ x: x + h.door + 1.82, y: 2.8, rx: 1.5, ry: 1.5, a: 0.5 * smooth(0.2, 1.4, t), k: "lamp" });
    }
    for (const w2 of h.wins) windowLight(ctx, w2, x, w2.on === undefined ? 0 : smooth(w2.on, w2.on + 0.5, t), t, glows);
  };

  // The one window we walk up to: a blind, the light behind it, and whatever moves in there.
  const closeUp = (ctx: Ctx, x: number, y: number, t: number, detail: number) => {
    ctx.save();
    ctx.globalAlpha = detail;
    ctx.fillStyle = "#040508";
    ctx.fillRect(x - 0.16, y - 0.16, WW + 0.32, WH + 0.32);
    const g = ctx.createRadialGradient(x + WW / 2, y + WH * 0.55, 0.2, x + WW / 2, y + WH / 2, WW * 0.85);
    g.addColorStop(0, "#fffaf0");
    g.addColorStop(1, "#e2d9c4");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, WW, WH);
    ctx.beginPath();
    ctx.rect(x, y, WW, WH);
    ctx.clip();
    const sway = Math.sin(t * 0.7);
    blob(ctx, x + WW * (0.5 + 0.27 * sway), y - 0.05, WH * 0.98, 1, "58,44,30", 0.46 * detail, 0.03 * Math.cos(t * 0.7), 0.7 + 0.3 * Math.abs(Math.cos(t * 0.7)));
    ctx.fillStyle = "rgba(70,58,40,0.045)";
    for (let k = 1; k < 22; k++) ctx.fillRect(x, y + (WH * k) / 22, WW, 0.012);
    ctx.fillStyle = "#fffdf6";
    ctx.fillRect(x, y, WW, 0.09);
    ctx.fillStyle = "rgba(60,50,36,0.55)";
    ctx.fillRect(x, y + 0.09, WW, 0.045);
    ctx.restore();
  };

  // ---- outside --------------------------------------------------------------------------------

  const exterior = (ctx: Ctx, L: Layout, dpr: number, cam: Cam, T: number, t: number, withLights: boolean) => {
    const { W, H } = L;
    const { cx, cy, s } = cam;
    const gY = H / 2 + cy * s;
    const px = 1 / s;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#03040a");
    sky.addColorStop(0.6, "#070a15");
    sky.addColorStop(1, "#0b0f1f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    if (gY > 0 && gY < H * 3) {
      const haze = ctx.createLinearGradient(0, gY - H * 0.55, 0, gY);
      haze.addColorStop(0, "rgba(52,60,104,0)");
      haze.addColorStop(1, "rgba(52,60,104,0.34)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, gY - H * 0.55, W, H * 0.55);
    }
    const starIn = smooth(0, 2.2, t);
    ctx.fillStyle = "#dfe4f5";
    for (const st of stars) {
      const sx = (((st.u * W * 1.3 - cx * s * 0.012) % (W * 1.3)) + W * 1.3) % (W * 1.3);
      const sy = (((st.v * H * 0.9 + cy * s * 0.012) % H) + H) % H;
      if (sx > W || sy > gY - 20) continue;
      ctx.globalAlpha = starIn * (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * st.sp + st.ph))) * clamp((gY - sy) / (H * 0.35) + 0.25);
      ctx.fillRect(sx, sy, st.r, st.r);
    }
    ctx.globalAlpha = 1;

    // the far side of town
    if (s < 70) {
      const fs = s * 0.5;
      const f = 0.3;
      const far = (wx: number) => {
        const b = Math.floor(wx / 4.3);
        const inBlock = wx / 4.3 - b;
        const f2 = (inBlock - 0.1) / 0.8;
        const box = hash(b) > 0.45 && f2 > 0 && f2 < 1 ? 3 + 2.4 * hash(b + 40) + (hash(b + 11) > 0.35 ? 1.9 * (1 - Math.abs(2 * f2 - 1)) : 0) : 0;
        return Math.max(2.4 + 1.2 * Math.sin(wx * 0.07 + 2) + 0.8 * Math.sin(wx * 0.19), box);
      };
      const wxAt = (sx: number) => cx * f + 60 + (sx - W / 2) / fs;
      ctx.fillStyle = "#0a0d19";
      ctx.beginPath();
      ctx.moveTo(0, gY + 2);
      for (let sx = 0; sx <= W + 4; sx += 3) ctx.lineTo(sx, gY - far(wxAt(sx)) * fs);
      ctx.lineTo(W + 4, gY + 2);
      ctx.fill();
      ctx.fillStyle = "#f2b56c";
      for (let b = Math.floor(wxAt(0) / 4.3); b <= Math.floor(wxAt(W) / 4.3); b++) {
        if (hash(b) <= 0.45 || hash(b + 80) < 0.5) continue;
        const sx = W / 2 + ((b + 0.3 + 0.4 * hash(b + 7)) * 4.3 - cx * f - 60) * fs;
        ctx.globalAlpha = 0.5 * starIn;
        ctx.fillRect(sx, gY - (1.4 + 1.6 * hash(b + 3)) * fs, Math.max(1, fs * 0.24), Math.max(1, fs * 0.24));
      }
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.setTransform(dpr * s, 0, 0, -dpr * s, dpr * (W / 2 - cx * s), dpr * gY);
    const x0 = cx - W / 2 / s - 3;
    const x1 = cx + W / 2 / s + 3;
    const glows: Glow[] = [];

    ctx.lineCap = "round";
    for (const tr of trees) {
      if (tr.x + tr.h < x0 || tr.x - tr.h > x1) continue;
      ctx.strokeStyle = "#07080d";
      tr.levels.forEach((segs, lv) => {
        ctx.lineWidth = Math.max(0.42 * Math.pow(0.6, lv), 0.9 * px);
        ctx.beginPath();
        for (const [ax, ay, bx, by] of segs) {
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
      });
    }
    for (const h of HOUSES) if (h.x + h.w + 2 > x0 && h.x - 2 < x1) house(ctx, h, t, px, glows);

    // the tower
    if (TX + TW > x0 && TX < x1) {
      const body = ctx.createLinearGradient(0, 0, 0, TH);
      body.addColorStop(0, "#0e1019");
      body.addColorStop(0.45, "#0a0b12");
      body.addColorStop(1, "#06070c");
      ctx.fillStyle = body;
      ctx.fillRect(TX, 0, TW, TH);
      ctx.fillStyle = "rgba(160,176,225,0.16)";
      ctx.fillRect(TX, 0, 1.3 * px, TH);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(TX + TW - 0.5, 0, 0.5, TH);
      const yLo = cy - H / 2 / s - PY;
      const yHi = cy + H / 2 / s + PY;
      const r0 = Math.max(0, Math.floor((yLo - BASE) / PY));
      const r1 = Math.min(ROWS - 1, Math.ceil((yHi - BASE) / PY));
      if (s > 26) {
        // close enough to see how it was put together
        ctx.fillStyle = `rgba(190,200,235,${0.035 * smooth(26, 60, s)})`;
        for (let r = r0; r <= r1 + 1; r++) ctx.fillRect(TX, BASE + r * PY - (PY - WH) / 2, TW, px);
        for (let c = 1; c < COLS; c++) ctx.fillRect(TX + 2 + c * PX - (PX - WW) / 2, yLo, px, yHi - yLo);
      }
      if (s > 4.5) {
        for (let r = r0; r <= r1; r++)
          for (let c = 0; c < COLS; c++) {
            if (withLights && lit.has(c + r * COLS) && T > 5.2) continue;
            ctx.fillStyle = `rgba(0,0,0,${0.42 - 0.24 * smooth(30, 80, s)})`;
            ctx.fillRect(TX + 2 + c * PX, BASE + r * PY, WW, WH);
            if (s > 12) {
              ctx.fillStyle = "rgba(170,182,225,0.05)";
              ctx.fillRect(TX + 2 + c * PX, BASE + r * PY, WW, Math.max(px, 0.04));
            }
          }
      }
      if (withLights) {
        const detail = smooth(30, 70, s);
        for (const l of lights) {
          if (l.y > yHi || l.y + WH < yLo || T < l.at) continue;
          let a = clamp((T - l.at) / 0.035);
          if (a < 1) a *= 0.5 + 0.5 * Math.pow(Math.sin(a * 22), 2);
          a *= (l.mention ? 0.5 : 1) * (0.95 + 0.05 * Math.sin(t * 1.3 + l.i * 2.1));
          ctx.globalAlpha = a;
          ctx.fillStyle = TINTS[l.i % TINTS.length];
          ctx.fillRect(l.x, l.y, WW, WH);
          ctx.globalAlpha = 1;
          const near = l === target ? 1 + detail * 0.5 : 1;
          glows.push({ x: l.x + WW / 2, y: l.y + WH / 2, rx: WW * 1.7 * near, ry: WH * 1.9 * near, a: a * 0.42, k: "bone" });
          if (l === target && detail > 0) closeUp(ctx, l.x, l.y, t, detail);
        }
      }
    }

    // the empty lot's fence, then the street lamps, in front of everything
    if (129 > x0 && 103 < x1) {
      ctx.fillStyle = "#07080d";
      for (let fx = 103.5; fx < 129.5; fx += 1.15) ctx.fillRect(fx, 0, 0.14, 1.25);
      ctx.fillRect(103.5, 0.45, 25.4, 0.1);
      ctx.fillRect(103.5, 0.95, 25.4, 0.1);
    }
    for (const lx of LAMPS) {
      if (lx + 8 < x0 || lx - 8 > x1) continue;
      const cone = ctx.createLinearGradient(0, 6.4, 0, 0);
      cone.addColorStop(0, "rgba(255,226,180,0.1)");
      cone.addColorStop(1, "rgba(255,226,180,0.015)");
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx + 0.75, 6.4);
      ctx.lineTo(lx + 1.05, 6.4);
      ctx.lineTo(lx + 4.4, 0);
      ctx.lineTo(lx - 2.6, 0);
      ctx.fill();
      ctx.fillStyle = "#0d0e15";
      ctx.fillRect(lx - 0.07, 0, 0.14, 6.7);
      ctx.fillRect(lx - 0.07, 6.6, 1.2, 0.1);
      ctx.fillStyle = "#ffe8c2";
      ctx.fillRect(lx + 0.65, 6.42, 0.5, 0.16);
      glows.push({ x: lx + 0.9, y: 6.4, rx: 2.6, ry: 2.6, a: 0.75, k: "lamp" }, { x: lx + 0.9, y: -0.2, rx: 4.6, ry: 0.55, a: 0.4, k: "lamp" });
    }

    // the ground
    ctx.fillStyle = "#06070a";
    ctx.fillRect(x0, -H / s, x1 - x0, H / s);
    ctx.fillStyle = "rgba(190,200,235,0.13)";
    ctx.fillRect(x0, -px, x1 - x0, px);
    ctx.fillStyle = "rgba(190,200,235,0.045)";
    ctx.fillRect(x0, -0.9, x1 - x0, px);

    ctx.globalCompositeOperation = "lighter";
    const yBottom = cy - H / 2 / s;
    const yTop = cy + H / 2 / s;
    const cap = (0.6 * Math.max(W, H)) / s; // a light never needs to be wider than the screen
    for (const g of glows) {
      const rx = Math.min(g.rx, cap);
      const ry = Math.min(g.ry, cap);
      if (g.x + rx < x0 || g.x - rx > x1 || g.y + ry < yBottom || g.y - ry > yTop) continue;
      ctx.globalAlpha = clamp(g.a);
      ctx.drawImage(GLOW[g.k], g.x - rx, g.y - ry, rx * 2, ry * 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  // ---- inside ---------------------------------------------------------------------------------

  const town = Array.from({ length: 46 }, (_, i) => ({ u: hash(i * 9.1 + 1), v: Math.pow(hash(i * 4.7 + 3), 1.6), a: 0.35 + 0.5 * hash(i * 2.9), ph: hash(i) * 6.28 }));
  const CROWD: [number, number][] = [[0, 0], [-0.075, 0.016], [0.062, -0.012], [0.118, 0.022], [-0.135, -0.006]];

  const interior = (ctx: Ctx, L: Layout, T: number, t: number) => {
    const { W, H } = L;
    const { ax, winY } = anchors(L);
    const wide = L.mode === "wide";
    const tall = L.mode === "tall";
    const z = lerp(4.2, 1, smooth(6.9, 7.45, T)); // we come through the blind, then step back into the room
    const raise = smooth(7.5, 7.92, T);
    const outside = smooth(8.45, 8.95, T);
    const baseH = wide ? Math.min(0.6 * H, (0.5 * W) / 1.17) : tall ? (0.84 * W) / 1.17 : 0.72 * H;
    const gh = baseH * z;
    const gw = baseH * 1.17 * z;
    const gx = ax * W - gw / 2;
    const gy = winY * H - gh / 2;
    const u = baseH / 100; // one hundredth of the window's height, for small things

    const wall = ctx.createRadialGradient(ax * W, winY * H, baseH * 0.3, ax * W, winY * H, Math.max(W, H) * 0.95);
    wall.addColorStop(0, "#1d1a15");
    wall.addColorStop(1, "#0b0a08");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, W, H);

    // the frame and the sill
    const fw = 2.4 * u * z;
    ctx.fillStyle = "#2c2821";
    ctx.fillRect(gx - fw, gy - fw, gw + fw * 2, gh + fw * 2);
    ctx.fillStyle = "#3a352c";
    ctx.fillRect(gx - fw * 2.2, gy + gh + fw, gw + fw * 4.4, fw * 1.25);
    const under = ctx.createLinearGradient(0, gy + gh + fw * 2.25, 0, gy + gh + fw * 6);
    under.addColorStop(0, "rgba(0,0,0,0.4)");
    under.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = under;
    ctx.fillRect(gx - fw * 2.2, gy + gh + fw * 2.25, gw + fw * 4.4, fw * 3.75);

    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy, gw, gh);
    ctx.clip();
    ctx.translate(gx, gy);

    // through the glass: the street we walked, seen from up here
    const hy = 0.3 * gh;
    const night = ctx.createLinearGradient(0, 0, 0, hy);
    night.addColorStop(0, "#04050a");
    night.addColorStop(1, "#0b0e1c");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, gw, hy);
    ctx.fillStyle = "#06070b";
    ctx.fillRect(0, hy, gw, gh - hy);
    const see = 0.34 + 0.66 * outside;
    ctx.fillStyle = "#f2b56c";
    for (const d of town) {
      ctx.globalAlpha = see * d.a * (0.75 + 0.25 * Math.sin(t * 0.9 + d.ph));
      const ds = Math.max(1, (0.5 + d.v * 1.4) * u * z * 0.55);
      ctx.fillRect(d.u * gw, hy + (0.012 + d.v * 0.17) * gh, ds, ds);
    }
    ctx.globalAlpha = see;
    const vx = 0.5 * gw;
    ctx.fillStyle = "#0c0e15";
    ctx.beginPath();
    ctx.moveTo(vx, hy);
    ctx.lineTo(0.71 * gw, gh);
    ctx.lineTo(0.29 * gw, gh);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 7; i >= 0; i--) {
      const dy = (gh - hy) * 0.8 * (1 / (1 + i * 0.6));
      const y = hy + dy;
      const su = dy * 0.36;
      for (const side of [-1, 1]) {
        if (hash(i * 3 + side) < 0.16) continue;
        const hx = vx + side * (dy * 0.36 + su * 0.75);
        ctx.globalAlpha = see;
        ctx.fillStyle = "#11131c";
        ctx.beginPath();
        ctx.moveTo(hx - su * 0.6, y - su * 0.62);
        ctx.lineTo(hx + su * 0.6, y - su * 0.62);
        ctx.lineTo(hx + su * 0.52, y - su * 0.2);
        ctx.lineTo(hx - su * 0.52, y - su * 0.2);
        ctx.fill();
        ctx.fillStyle = "#090a10";
        ctx.fillRect(hx - su * 0.52, y - su * 0.2, su * 1.04, su * 0.3);
        if (hash(i * 5 + side * 2) > 0.3) {
          ctx.fillStyle = "#f6b866";
          ctx.globalAlpha = see * 0.95;
          const wx = hx - side * su * 0.22;
          ctx.fillRect(wx - su * 0.09, y - su * 0.13, su * 0.18, su * 0.16);
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = see * 0.5;
          ctx.drawImage(GLOW.warm, wx - su * 0.5, y - su * 0.55, su, su);
          ctx.globalCompositeOperation = "source-over";
        }
      }
    }
    // the lamps along the street, and under the nearest one, whoever is looking up
    ctx.globalCompositeOperation = "lighter";
    for (let i = 5; i >= 1; i--) {
      const dy = (gh - hy) * 0.8 * (1 / (1 + (i + 0.5) * 0.6));
      ctx.globalAlpha = see * 0.6;
      ctx.drawImage(GLOW.lamp, vx + dy * 0.2 - dy * 0.42, hy + dy - dy * 0.12, dy * 0.84, dy * 0.24);
    }
    const px0 = 0.52 * gw;
    const py0 = 0.86 * gh;
    ctx.globalAlpha = see * 0.75;
    ctx.drawImage(GLOW.lamp, px0 - 0.25 * gw, py0 - 0.07 * gh, 0.5 * gw, 0.14 * gh);
    ctx.globalCompositeOperation = "source-over";
    const fu = 3.7 * u * z;
    CROWD.forEach(([dx, dyc], i) => {
      const a = smooth(8.48 + i * 0.15, 8.75 + i * 0.15, T);
      if (a <= 0) return;
      const fx = px0 + dx * gw;
      const fy = py0 + dyc * gh;
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = "#020203";
      ctx.beginPath();
      ctx.ellipse(fx - dx * gw * 0.5 - fu * 0.1, fy + fu * 0.5, fu * 0.3, fu * 0.75, dx * 2.4, 0, 6.3);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = "#08090d";
      ctx.beginPath();
      ctx.ellipse(fx, fy - fu * 0.42, fu * 0.2, fu * 0.46, 0, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = "#d8cdb8";
      ctx.beginPath();
      ctx.arc(fx, fy - fu * 1.02, fu * 0.16, 0, 6.3);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // on the glass: the room, looking back at itself
    const refl = 1 - 0.55 * outside;
    ctx.globalCompositeOperation = "lighter";
    const lx = 0.71 * gw;
    const ly = 0.37 * gh;
    const lr = 1.7 * u * z;
    const pendant = (ox: number, oy: number, k: number) => {
      ctx.globalAlpha = 0.2 * k;
      ctx.fillStyle = "#e6dcc6";
      ctx.fillRect(lx + ox - u * z * 0.12, 0, u * z * 0.24, ly + oy - lr * 3.4);
      ctx.globalAlpha = 0.34 * k;
      ctx.beginPath();
      ctx.ellipse(lx + ox, ly + oy - lr * 0.4, lr * 4.4, lr * 3, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 0.95 * k;
      ctx.fillStyle = "#fff6de";
      ctx.beginPath();
      ctx.arc(lx + ox, ly + oy, lr, 0, 6.3);
      ctx.fill();
    };
    ctx.globalAlpha = 0.6 * refl;
    ctx.drawImage(GLOW.lamp, lx - lr * 15, ly - lr * 13, lr * 30, lr * 30);
    pendant(lr * 1.1, lr * 0.7, 0.22 * refl);
    pendant(0, 0, refl);
    ctx.strokeStyle = "#d8d0c0";
    ctx.lineWidth = Math.max(1, u * z * 0.16);
    ctx.globalAlpha = 0.085 * refl;
    ctx.beginPath();
    ctx.moveTo(0, 0.1 * gh);
    ctx.lineTo(gw, 0.05 * gh);
    ctx.moveTo(0.08 * gw, gh);
    ctx.lineTo(0.08 * gw, 0.36 * gh);
    ctx.lineTo(0.25 * gw, 0.35 * gh);
    ctx.lineTo(0.25 * gw, gh);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // someone, or the lamp's glare on the pane
    blob(ctx, 0.45 * gw, gh * 1.03, gh * 0.66, -1, "226,218,202", (0.115 + 0.04 * Math.sin(t * 0.55)) * refl * smooth(0.5, 1, raise), 0.012 * Math.sin(t * 0.31));
    ctx.fillStyle = `rgba(74,62,44,${0.16 * refl})`;
    ctx.fillRect(0, 0, gw, gh);
    const sheen = ctx.createLinearGradient(0, 0, gw, gh);
    sheen.addColorStop(0.3, "rgba(220,225,245,0)");
    sheen.addColorStop(0.42, "rgba(220,225,245,0.035)");
    sheen.addColorStop(0.5, "rgba(220,225,245,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, gw, gh);
    ctx.globalCompositeOperation = "source-over";

    // the blind, from the room's side
    const by = gh * (1 - raise * 0.95);
    const fabric = ctx.createLinearGradient(0, 0, 0, Math.max(by, 1));
    fabric.addColorStop(0, "#d2cab8");
    fabric.addColorStop(1, "#e0d9c8");
    ctx.fillStyle = fabric;
    ctx.fillRect(0, 0, gw, by);
    ctx.fillStyle = "rgba(60,50,36,0.05)";
    for (let k = 1; k * 4.6 * u * z < by; k++) ctx.fillRect(0, k * 4.6 * u * z, gw, Math.max(1, u * z * 0.1));
    ctx.fillStyle = "#8d8573";
    ctx.fillRect(0, by - 1.3 * u * z, gw, 1.3 * u * z);
    const drop = ctx.createLinearGradient(0, by, 0, by + 5 * u * z);
    drop.addColorStop(0, "rgba(0,0,0,0.5)");
    drop.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = drop;
    ctx.fillRect(0, by, gw, 5 * u * z);
    ctx.restore();

    // the cord
    ctx.fillStyle = "#77705f";
    ctx.fillRect(gx + gw * 0.93, gy, Math.max(1, u * 0.18), gh * (0.18 + 0.5 * raise));
    ctx.beginPath();
    ctx.arc(gx + gw * 0.93 + u * 0.09, gy + gh * (0.18 + 0.5 * raise), u * 0.7 * z, 0, 6.3);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,250,235,0.07)";
    ctx.lineWidth = 1;
    ctx.strokeRect(gx - fw + 0.5, gy - fw + 0.5, gw + fw * 2 - 1, gh + fw * 2 - 1);
  };

  // ---- the record, laid out by month ----------------------------------------------------------

  const y0 = Number(since.slice(0, 4));
  const m0 = Number(since.slice(5, 7)) - 1;
  const month = (d: string) => (Number(d.slice(0, 4)) - y0) * 12 + Number(d.slice(5, 7)) - 1 - m0;
  const months = Math.max(1, month(now) + 1);
  const slot = lights.map((l, i) => {
    const m = clamp(month(l.date), 0, months - 1);
    let j = 0;
    for (let k = 0; k < i; k++) if (clamp(month(lights[k].date), 0, months - 1) === m) j++;
    return { m, j };
  });

  const record = (ctx: Ctx, L: Layout, cam: Cam, m: number, font: string, fade: number) => {
    const { W, H } = L;
    const tall = L.mode === "tall";
    const left = L.mode === "plate" ? W * 0.06 : Math.max(24, (W - 1152) / 2 + 24);
    const right = W - left;
    const base = H * (L.mode === "plate" ? 0.86 : tall ? 0.72 : 0.8);
    const lit = (right - left) * 0.86;
    const colW = lit / months;
    const per = tall ? 2 : 3;
    const c = Math.min(colW / (per * 1.15 + (per - 1) * 0.3 + 0.9), 15);
    const gap = c * 0.3;
    const axis = smooth(0.45, 1, m);

    ctx.globalAlpha = axis * 0.55;
    ctx.fillStyle = BONE;
    ctx.fillRect(left, base, lit, 1);
    // after today the line goes on, unlit
    ctx.globalAlpha = axis * 0.4;
    for (let x = left + lit + 5; x < right - 3; x += 9) ctx.fillRect(x, base, 4, 1);
    ctx.font = `${tall ? 11 : 13}px ${font}`;
    ctx.textBaseline = "top";
    for (let k = 0; k < months; k++) {
      const jan = (k + m0) % 12 === 0;
      ctx.globalAlpha = axis * (jan ? 0.6 : 0.28);
      ctx.fillRect(left + k * colW, base, 1, jan ? 9 : 4);
      if (jan) {
        ctx.globalAlpha = axis * 0.7;
        ctx.fillText(String(y0 + Math.floor((k + m0) / 12)), left + k * colW + 5, base + 9);
      }
    }
    ctx.globalAlpha = axis * 0.7;
    ctx.fillRect(left + lit, base - 5, 1, 14);
    ctx.textAlign = "right";
    ctx.fillText("today", left + lit - 5, base + 9);
    ctx.textAlign = "left";

    ctx.globalCompositeOperation = "lighter";
    lights.forEach((l, i) => {
      const e = smooth(0, 1, m * 1.4 - (0.4 * i) / Math.max(1, N - 1));
      const sx0 = W / 2 + (l.x - cam.cx) * cam.s;
      const sy0 = H / 2 - (l.y + WH - cam.cy) * cam.s;
      const { m: mo, j } = slot[i];
      const col = j % per;
      const row = Math.floor(j / per);
      const tx = left + (mo + 0.5) * colW + (col - (per - 1) / 2) * (c * 1.15 + gap) - (c * 1.15) / 2;
      const ty = base - 7 - row * (c + gap) - c;
      const w = lerp(WW * cam.s, c * 1.15, e);
      const h = lerp(WH * cam.s, c, e);
      const x = lerp(sx0, tx, e) + Math.sin(e * Math.PI) * (hash(i) - 0.5) * W * 0.05;
      const y = lerp(sy0, ty, e) - Math.sin(e * Math.PI) * H * 0.04;
      const a = (l.mention ? 0.5 : 1) * 0.96 * fade;
      ctx.globalAlpha = a;
      ctx.fillStyle = TINTS[l.i % TINTS.length];
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = a * 0.36;
      ctx.drawImage(GLOW.bone, x + w / 2 - w * 1.7, y + h / 2 - h * 1.9, w * 3.4, h * 3.8);
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  // ---- one frame ------------------------------------------------------------------------------

  const cover = (ctx: Ctx, L: Layout, colour: string, a: number) => {
    if (a <= 0) return;
    ctx.globalAlpha = clamp(a);
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, L.W, L.H);
    ctx.globalAlpha = 1;
  };

  const draw = (ctx: Ctx, L: Layout, dpr: number, T: number, t: number, font: string) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (T < 6.9) {
      exterior(ctx, L, dpr, camera(L, T), T, t, true);
      cover(ctx, L, "#d6cebc", smooth(6.8, 6.9, T)); // through the blind
    } else if (T < 9.62) {
      interior(ctx, L, T, t);
      cover(ctx, L, "#d6cebc", 1 - smooth(6.9, 7.1, T));
      cover(ctx, L, "#000", smooth(9.48, 9.62, T));
    } else {
      const cam = camera(L, T);
      const m = smooth(9.95, 10.45, T);
      exterior(ctx, L, dpr, cam, T, t, false);
      cover(ctx, L, "#000", Math.max(1 - smooth(9.62, 9.85, T), smooth(0, 0.6, m)));
      record(ctx, L, cam, m, font, smooth(9.62, 9.85, T));
    }
  };

  return { draw, count: (T: number) => lights.reduce((n, l) => n + (T >= l.at ? 1 : 0), 0), total: N };
}

export type Scene = ReturnType<typeof makeScene>;
