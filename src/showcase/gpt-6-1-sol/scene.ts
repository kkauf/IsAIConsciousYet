// A piece of glass and a light, drawn in Canvas 2D. This is an illustration,
// not a diagram of a model. Nothing here runs on a clock: scroll and touch
// provide the movement.
export const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, n));
export const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function ground(ctx: CanvasRenderingContext2D, width: number, height: number, ending: number) {
  const colour = (r: number, g: number, b: number) => `rgb(${Math.round(r * (1 - ending))} ${Math.round(g * (1 - ending))} ${Math.round(b * (1 - ending))})`;
  const sky = ctx.createLinearGradient(0, 0, width * 0.65, height);
  sky.addColorStop(0, colour(35, 80, 237));
  sky.addColorStop(0.58, colour(17, 49, 186));
  sky.addColorStop(1, colour(7, 23, 102));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * 0.75, height * 0.42, 0, width * 0.65, height * 0.5, width * 0.65);
  glow.addColorStop(0, `rgba(119, 176, 255, ${0.2 * (1 - ending)})`);
  glow.addColorStop(1, "rgba(119, 176, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function light(ctx: CanvasRenderingContext2D, position: number, pointerX: number, pointerY: number) {
  ctx.clearRect(0, 0, 600, 720);
  const glow = ctx.createRadialGradient(310, 340, 12, 310, 340, 315);
  glow.addColorStop(0, "rgba(255, 155, 56, 0.22)");
  glow.addColorStop(0.65, "rgba(255, 100, 44, 0.11)");
  glow.addColorStop(1, "rgba(255, 110, 35, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 600, 720);

  ctx.save();
  ctx.translate(300 + pointerX * 20, 350 + pointerY * 16);
  ctx.rotate(-0.36 + position * 0.22 + pointerX * 0.05);
  ctx.scale(1, 1.1);
  const ring = ctx.createLinearGradient(-190, -200, 190, 190);
  ring.addColorStop(0, "#fff4ce");
  ring.addColorStop(0.23, "#ffd173");
  ring.addColorStop(0.52, "#ff9b42");
  ring.addColorStop(0.78, "#ef592c");
  ring.addColorStop(1, "#c93920");
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.ellipse(0, 0, 189, 224, 0, 0, Math.PI * 2);
  ctx.ellipse(18, -5, 132, 165, 0, 0, Math.PI * 2, true);
  ctx.fill("evenodd");

  const edge = ctx.createLinearGradient(-190, -200, 190, 190);
  edge.addColorStop(0, "rgba(255,255,239,.85)");
  edge.addColorStop(0.45, "rgba(255,197,114,.5)");
  edge.addColorStop(1, "rgba(107,22,32,.3)");
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, 188, 223, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(106,37,38,.3)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(18, -5, 135, 168, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function mechanism(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, progress: number, opacity: number) {
  if (opacity < 0.001) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  const left = cx - width * 0.54;
  const right = cx + width * 0.54;
  for (let i = 0; i < 9; i++) {
    const y = cy + (i - 4) * height * 0.065;
    const rise = Math.sin(i * 1.8) * height * 0.23;
    ctx.strokeStyle = "rgba(224,237,255,.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.bezierCurveTo(cx - width * 0.22, y + rise, cx + width * 0.22, y - rise, right, y);
    ctx.stroke();
    const t = ((progress * 1.7 + i * 0.13) % 1 + 1) % 1;
    const x = mix(left, right, t);
    const py = y + rise * 3 * t * (1 - t) * (1 - 2 * t);
    ctx.beginPath();
    ctx.arc(x, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd591";
    ctx.fill();
    for (const px of [left, right]) {
      ctx.strokeStyle = "rgba(223,237,255,.6)";
      ctx.beginPath();
      ctx.arc(px, y, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function createScene(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const source = document.createElement("canvas");
  source.width = 600;
  source.height = 720;
  const sourceCtx = source.getContext("2d");
  if (!ctx || !sourceCtx) return null;

  return (width: number, height: number, progress: number, pointerX: number, pointerY: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6, 1800 / width);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = width < 700;
    const response = ease((progress - 0.12) / 0.24);
    const opening = ease((progress - 0.39) / 0.24);
    const ending = ease((progress - 0.72) / 0.28);
    const firstWidth = mobile
      ? Math.min(width * 0.74, Math.max(150, height * 0.85 - 285) / 1.2)
      : Math.min(width * 0.4, height * 0.65, 560);
    const panelWidth = mix(firstWidth, Math.min(width * (mobile ? 0.74 : 0.4), height * 0.48, 440), response);
    const panelHeight = panelWidth * 1.2;
    const cx = mix(width * (mobile ? 0.54 : 0.7), width * 0.5, response);
    const firstY = mobile ? height * 0.575 + 27.5 : height * 0.48;
    const cy = mix(firstY, height * (mobile ? 0.42 : 0.4), response);
    ground(ctx, width, height, ending);

    // The reflected light on the floor anchors the glass in a room.
    ctx.save();
    ctx.translate(cx, cy + panelHeight * 0.61);
    ctx.scale(1, 0.13);
    const reflection = ctx.createRadialGradient(0, 0, 0, 0, 0, panelWidth * 0.7);
    reflection.addColorStop(0, `rgba(0, 5, 52, ${0.52 * (1 - ending)})`);
    reflection.addColorStop(1, "rgba(0,5,52,0)");
    ctx.fillStyle = reflection;
    ctx.fillRect(-panelWidth, -panelWidth, panelWidth * 2, panelWidth * 2);
    ctx.restore();

    light(sourceCtx, progress, pointerX * response, pointerY * response);
    mechanism(ctx, cx, cy, panelWidth * 1.23, panelHeight, progress, opening * (1 - ending));

    // Three real sections separate. Refraction is sampled strip by strip from
    // the same source image; pointer movement bends those samples into a wave.
    const ribs = mobile ? 48 : 72;
    for (let panel = 0; panel < 3; panel++) {
      ctx.save();
      const offset = (panel - 1) * panelWidth / 3;
      ctx.translate(cx + offset * (1 + opening * 0.72), cy + (panel - 1) * opening * panelHeight * 0.1);
      ctx.rotate(-0.075 * (1 - opening) + (panel - 1) * opening * 0.16 + pointerX * response * 0.015);
      ctx.globalAlpha = 1 - ending;
      const pw = panelWidth / 3;
      ctx.shadowColor = "rgba(1,10,55,.26)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 14;
      const plate = ctx.createLinearGradient(-pw / 2, -panelHeight / 2, pw / 2, panelHeight / 2);
      plate.addColorStop(0, "rgba(173,211,255,.3)");
      plate.addColorStop(0.35, "rgba(138,180,245,.07)");
      plate.addColorStop(1, "rgba(111,162,233,.2)");
      ctx.fillStyle = plate;
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -panelHeight / 2, pw, panelHeight, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.clip();

      const stripWidth = panelWidth / ribs;
      for (let i = 0; i < ribs / 3; i++) {
        const rib = panel * ribs / 3 + i;
        const x = -pw / 2 + i * stripWidth;
        const distance = rib / ribs - (0.5 + pointerX * 0.3);
        const wave = Math.sin(distance * 20 - progress * 26) * Math.exp(-distance * distance * 13) * response;
        const shift = wave * 17 + Math.sin(rib * 1.43) * 3;
        const sampleX = clamp((rib / ribs) * 600 + shift, 0, 600 - 600 / ribs);
        ctx.drawImage(source, sampleX, 0, 600 / ribs, 720, x, -panelHeight / 2, stripWidth + 0.5, panelHeight);
        const flute = ctx.createLinearGradient(x, 0, x + stripWidth, 0);
        flute.addColorStop(0, "rgba(221,238,255,.27)");
        flute.addColorStop(0.22, "rgba(208,229,255,.06)");
        flute.addColorStop(0.62, "rgba(0,18,87,.03)");
        flute.addColorStop(0.92, "rgba(0,15,79,.24)");
        flute.addColorStop(1, "rgba(222,240,255,.37)");
        ctx.fillStyle = flute;
        ctx.fillRect(x, -panelHeight / 2, stripWidth, panelHeight);
      }
      ctx.restore();

      ctx.save();
      ctx.translate(cx + offset * (1 + opening * 0.72), cy + (panel - 1) * opening * panelHeight * 0.1);
      ctx.rotate(-0.075 * (1 - opening) + (panel - 1) * opening * 0.16 + pointerX * response * 0.015);
      ctx.globalAlpha = (1 - ending) * 0.8;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(221,239,255,.7)";
      ctx.beginPath();
      ctx.roundRect(-pw / 2, -panelHeight / 2, pw, panelHeight, 7);
      ctx.stroke();
      ctx.restore();
    }

    // At the end the apparatus disappears, leaving an opening, not an answer.
    if (ending > 0) {
      ctx.save();
      ctx.globalAlpha = ending * 0.9;
      const w = panelWidth * 0.7;
      const finalY = height * (mobile ? 0.31 : 0.28);
      ctx.drawImage(source, cx - w / 2, finalY - w * 0.6, w, w * 1.2);
      ctx.restore();
    }
  };
}
