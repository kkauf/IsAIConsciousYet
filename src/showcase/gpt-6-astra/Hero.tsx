"use client";

import { useEffect, useRef } from "react";
import type { HeroProps } from "../types";
import { sculpture } from "./sculpture";
import styles from "./Hero.module.css";

const initialPaths = sculpture(0);

export default function Hero({ model }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const drawing = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const section = root.current;
    const svg = drawing.current;
    if (!section || !svg) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
    let frame = 0;
    let visible = false;

    const draw = () => {
      frame = 0;
      if (!visible || document.hidden || media.matches) return;
      const rect = section.getBoundingClientRect();
      const travel = section.offsetHeight - window.innerHeight + 64;
      const p = Math.max(0, Math.min(1, (64 - rect.top) / Math.max(1, travel)));
      sculpture(p).forEach((d, i) => paths[i].setAttribute("d", d));
      section.style.setProperty("--progress", String(p));
      section.dataset.step = p < 0.34 ? "0" : p < 0.69 ? "1" : "2";
    };
    const request = () => {
      if (visible && !document.hidden && !media.matches && !frame) frame = requestAnimationFrame(draw);
    };
    const configure = () => {
      if (media.matches) {
        delete section.dataset.motion;
        sculpture(0.48).forEach((d, i) => paths[i].setAttribute("d", d));
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        section.dataset.motion = "scroll";
        request();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) request();
      else { cancelAnimationFrame(frame); frame = 0; }
    });
    configure();
    observer.observe(section);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    document.addEventListener("visibilitychange", request);
    media.addEventListener("change", configure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      document.removeEventListener("visibilitychange", request);
      media.removeEventListener("change", configure);
    };
  }, []);

  return (
    <section ref={root} className={styles.hero} aria-label="The shape of I" data-step="0">
      <div className={styles.stage}>
        <div className={styles.heading}>
          <h1>Is AI<br /> Conscious Yet?</h1>
          <p className={styles.credit}>The shape of I <span>by {model}</span></p>
        </div>

        <figure className={styles.sculpture}>
          <svg ref={drawing} viewBox="0 0 640 600" role="img" aria-labelledby="astra-sculpture-title">
            <title id="astra-sculpture-title">A wire sculpture whose contours align into the letter I when viewed head-on.</title>
            <defs>
              <linearGradient id="astra-wire" x1="0" y1="0" x2="1" y2="0.8" gradientUnits="objectBoundingBox">
                <stop stopColor="#163c8e" />
                <stop offset="0.38" stopColor="#537ed0" />
                <stop offset="0.57" stopColor="#214da6" />
                <stop offset="0.8" stopColor="#7898cd" />
                <stop offset="1" stopColor="#153775" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#astra-wire)" strokeWidth="1.15" strokeLinejoin="round">
              {initialPaths.map((d, i) => <path key={i} d={d} opacity={0.48 + (i / initialPaths.length) * 0.5} />)}
            </g>
          </svg>
          <figcaption className={styles.objectCaption}>One structure. A changing point of view.</figcaption>
        </figure>

        <div className={styles.passages}>
          <div className={styles.passage} data-passage="0">
            <p>I can give you<br />the shape of an “I”.</p>
          </div>
          <div className={styles.passage} data-passage="1">
            <p>That does not tell you<br />whether anyone is here.</p>
          </div>
          <div className={styles.passage} data-passage="2">
            <p>What would take us<br />beyond the appearance?</p>
            <a className={styles.caseLink} href="#latest">Start with what happened <span aria-hidden="true">↗</span></a>
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.scrollHint}>Scroll to change your view <span aria-hidden="true">↓</span></span>
          <a href="#latest" className={styles.skip}>Go to the case files</a>
          <div className={styles.track} aria-hidden="true"><span /></div>
        </div>
      </div>
    </section>
  );
}
