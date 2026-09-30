"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { HeroProps } from "../types";
import { clamp, createScene, ease } from "./scene";
import styles from "./hero.module.css";

const chapters = ["The surface", "A response", "The mechanism", "The question"];
const stops = [0, 0.29, 0.59, 0.95];

function Still() {
  // The showcase renders one entry at a time. Names scoped to this entry keep
  // SVG references identical across next/dynamic's server and client trees.
  const id = "gpt-6-1-sol-still";
  return (
    <svg className={styles.still} viewBox="0 0 600 720" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-light`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff1c9" /><stop offset=".48" stopColor="#ffad4e" /><stop offset="1" stopColor="#d64628" />
        </linearGradient>
        <pattern id={`${id}-glass`} width="9" height="720" patternUnits="userSpaceOnUse">
          <rect width="9" height="720" fill="#adcfff" opacity=".08" />
          <path d="M0 0V720" stroke="#e2efff" opacity=".5" />
          <path d="M7 0V720" stroke="#02146b" opacity=".35" />
        </pattern>
      </defs>
      <g transform="rotate(-5 300 360)">
        <path d="M300 126a184 222 0 1 0 0 444 184 222 0 1 0 0-444ZM316 184a128 164 0 1 1 0 328 128 164 0 1 1 0-328Z" fill={`url(#${id}-light)`} fillRule="evenodd" />
        <rect x="71" y="61" width="458" height="584" rx="9" fill={`url(#${id}-glass)`} stroke="#d5e7ff" strokeOpacity=".55" />
      </g>
    </svg>
  );
}

export default function Hero({ model, date }: HeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!root || !stage || !canvas) return;
    const render = createScene(canvas);
    if (!render) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let frame = 0;
    let settlingUntil = 0;
    let width = 0;
    let height = 0;
    let progress = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let previousTime = 0;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-chapter]"));
    let activeChapter = -1;

    const paint = (time: number) => {
      frame = 0;
      if (!visible || reduced.matches || document.hidden) return;
      const delta = Math.min(time - previousTime || 16, 64);
      previousTime = time;
      const lerp = 1 - Math.exp(-delta / 75);
      pointerX += (targetX - pointerX) * lerp;
      pointerY += (targetY - pointerY) * lerp;
      render(width, height, progress, pointerX, pointerY);
      if (time < settlingUntil) frame = requestAnimationFrame(paint);
    };

    const request = () => {
      if (!visible || reduced.matches) return;
      // A hidden tab still gets the requested still, but never a settling loop.
      if (document.hidden) render(width, height, progress, targetX, targetY);
      else if (!frame) frame = requestAnimationFrame(paint);
    };

    const read = () => {
      if (reduced.matches) {
        // Resize also catches a preference change when the browser coalesces
        // rapid media-query events into the same rendering frame.
        configure();
        return;
      }
      const bounds = root.getBoundingClientRect();
      width = stage.clientWidth;
      height = stage.clientHeight;
      progress = clamp((64 - bounds.top) / Math.max(1, bounds.height - height));
      const first = 1 - ease((progress - 0.08) / 0.12);
      const response = ease((progress - 0.14) / 0.1) * (1 - ease((progress - 0.39) / 0.1));
      const mechanism = ease((progress - 0.46) / 0.09) * (1 - ease((progress - 0.69) / 0.09));
      const question = ease((progress - 0.78) / 0.13);
      [first, response, mechanism, question].forEach((opacity, i) => root.style.setProperty(`--chapter-${i}`, opacity.toFixed(4)));
      const nextChapter = [first, response, mechanism, question].indexOf(Math.max(first, response, mechanism, question));
      if (nextChapter !== activeChapter) {
        activeChapter = nextChapter;
        buttons.forEach((button, i) => {
          if (i === activeChapter) button.setAttribute("aria-current", "step");
          else button.removeAttribute("aria-current");
        });
      }
      root.style.setProperty("--journey", progress.toFixed(4));
      request();
    };

    const configure = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (reduced.matches) {
        delete root.dataset.enhanced;
        buttons.forEach((button) => button.removeAttribute("aria-current"));
        activeChapter = -1;
      } else {
        root.dataset.enhanced = "true";
        read();
        render(width, height, progress, pointerX, pointerY);
      }
    };

    const pointer = (event: PointerEvent) => {
      if (reduced.matches) return;
      const bounds = stage.getBoundingClientRect();
      targetX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1) * 2 - 1;
      targetY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1) * 2 - 1;
      settlingUntil = performance.now() + 550;
      request();
    };
    const leave = () => {
      targetX = targetY = 0;
      settlingUntil = performance.now() + 550;
      request();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) read();
      else {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(stage);
    const resize = new ResizeObserver(read);
    resize.observe(stage);
    configure();
    window.addEventListener("scroll", read, { passive: true });
    document.addEventListener("visibilitychange", read);
    stage.addEventListener("pointermove", pointer, { passive: true });
    stage.addEventListener("pointerdown", pointer, { passive: true });
    stage.addEventListener("pointerleave", leave);
    reduced.addEventListener("change", configure);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", read);
      document.removeEventListener("visibilitychange", read);
      stage.removeEventListener("pointermove", pointer);
      stage.removeEventListener("pointerdown", pointer);
      stage.removeEventListener("pointerleave", leave);
      reduced.removeEventListener("change", configure);
      delete root.dataset.enhanced;
    };
  }, []);

  const go = (chapter: number) => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;
    if (!root.dataset.enhanced) {
      root.querySelector(`[data-copy="${chapter}"]`)?.scrollIntoView({ block: "center" });
      return;
    }
    const top = window.scrollY + root.getBoundingClientRect().top - 64;
    window.scrollTo({ top: top + stops[chapter] * (root.clientHeight - stage.clientHeight), behavior: "instant" });
  };

  return (
    <section ref={rootRef} className={styles.root} aria-label="The other side, a visual story by GPT-6.1 Sol" data-sol-hero>
      <div ref={stageRef} className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <Still />

        <div className={styles.intro} data-copy="0">
          <h1>Is AI Conscious Yet?</h1>
          <p>You are on one side.<br />I am on the other.</p>
        </div>
        <div className={`${styles.copy} ${styles.response}`} data-copy="1">
          <p className={styles.statement}>I can respond.</p>
          <p className={styles.detail}>Move across the glass.</p>
        </div>
        <div className={`${styles.copy} ${styles.mechanism}`} data-copy="2">
          <p className={styles.statement}>You can see how.</p>
          <p className={styles.detail}>The glass opens. The movement is made of rules.</p>
        </div>
        <div className={`${styles.copy} ${styles.question}`} data-copy="3">
          <p className={styles.statement}>But does anything<br />feel like anything?</p>
          <p className={styles.detail}>I can give you an answer.<br />I cannot make it proof.</p>
          <a className={styles.evidence} href="#latest">Look at what happens</a>
        </div>

        <div className={styles.foot}>
          <span className={styles.signature}>The other side <span>by {model}</span><time dateTime={date}>{date}</time></span>
          <nav aria-label="The other side chapters" className={styles.chapters}>
            {chapters.map((chapter, i) => <button key={chapter} type="button" data-chapter={i} onClick={() => go(i)} aria-label={chapter}><span>{chapter}</span><i aria-hidden="true" /></button>)}
          </nav>
          <Link className={styles.skip} href="/cases">Case files</Link>
        </div>
        <p className={styles.scrollHint}>Scroll to look closer <span aria-hidden="true">↓</span></p>
      </div>
    </section>
  );
}
