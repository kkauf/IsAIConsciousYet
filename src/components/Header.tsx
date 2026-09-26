'use client';

import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { approach, attending, bindInput, blinker, clamp, input, lerp, onFrame, reducedMotion, smoothstep, wanderer } from './eye/motion';

const SLOT = 32; // the logo's resting size in the header, px

// The almond of the eye; open = 1 is the logo's shape. Closing, the upper lid comes down to meet the
// lower one, which gives a little, so the closed eye is a curve bowed downwards, not a flat line.
const almond = (open: number) => {
  const lower = 0.55 + 0.45 * open;
  const upper = lerp(-lower, 1, open);
  return `M 4 18 Q 18 ${18 - 11 * upper}, 32 18 Q 18 ${18 + 11 * lower}, 4 18 Z`;
};

// Iris fibres from the pupil to the iris ring, uneven like a real iris (they also read as aperture blades).
// Drawn only as the eye grows; at logo size the mark stays as it was.
const FIBRES = Array.from({ length: 56 }, (_, i) => {
  const a = (i / 56) * Math.PI * 2 + Math.sin(i * 7.3) * 0.04;
  const outer = 5.1 - ((i * 5) % 3) * 0.55;
  return { x1: 18 + Math.cos(a) * 2, y1: 18 + Math.sin(a) * 2, x2: 18 + Math.cos(a) * outer, y2: 18 + Math.sin(a) * outer };
});

