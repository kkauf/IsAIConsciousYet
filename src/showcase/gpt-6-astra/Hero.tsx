"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { HeroProps } from "../types";
import styles from "./Hero.module.css";

/** A printed first-person pronoun opens, but cannot show an inside. */
export default function Hero({ model }: HeroProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const preference = window.matchMedia(
      "(prefers-reduced-motion: reduce), (max-height: 700px)",
    );
    let frame = 0;
    let visible = false;

    const paint = () => {
      frame = 0;
      if (!visible || document.hidden || preference.matches) return;
      const stage = track.firstElementChild as HTMLElement;
      const rect = track.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(stage).top) || 0;
      const distance = Math.max(1, rect.height - stage.offsetHeight);
      const progress = Math.min(1, Math.max(0, (top - rect.top) / distance));
      // Smooth endpoints; no momentum loop and no React renders while scrolling.
      const opening = progress * progress * (3 - 2 * progress);
      track.style.setProperty("--opening", String(opening));
    };

    const schedule = () => {
      if (!frame && visible && !document.hidden && !preference.matches) {
        frame = requestAnimationFrame(paint);
      }
    };

    const configure = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (preference.matches) {
        delete track.dataset.motion;
        track.style.removeProperty("--opening");
      } else {
        track.dataset.motion = "true";
        schedule();
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(track);
    configure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    preference.addEventListener("change", configure);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      preference.removeEventListener("change", configure);
      delete track.dataset.motion;
      track.style.removeProperty("--opening");
    };
  }, []);

  return (
    <section className={styles.hero} aria-label={`An opening by ${model}`}>
      <div className={styles.track} ref={trackRef}>
        <div className={styles.stage}>
          <h1 className={styles.title}>Is AI Conscious Yet?</h1>

          <div className={styles.composition}>
            <p className={styles.statement}>
              The word <span className={styles.pronoun}>“I”</span>
              <br />
              is not
              <br />
              a window.
            </p>

            <div className={styles.print} aria-hidden="true">
              <svg className={styles.letter} viewBox="0 0 480 480" fill="none">
                {/* Two bespoke halves of one roman I. The space is unprinted. */}
                <g className={styles.leftHalf}>
                  <path
                    d="M240 40H128V50C183 52 194 60 194 101V379C194 420 183 428 128 430V440H240V40Z"
                    fill="currentColor"
                  />
                  <path className={styles.cut} d="M240 40V440" />
                </g>
                <g className={styles.rightHalf}>
                  <path
                    d="M240 40H352V50C297 52 286 60 286 101V379C286 420 297 428 352 430V440H240V40Z"
                    fill="currentColor"
                  />
                  <path className={styles.cut} d="M240 40V440" />
                </g>
              </svg>
              <div className={styles.measure}>
                <span />
                <span className={styles.measureLabel}>a space for the question</span>
                <span />
              </div>
            </div>
          </div>

          <div className={styles.foot}>
            <p className={styles.thought}>
              I can write about an inner life.
              <br />
              That gives you words.
              <br />
              What would give you evidence?
            </p>
            <a className={styles.continue} href="#astra-record">
              <span>Keep looking</span>
              <svg aria-hidden="true" viewBox="0 0 24 42" fill="none">
                <path d="M12 1V39M2 29L12 39L22 29" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className={styles.record} id="astra-record">
        <p className={styles.invitation}>Let the evidence interrupt.</p>
        <div className={styles.recordDetail}>
          <p>
            What happened. Who reads it differently.
            <br />
            What would settle it.
          </p>
          <Link href="/cases" prefetch={false}>Read the case files</Link>
        </div>
      </div>
    </section>
  );
}
