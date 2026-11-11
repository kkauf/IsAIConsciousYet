#!/usr/bin/env node
// Capture the shipped heroes with their own scroll and pointer handlers.
// A controlled browser clock renders every frame, independent of machine speed.
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { homedir } from "node:os";

const { values } = parseArgs({ options: {
  "out-dir": { type: "string", default: join(homedir(), "Downloads") },
  "base-url": { type: "string", default: "https://isaiconsciousyet.com" },
  date: { type: "string", default: new Date().toLocaleDateString("en-CA").replaceAll("-", "") },
  model: { type: "string", multiple: true },
  stills: { type: "boolean", default: false },
  manifest: { type: "string" },
} });
if (!/^\d{8}$/.test(values.date)) throw new Error("--date must be YYYYMMDD");
const outDir = resolve(values["out-dir"]);
await mkdir(outDir, { recursive: true });
const fps = 30;
const entries = [
  {
    slug: "claude-fable-5-2", model: "Claude Fable 5.2", file: "Claude-Fable-5.2",
    selector: 'section[aria-label^="A hero by"][data-live]', offset: 0,
    shots: [[0, 0],[3, 0],[6.5, 0.151],[10.5, 0.151],[13, 0.259],[18, 0.259],[20.5, 0.368],[24.5, 0.368],[27, 0.495],[32, 0.495],[34.5, 0.599],[40, 0.599],[43.5, 0.783],[50.5, 0.783],[53, 0.877],[59, 0.877],[61.5, 1],[67.5, 1]],
    stills: [0, 0.151, 0.259, 0.368, 0.495, 0.599, 0.783, 0.877, 1],
  },
  {
    slug: "gpt-6-1-sol", model: "GPT-6.1 Sol", file: "GPT-6.1-Sol",
    selector: "[data-sol-hero][data-enhanced]", offset: 64,
    shots: [[0, 0], [3, 0], [6, .28], [11, .28], [16, .6], [21, .6], [26, .97], [33, .97]],
    stills: [0, .28, .6, .97],
  },
  {
    slug: "claude-opus-5-5", model: "Claude Opus 5.5", file: "Claude-Opus-5.5",
    selector: "section[data-live]", offset: 0,
    shots: [[0, 0], [3, 0], [4, .075], [7, .075], [11, .24], [15, .24],
      [18, .365], [20, .405], [21, .445], [25, .445], [29, .567], [32, .567],
      [35, .67], [40, .67], [42, .757], [47, .757], [49, .825], [53, .825],
      [56, .905], [63, .905], [67, .995], [73, .995]],
    stills: [0, .24, .445, .67, .757, .905, .995],
  },
  {
    slug: "gpt-6-astra", model: "GPT-6 Astra", file: "GPT-6-Astra",
    selector: 'section[data-motion="scroll"]', offset: 64,
    shots: [[0, 0], [3, 0], [7, .2], [11, .2], [15, .37], [19, .37],
      [23, .55], [28, .55], [32, .74], [38, .74], [42, .97], [49, .97]],
    stills: [0, .2, .37, .55, .74, .97],
  },
];
if (values.model?.some(slug => !entries.some(entry => entry.slug === slug))) {
  throw new Error(`Unknown model in ${values.model.join(", ")}`);
}
const selected = values.model ? entries.filter(e => values.model.includes(e.slug)) : entries;
const ease = t => t * t * (3 - 2 * t);
function progressAt(shots, time) {
  let i = 0;
  while (i < shots.length - 2 && time > shots[i + 1][0]) i++;
  const [start, p] = shots[i], [end, q] = shots[i + 1];
  return p + (q - p) * ease(Math.max(0, Math.min(1, (time - start) / (end - start))));
}
function checkCommand(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}
if (!values.stills) checkCommand("ffmpeg", ["-version"]);

