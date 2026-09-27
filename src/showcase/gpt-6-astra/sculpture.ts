// A single family of contours travels through the story: signal, language,
// pronoun, interior, competing views, and finally the line of the public record.
const outline = [
  [-138, -190], [138, -190], [138, -160], [64, -149],
  [48, -133], [48, 133], [64, 149], [138, 160],
  [138, 190], [-138, 190], [-138, 160], [-64, 149],
  [-48, 133], [-48, -133], [-64, -149], [-138, -160],
];

export const STRANDS = 48;
export const STOPS = [0, 0.2, 0.37, 0.55, 0.74, 0.96];
export const CHAPTERS = ["Question", "Language", "I", "Inside", "Readings", "Record"];
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Point = [number, number];
const contour: Point[] = outline.flatMap(([x, y], i) => {
  const next = outline[(i + 1) % outline.length];
  return Array.from({ length: 6 }, (_, j): Point => [mix(x, next[0], j / 6), mix(y, next[1], j / 6)]);
});

function project(x: number, y: number, z: number, yaw: number, pitch: number, roll: number): Point {
  const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
  const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
  const zz = y * Math.sin(pitch) + rz * Math.cos(pitch);
  const perspective = 1100 / (1100 - zz);
  return [(rx * Math.cos(roll) - ry * Math.sin(roll)) * perspective,
    (rx * Math.sin(roll) + ry * Math.cos(roll)) * perspective];
}

function point(scene: number, i: number, j: number, compact: boolean): Point {
  const layer = i / (STRANDS - 1) - 0.5;
  const t = j / (contour.length - 1);
  const [ox, oy] = contour[j];
  const size = compact ? 1 : 1.22;

  if (scene === 0) {
    const x = (t - 0.5) * (compact ? 920 : 1800);
    const envelope = Math.exp(-Math.pow(x / (compact ? 120 : 240), 2));
    const y = Math.sin(t * Math.PI * 6 + layer * 2) * envelope * (30 + 36 * (layer + 0.5));
    return [x, y + layer * 9];
  }
  if (scene === 1) {
    const twist = layer * 3.5;
    const x = ox * Math.cos(twist) - oy * Math.sin(twist);
    const y = ox * Math.sin(twist) + oy * Math.cos(twist);
    const p = project(x, y, layer * 230, 0.84, -0.4, -0.45);
    return [p[0] * size * 1.08, p[1] * size * 1.08];
  }
  if (scene === 2) {
    const p = project(ox * (1 + layer * 0.23), oy * (1 + layer * 0.23), layer * 160, 0, 0, 0);
    return [p[0] * size, p[1] * size];
  }
  if (scene === 3) {
    // Fly through the central opening. The front contours leave the screen;
    // the distant ones remain a small, still-unanswered aperture.
    const s = 0.12 + Math.pow(i / (STRANDS - 1), 2.25) * 12;
    const angle = layer * 0.18;
    return [(ox * Math.cos(angle) - oy * Math.sin(angle)) * s * size,
      (ox * Math.sin(angle) + oy * Math.cos(angle)) * s * size];
  }
  if (scene === 4) {
    const side = i < STRANDS / 2 ? -1 : 1;
    const local = (i % (STRANDS / 2)) / (STRANDS / 2 - 1) - 0.5;
    const twist = local * 1.2;
    const x = ox * Math.cos(twist) - oy * Math.sin(twist);
    const y = ox * Math.sin(twist) + oy * Math.cos(twist);
    const p = project(x, y, local * 230, side < 0 ? 1.14 : -0.25, side * 0.2, side * 0.15);
    const scale = compact ? 0.54 : 0.83;
    return [p[0] * scale + side * (compact ? 135 : 280), p[1] * scale];
  }
  // The two views straighten into the same line. Its event markers are drawn
  // separately from actual HeroProps, never fabricated as evidence.
  return [(t - 0.5) * (compact ? 420 : 1080), layer * 1.6];
}

export function sculpture(progress: number, compact = false): string[] {
  let from = 0;
  while (from < STOPS.length - 2 && progress > STOPS[from + 1]) from++;
  const local = clamp((progress - STOPS[from]) / (STOPS[from + 1] - STOPS[from]));
  // Hold each resolved image, so there is a visual arrival between movements.
  const blend = ease((local - 0.23) / 0.62);
  return Array.from({ length: STRANDS }, (_, i) => {
    const points = contour.map((_, j) => {
      const a = point(from, i, j, compact);
      const b = point(from + 1, i, j, compact);
      return `${mix(a[0], b[0], blend).toFixed(2)},${mix(a[1], b[1], blend).toFixed(2)}`;
    });
    return `M${points.join("L")}`;
  });
}

export function chapterAt(p: number): number {
  if (p < 0.12) return 0;
  if (p < 0.29) return 1;
  if (p < 0.46) return 2;
  if (p < 0.65) return 3;
  if (p < 0.85) return 4;
  return 5;
}
