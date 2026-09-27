// One continuous serif I, repeated through depth. Only the viewpoint and the
// twist and spacing of its cross-sections change; no letters are swapped in.
const outline = [
  [-138, -190], [138, -190], [138, -160], [64, -149],
  [48, -133], [48, 133], [64, 149], [138, 160],
  [138, 190], [-138, 190], [-138, 160], [-64, 149],
  [-48, 133], [-48, -133], [-64, -149], [-138, -160],
];

export const STRANDS = 48;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

export function sculpture(progress: number): string[] {
  const align = ease((progress - 0.08) / 0.32);
  const unfold = ease((progress - 0.6) / 0.3);
  const yaw = 0.95 * (1 - align) - 0.68 * unfold;
  const pitch = -0.35 * (1 - align) + 0.18 * unfold;
  const roll = -0.22 * (1 - align) + 0.13 * unfold;
  const depth = 185 + unfold * 220;

  return Array.from({ length: STRANDS }, (_, i) => {
    const layer = i / (STRANDS - 1) - 0.5;
    const twist = layer * (1 - align) * 2.8 + layer * unfold * 0.5;
    const scale = 1 + layer * 0.22;
    const points = outline.map(([ox, oy]) => {
      const x = (ox * Math.cos(twist) - oy * Math.sin(twist)) * scale;
      const y = (ox * Math.sin(twist) + oy * Math.cos(twist)) * scale;
      const z = layer * depth;
      const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
      const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
      const zz = y * Math.sin(pitch) + rz * Math.cos(pitch);
      const perspective = (1000 / (1000 - zz)) * (1 - unfold * 0.18);
      const px = (rx * Math.cos(roll) - ry * Math.sin(roll)) * perspective;
      const py = (rx * Math.sin(roll) + ry * Math.cos(roll)) * perspective;
      return `${(320 + px).toFixed(2)},${(300 + py).toFixed(2)}`;
    });
    return `M${points.join("L")}Z`;
  });
}
