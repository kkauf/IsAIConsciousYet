// The eye is the site's one moving thing. It watches the reader, reads both sides of every seam,
// and never settles on one. Everything here is shared by the header eye and the seam eyes.

type Tick = (now: number, dt: number) => void;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
// Frame-rate independent approach towards a target; k is roughly "per second".
export const approach = (from: number, to: number, k: number, dt: number) => from + (to - from) * (1 - Math.exp(-k * dt));

export const reducedMotion = () =>
  typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pointer and scroll, sampled once per frame for every eye.
export const input = { x: 0, y: 0, lastMove: -Infinity, inside: false, scrollY: 0, velocity: 0 };
let bound = false;
export function bindInput() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  input.scrollY = window.scrollY;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      input.x = e.clientX;
      input.y = e.clientY;
      input.lastMove = performance.now();
      input.inside = true;
    },
    { passive: true },
  );
  document.documentElement.addEventListener("mouseleave", () => (input.inside = false));
}
// A mouse that moved in the last few seconds holds the eye's attention; otherwise it looks around by itself.
export const attending = (now: number) => input.inside && now - input.lastMove < 3000;

const subs = new Set<Tick>();
let raf = 0;
let last = 0;
function loop(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  const y = window.scrollY;
  input.velocity = approach(input.velocity, (y - input.scrollY) / dt, 10, dt);
  input.scrollY = y;
  subs.forEach((f) => f(now, dt));
  if (subs.size) {
    raf = requestAnimationFrame(loop);
  } else {
    raf = 0;
    last = 0;
  }
}
export function onFrame(f: Tick) {
  subs.add(f);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => void subs.delete(f);
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;

// Lid openness, 1 = open. Blinks at irregular intervals, sometimes twice.
export function blinker(minGap = 3500, spread = 5000) {
  let next = performance.now() + 1200 + Math.random() * spread;
  let start = -1;
  let doubled = false;
  return (now: number) => {
    if (start < 0 && now >= next) start = now;
    if (start < 0) return 1;
    const t = (now - start) / 1000;
    if (t >= 0.32) {
      start = -1;
      doubled = !doubled && Math.random() < 0.2;
      next = now + (doubled ? 140 : minGap + Math.random() * spread);
      return 1;
    }
    if (t < 0.08) return 1 - easeIn(t / 0.08);
    if (t < 0.12) return 0;
    return easeOut((t - 0.12) / 0.2);
  };
}

// Unattended, the round eye looks around in saccades and often comes back to the reader.
export function wanderer() {
  let target: [number, number] = [0, 0];
  let next = 0;
  return (now: number): [number, number] => {
    if (now >= next) {
      const home = Math.random() < 0.35;
      const a = Math.random() * Math.PI * 2;
      const r = home ? 0 : 0.35 + Math.random() * 0.55;
      target = [Math.cos(a) * r, Math.sin(a) * r * 0.75];
      next = now + 800 + Math.random() * 2400;
    }
    return target;
  };
}

// Unattended, a seam eye reads both readings in turn: one side top to bottom, line by line, then the other.
// Equal time on each side; it never stays with one.
export function reader(period = 9000) {
  const offset = Math.random() * period;
  const lines = 5;
  return (now: number): { side: -1 | 1; line: number; inLine: number } => {
    const p = ((now + offset) % period) / period;
    const local = (p % 0.5) / 0.5;
    const n = Math.min(lines - 1, Math.floor(local * lines));
    // line and inLine run 0..1: which line of the reading, and how far along it
    return { side: p < 0.5 ? -1 : 1, line: n / (lines - 1), inLine: local * lines - n };
  };
}
