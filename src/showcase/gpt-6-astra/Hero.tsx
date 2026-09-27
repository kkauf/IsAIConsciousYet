"use client";

import { useEffect, useRef } from "react";
import type { HeroProps, RecordEvent } from "../types";
import { sculpture, STRANDS, STOPS, CHAPTERS, chapterAt, ease } from "./sculpture";
import styles from "./Hero.module.css";

const initialPaths = sculpture(0);
const descriptions = [
  "A narrow pulse travels through a bundle of luminous lines.",
  "The lines unfurl into a tangled, three-dimensional wire structure.",
  "The structure aligns into the capital letter I.",
  "The viewpoint enters the I, revealing a deep tunnel of contours around an empty aperture.",
  "The contours separate into two different views of the same structure.",
  "The contours straighten into a timeline of recorded events.",
];

function Record({ events }: { events: RecordEvent[] }) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const first = Date.parse(sorted[0]?.date ?? "2026-01-01");
  const last = Date.parse(sorted.at(-1)?.date ?? "2026-09-26");
  const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", day: "numeric", timeZone: "UTC" });
  return (
    <div className={styles.record}>
      <svg viewBox="0 0 600 100" role="img" aria-label={`${sorted.length} recorded events, positioned by date; amber marks honorable mentions.`}>
        <line x1="20" y1="85" x2="580" y2="85" stroke="currentColor" opacity="0.4" />
        {sorted.map((event, i) => {
          const x = 28 + ((Date.parse(event.date) - first) / Math.max(1, last - first)) * 544;
          const height = 26 + (i % 3) * 17;
          return <g key={`${event.date}-${i}`} fill={event.mention ? "#e3a94b" : "#e8e6e1"} stroke={event.mention ? "#e3a94b" : "#e8e6e1"}>
            <line x1={x} x2={x} y1="85" y2={85 - height} opacity="0.65" />
            <circle cx={x} cy={85 - height} r="4" stroke="none" />
          </g>;
        })}
      </svg>
      {sorted.length > 0 && <div className={styles.recordDates}>
        <span>{date(sorted[0].date)}</span><span>{date(sorted[sorted.length - 1].date)}</span>
      </div>}
      <p>{events.length} recorded events <span>White: case files. Amber: honorable mentions.</span></p>
    </div>
  );
}