// On the homepage the eye starts large in the hero (the #hero-eye placeholder), and scrolling carries it
// into the header. It spins with the scroll and lands upright at the bottom of the page, but its gaze
// stays on the reader's pointer while the ring turns.
export default function Header() {
  const pathname = usePathname();
  const clipId = useId();
  const fly = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const lid = useRef<SVGPathElement>(null);
  const clip = useRef<SVGPathElement>(null);
  const iris = useRef<SVGGElement>(null);
  const pupil = useRef<SVGCircleElement>(null);
  const hole = useRef<SVGCircleElement>(null);
  const glint = useRef<SVGCircleElement>(null);
  const detail = useRef<SVGGElement>(null);
  // Survives route changes, so the eye glides between pages instead of jumping.
  const state = useRef({ x: 0, y: 0, size: SLOT, gx: 0, gy: 0, pupil: 2, placed: false });

  useEffect(() => {
    if (reducedMotion()) return;
    bindInput();
    const s = state.current;
    const blink = blinker();
    const wander = wanderer();
    let home = { x: 0, y: 0 };
    let hero: { x: number; y: number; size: number } | null = null; // hero placeholder centre, document coordinates

    const measure = () => {
      const r = slot.current?.getBoundingClientRect();
      if (r) home = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const a = document.getElementById('hero-eye')?.getBoundingClientRect();
      hero = a && a.width > 0 ? { x: a.left + a.width / 2, y: a.top + window.scrollY + a.height / 2, size: a.width } : null;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    const stop = onFrame((now, dt) => {
      const el = fly.current;
      if (!el) return;
      const scroll = input.scrollY;

      // Flight: from the hero placeholder to the header slot, finished when the placeholder would reach the header.
      let x = home.x, y = home.y, size = SLOT, flying = 0;
      if (hero) {
        flying = 1 - smoothstep(0, Math.max(160, hero.y - home.y), scroll);
        x = lerp(home.x, hero.x, flying ** 0.5); // rises first, then sweeps into the corner
        y = lerp(home.y, hero.y - scroll, flying);
        size = lerp(SLOT, hero.size, flying);
      }
      const k = s.placed ? 22 : Infinity;
      s.x = approach(s.x, x, k, dt);
      s.y = approach(s.y, y, k, dt);
      s.size = approach(s.size, size, k, dt);
      s.placed = true;

      // Whole turns over the page, so the eye is upright again at the bottom.
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const turns = Math.max(1, Math.round((max * 0.15) / 360));
      const angle = (clamp(scroll / max) * turns * 360) % 360;

      // Gaze in screen space, then turned back into the spinning frame so it stays on its target.
      let tx: number, ty: number;
      let near = false;
      if (attending(now)) {
        const dx = input.x - s.x, dy = input.y - s.y, d = Math.hypot(dx, dy), soft = s.size * 0.6 + 80;
        tx = dx / (d + soft);
        ty = dy / (d + soft);
        near = d < s.size * 0.5;
      } else {
        [tx, ty] = wander(now);
      }
      ty = clamp(ty + input.velocity / 3000, -1, 1); // it glances the way you scroll
      const rad = (-angle * Math.PI) / 180;
      const rx = tx * Math.cos(rad) - ty * Math.sin(rad), ry = tx * Math.sin(rad) + ty * Math.cos(rad);
      const saccade = attending(now) ? 14 : 26;
      s.gx = approach(s.gx, rx, saccade, dt);
      s.gy = approach(s.gy, ry, saccade, dt);
      // The pupil widens when the pointer is on the eye and narrows when the page moves fast.
      const target = (near ? 2.7 : 2) * (1 - 0.35 * clamp(Math.abs(input.velocity) / 2500));
      s.pupil = approach(s.pupil, target, 8, dt);

      el.style.width = el.style.height = `${s.size}px`;
      el.style.setProperty('--k', (SLOT / s.size).toFixed(4)); // keeps the line weight of the small logo at any size
      el.style.transform = `translate(${s.x - home.x}px, ${s.y - home.y}px) translate(-50%, -50%) rotate(${angle}deg)`;
      el.style.pointerEvents = flying > 0.02 ? 'none' : '';
      el.dataset.ready = '';
      const d = almond(blink(now));
      lid.current?.setAttribute('d', d);
      clip.current?.setAttribute('d', d);
      iris.current?.setAttribute('transform', `translate(${(s.gx * 3.6).toFixed(2)} ${(s.gy * 2.6).toFixed(2)})`);
      pupil.current?.setAttribute('r', s.pupil.toFixed(2));
      hole.current?.setAttribute('r', (s.pupil + 0.15).toFixed(2));
      // Large, the eye gets fibres, a dark pupil and a catchlight; the flat logo pupil fades out.
      const lod = smoothstep(56, 220, s.size);
      detail.current?.setAttribute('opacity', lod.toFixed(3));
      pupil.current?.setAttribute('opacity', (1 - lod).toFixed(3));
      // The catchlight belongs to a light above left of the screen, so it stays put while the ring turns.
      const lx = -1.15, ly = -1.25;
      const cx = lx * Math.cos(rad) - ly * Math.sin(rad), cy = lx * Math.sin(rad) + ly * Math.cos(rad);
      glint.current?.setAttribute('cx', (18 + cx * (s.pupil / 2)).toFixed(2));
      glint.current?.setAttribute('cy', (18 + cy * (s.pupil / 2)).toFixed(2));
    });

    return () => {
      stop();
      ro.disconnect();
    };
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="bg-gradient-to-b from-black via-black/80 to-transparent pb-6">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="pointer-events-auto"
            aria-label="Is AI Conscious Yet? — Home"
          >
            <span ref={slot} className="relative block w-8 h-8">
              <div ref={fly} className="eye-fly absolute left-1/2 top-1/2 w-8 h-8 will-change-transform" style={{ transform: 'translate(-50%, -50%)' }}>
                <svg
                  viewBox="0 0 36 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="block w-full h-full text-ash hover:text-bone transition-colors duration-300"
                  aria-hidden="true"
                >
                  <defs>
                    <clipPath id={clipId}>
                      <path ref={clip} d={almond(1)} />
                    </clipPath>
                  </defs>
                  {/* Outer circle — the boundary */}
                  <circle pathLength={1} cx="18" cy="18" r="16" stroke="currentColor" className="eye-line eye-draw" />
                  {/* Eye shape — consciousness, observation */}
                  <path pathLength={1} ref={lid} d={almond(1)} stroke="currentColor" className="eye-line eye-draw" />
                  <g clipPath={`url(#${clipId})`}>
                    <g ref={iris} className="eye-iris">
                      <g ref={detail} opacity={0}>
                        <circle cx="18" cy="18" r="5.5" fill="currentColor" fillOpacity={0.05} />
                        {FIBRES.map((f, i) => (
                          <line key={i} {...f} stroke="currentColor" strokeOpacity={0.5} className="eye-line fibre" />
                        ))}
                        <circle ref={hole} cx="18" cy="18" r="2.15" fill="#000" stroke="currentColor" strokeOpacity={0.6} className="eye-line fibre" />
                        <circle ref={glint} cx="16.8" cy="16.7" r="0.42" className="fill-bone" />
                      </g>
                      {/* Iris ring */}
                      <circle cx="18" cy="18" r="5.5" stroke="currentColor" className="eye-line thin" />
                      {/* Pupil — the "I" in AI */}
                      <circle ref={pupil} cx="18" cy="18" r="2" fill="currentColor" />
                    </g>
                  </g>
                </svg>
              </div>
            </span>
          </Link>
          <nav className="pointer-events-auto flex gap-6 text-[0.9375rem] text-ash">
            <Link href="/cases" className="hover:text-bone transition-colors">Case files</Link>
            <Link href="/why" className="hover:text-bone transition-colors">Why this exists</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