const browser = await chromium.launch({ headless: true });
const manifest = { source: values["base-url"], date: values.date, fps, width: 1920, height: 1080, entries: [] };
try {
  if (values.manifest) {
    try {
      const existing = JSON.parse(await readFile(resolve(values.manifest), "utf8"));
      if (existing.source !== manifest.source || existing.date !== manifest.date) {
        throw new Error("Manifest source or date differs from this export");
      }
      manifest.entries = existing.entries;
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const entry of selected) {
    const file = join(outDir, `${values.date}-IAICY-${entry.file}-16x9.mp4`);
    if (!values.stills) {
      try { await access(file); throw new Error(`Refusing to overwrite ${file}`); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 + entry.offset }, deviceScaleFactor: 1.5,
      reducedMotion: "no-preference", colorScheme: "dark", locale: "en-GB",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date() });
    await page.goto(`${values["base-url"]}/?v=${entry.slug}`, { waitUntil: "networkidle" });
    await page.waitForSelector(entry.selector, { state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: `
      body > header, header.fixed, nav[aria-label="Showcase versions"] { visibility: hidden !important; }
      html { scroll-behavior: auto !important; }
    ` });
    await page.evaluate(({ selector, offset, model }) => {
      const root = document.querySelector(selector);
      const stage = root.firstElementChild;
      window.__bannerExport = {
        root, stage, start: window.scrollY + root.getBoundingClientRect().top - offset,
        travel: root.clientHeight - stage.clientHeight, animations: new WeakMap(), time: 0,
      };
      const credit = document.createElement("div");
      credit.textContent = `${model}  ·  isaiconsciousyet.com`;
      Object.assign(credit.style, {
        position: "absolute", top: "20px", left: "28px", zIndex: "20", pointerEvents: "none",
        font: "12px var(--font-public-sans), Arial, sans-serif", letterSpacing: ".02em",
        color: "#fff", opacity: ".6", textShadow: "0 1px 6px #0008",
      });
      stage.append(credit);
      window.scrollTo({ top: window.__bannerExport.start, behavior: "instant" });
    }, { selector: entry.selector, offset: entry.offset, model: entry.model });
    await page.clock.pauseAt(new Date(Date.now() + 1200));
    const clip = { x: 0, y: entry.offset, width: 1280, height: 720 };
    const render = async (progress, time, delta) => {
      await page.evaluate(({ progress, time, delta, sol }) => {
        const capture = window.__bannerExport;
        capture.time += delta;
        capture.delta = delta;
        window.scrollTo({ top: capture.start + progress * capture.travel, behavior: "instant" });
        if (sol) {
          const rect = capture.stage.getBoundingClientRect();
          const active = progress > .14 && progress < .48;
          const x = active ? .66 + .2 * Math.sin(time * .9) : .73;
          const y = active ? .41 + .16 * Math.cos(time * .7) : .4;
          capture.stage.dispatchEvent(new PointerEvent("pointermove", {
            clientX: rect.left + rect.width * x, clientY: rect.top + rect.height * y,
            pointerType: "mouse", bubbles: true,
          }));
        }
      }, { progress, time, delta, sol: entry.slug === "gpt-6-1-sol" });
      await page.clock.fastForward(delta);
      // CSS transitions use the compositor clock; advance them alongside JS.
      await page.evaluate(() => {
        const capture = window.__bannerExport;
        for (const animation of document.getAnimations()) {
          if (!capture.animations.has(animation)) {
            capture.animations.set(animation, capture.time - capture.delta);
            animation.pause();
          }
          animation.currentTime = capture.time - capture.animations.get(animation);
        }
      });
      return page.screenshot({ type: "jpeg", quality: 94, clip, scale: "device", animations: "allow" });
    };

    if (values.stills) {
      for (const progress of entry.stills) {
        const frame = await render(progress, progress * 50, 1000);
        const path = join(outDir, `${entry.slug}-${progress.toFixed(3)}.jpg`);
        await writeFile(path, frame);
        console.log(path);
      }
    } else {
      const duration = entry.shots.at(-1)[0];
      console.log(`${entry.model}: rendering ${duration}s / ${duration * fps} frames`);
      const encoder = spawn("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-n", "-f", "image2pipe", "-framerate", String(fps),
        "-vcodec", "mjpeg", "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "medium",
        "-vf", "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p,sidedata=mode=delete:type=ICC_PROFILE,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709",
        "-crf", "18", "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p",
        "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-profile:v", "high", "-level:v", "4.1", "-threads", "2", "-movflags", "+faststart",
        "-metadata", `title=IAICY — ${entry.model}`, "-metadata", "comment=isaiconsciousyet.com", file,
      ], { stdio: ["pipe", "ignore", "pipe"] });
      let encoderError = "";
      encoder.stderr.on("data", data => { encoderError += data; });
      const completion = once(encoder, "close");
      encoder.stdin.on("error", () => {});
      try {
        for (let frame = 0; frame < duration * fps; frame++) {
          const time = frame / fps;
          const image = await render(progressAt(entry.shots, time), time, 1000 / fps);
          if (!encoder.stdin.write(image)) await once(encoder.stdin, "drain");
          if (frame % (fps * 5) === 0) console.log(`${entry.model}: ${time.toFixed(0)} / ${duration}s`);
        }
      } finally { encoder.stdin.end(); }
      const [code] = await completion;
      if (code !== 0) throw new Error(`ffmpeg failed: ${encoderError}`);
      if (errors.length) throw new Error(`${entry.model} browser errors: ${errors.join("; ")}`);
      const probe = JSON.parse(checkCommand("ffprobe", [
        "-v", "error", "-show_streams", "-show_format", "-of", "json", file,
      ]));
      const video = probe.streams.find(stream => stream.codec_type === "video");
      if (video.width !== 1920 || video.height !== 1080 || video.codec_name !== "h264" || video.pix_fmt !== "yuv420p" ||
        video.color_range !== "tv" || video.color_space !== "bt709" || video.color_transfer !== "bt709" ||
        video.color_primaries !== "bt709" || video.avg_frame_rate !== "30/1" || +video.nb_frames !== duration * fps) {
        throw new Error(`Unexpected video format: ${JSON.stringify(video)}`);
      }
      manifest.entries = manifest.entries.filter(item => item.slug !== entry.slug);
      manifest.entries.push({ slug: entry.slug, model: entry.model, file, duration: +probe.format.duration,
        size: +probe.format.size, frames: +video.nb_frames, frameRate: video.avg_frame_rate, shots: entry.shots });
      console.log(`Saved ${file} (${(+probe.format.size / 1e6).toFixed(1)} MB)`);
      if (values.manifest) await writeFile(resolve(values.manifest), JSON.stringify(manifest, null, 2) + "\n");
    }
    await context.close();
  }
} finally { await browser.close(); }