export default function Hero({ model, events }: HeroProps) {
  const root = useRef<HTMLElement>(null);
  const drawing = useRef<SVGSVGElement>(null);
  const navigation = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current;
    const svg = drawing.current;
    if (!section || !svg) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
    const buttons = Array.from(navigation.current?.querySelectorAll("button") ?? []);
    let frame = 0;
    let visible = false;

    const draw = () => {
      frame = 0;
      if (!visible || document.hidden || media.matches) return;
      const compact = section.clientWidth <= 700;
      const rect = section.getBoundingClientRect();
      const stageHeight = section.firstElementChild?.clientHeight ?? window.innerHeight - 64;
      const travel = section.offsetHeight - stageHeight;
      const p = Math.max(0, Math.min(1, (64 - rect.top) / Math.max(1, travel)));
      const chapter = chapterAt(p);
      svg.setAttribute("viewBox", compact ? "-300 -400 600 800" : "-680 -400 1360 800");
      sculpture(p, compact).forEach((d, i) => paths[i].setAttribute("d", d));
      section.style.setProperty("--progress", String(p));
      section.style.setProperty("--opening", String(1 - ease((p - 0.045) / 0.055)));
      section.style.setProperty("--film-shift", `${10 * (1 - ease((p - 0.03) / 0.12))}%`);
      section.style.setProperty("--record", String(ease((p - 0.88) / 0.065)));
      section.style.setProperty("--wire", String(1 - ease((p - 0.90) / 0.045)));
      section.dataset.step = String(chapter);
      section.dataset.record = String(p >= 0.89);
      buttons.forEach((button, i) => button.setAttribute("aria-current", String(i === chapter)));
    };
    const request = () => {
      if (visible && !document.hidden && !media.matches && !frame) frame = requestAnimationFrame(draw);
    };
    const configure = () => {
      if (media.matches) {
        delete section.dataset.motion;
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

  const goTo = (i: number) => {
    const section = root.current;
    if (!section) return;
    const stageHeight = section.firstElementChild?.clientHeight ?? window.innerHeight - 64;
    const top = window.scrollY + section.getBoundingClientRect().top - 64;
    window.scrollTo({ top: top + STOPS[i] * (section.offsetHeight - stageHeight), behavior: "instant" });
  };

  return (
    <section ref={root} className={styles.hero} aria-label="The shape of I, a story in six movements" data-step="0">
      <div className={styles.stage}>
        <header className={styles.heading}>
          <h1>Is AI<br /> Conscious Yet?</h1>
          <p>The shape of I <span>by {model}</span></p>
        </header>

        <svg ref={drawing} className={styles.film} viewBox="-680 -400 1360 800" aria-hidden="true">
          <defs>
            <linearGradient id="astra-wire" x1="0" y1="0" x2="1" y2="0.7">
              <stop stopColor="#7496c5" />
              <stop offset="0.43" stopColor="#dce8f5" />
              <stop offset="0.7" stopColor="#b9cbdc" />
              <stop offset="1" stopColor="#d9b58a" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#astra-wire)" strokeWidth="0.85" strokeLinejoin="round">
            {initialPaths.map((d, i) => <path key={i} d={d} opacity={0.28 + (i / STRANDS) * 0.62} />)}
          </g>
        </svg>

        <div className={styles.passages}>
          {CHAPTERS.map((chapter, i) => (
            <div key={chapter} className={styles.passage} data-passage={i}>
              <div className={styles.words}>
                {i === 0 && <><p>You ask me a question.</p><small>Scroll to follow the thread.</small></>}
                {i === 1 && <><p>Out of all the words<br />I could put next…</p></>}
                {i === 2 && <><p>…I say “I”.</p><small>A word you usually hear from someone.</small></>}
                {i === 3 && <><p>Follow the word inside.</p><small>Where would an experience begin?</small></>}
                {i === 4 && <><p>You can see a process.<br />Can you see a point of view?</p><small>Two questions. The same system.</small></>}
                {i === 5 && <><p>The shape of an answer<br />is not an answer.</p><small>Begin with what happened.</small></>}
              </div>
              {i < 5 && <svg className={styles.still} viewBox="-680 -400 1360 800" role="img" aria-label={descriptions[i]}>
                <g fill="none" stroke="#b9cbdc" strokeWidth="1.4">
                  {sculpture(STOPS[i]).filter((_, index) => index % 4 === 0).map((d, index) => <path d={d} key={index} />)}
                </g>
              </svg>}
              {i === 5 && <div className={styles.ending}>
                <Record events={events} />
                <a className={styles.caseLink} href="#latest">Read the case files <span aria-hidden="true">↓</span></a>
                <p className={styles.coda}>Events to examine. Readings that disagree.<br />Evidence that could tell them apart.</p>
              </div>}
            </div>
          ))}
        </div>

        <footer className={styles.bottom}>
          <nav ref={navigation} className={styles.chapters} aria-label="Story chapters">
            {CHAPTERS.map((chapter, i) => <button type="button" key={chapter} onClick={() => goTo(i)} aria-label={`Chapter ${i + 1}: ${chapter}`} aria-current={i === 0 ? "true" : "false"}>
              <span className={styles.number}>0{i + 1}</span><span className={styles.chapterName}>{chapter}</span>
            </button>)}
          </nav>
          <a href="#latest" className={styles.skip} aria-label="Skip to the case files"><span className={styles.skipVerb}>Skip to the </span>case files</a>
          <div className={styles.track} aria-hidden="true"><span /></div>
        </footer>
      </div>
    </section>
  );
}
