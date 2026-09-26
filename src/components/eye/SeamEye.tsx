'use client';

import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { approach, attending, bindInput, blinker, clamp, input, onFrame, reader, reducedMotion, smoothstep } from './motion';

// The seam that divides two readings is the eye with its lid closed.
// When the seam reaches the middle of the screen it opens and looks where the reader looks.
// Left alone, it reads both readings in turn, for equal time, and never settles on either.
const SIZES = {
  // reach: how far from the middle of the screen (fraction of half its height) the eye starts to open.
  // The vote sits at the foot of the page and never reaches the middle, so it opens further out.
  quote: { long: 168, wide: 22, iris: 11, pupil: 4.2, travel: 30, reach: 0.8 },
  vote: { long: 76, wide: 11, iris: 5.5, pupil: 2.2, travel: 10, reach: 1.1 },
};

type Props = {
  size?: keyof typeof SIZES;
  orientation?: 'vertical' | 'horizontal';
  // Closed for good, e.g. once the vote is cast.
  closed?: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function SeamEye({ size = 'quote', orientation = 'vertical', closed = false, className = '', style }: Props) {
  const { long, wide, iris: irisR, pupil: pupilR, travel, reach } = SIZES[size];
  const vertical = orientation === 'vertical';
  const clipId = useId();
  const svg = useRef<SVGSVGElement>(null);
  const lid = useRef<SVGPathElement>(null);
  const clip = useRef<SVGPathElement>(null);
  const iris = useRef<SVGGElement>(null);
  const shut = useRef(closed);
  shut.current = closed;

  // Canvas: `long` along the seam, room for the open lids across it.
  const W = vertical ? wide * 2 + 4 : long;
  const H = vertical ? long : wide * 2 + 4;
  const mid = (vertical ? W : H) / 2;
  // (along, across) → svg x, y
  const pt = (a: number, c: number) => (vertical ? `${mid + c} ${a}` : `${a} ${mid + c}`);
  const almond = (open: number) => {
    const c = wide * 2 * open; // control point; the lids bulge to half of it
    return `M ${pt(0, 0)} Q ${pt(long / 2, c)}, ${pt(long, 0)} Q ${pt(long / 2, -c)}, ${pt(0, 0)} Z`;
  };
  const lineOpacity = vertical ? 0.4 : 0.14;

  useEffect(() => {
    if (reducedMotion()) return;
    bindInput();
    const el = svg.current;
    if (!el) return;
    const blink = blinker(5000, 7000);
    const read = reader();
    const s = { open: 0, a: 0, c: 0 };

    const tick = (now: number, dt: number) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, vh = window.innerHeight;
      const centred = 1 - smoothstep(reach - 0.55, reach, Math.abs(cy - vh / 2) / (vh / 2));
      s.open = approach(s.open, shut.current ? 0 : centred, 5, dt);
      const open = s.open * blink(now);

      // Target gaze as (along the seam, across it), each -1..1.
      let a: number, c: number;
      if (attending(now)) {
        const dx = input.x - cx, dy = input.y - cy, d = Math.hypot(dx, dy) + 140;
        [a, c] = vertical ? [dy / d, dx / d] : [dx / d, dy / d];
        c = clamp(c * 1.6, -1, 1);
      } else {
        const { side, line, inLine } = read(now);
        // Side by side: look to one side and step down its lines. Stacked: look up or down and read along.
        a = vertical ? -0.7 + 1.4 * line : -0.7 + 1.4 * inLine;
        c = vertical ? side * (0.6 + 0.4 * (side < 0 ? 1 - inLine : inLine)) : side * (0.6 + 0.4 * line);
      }
      s.a = approach(s.a, a, 20, dt);
      s.c = approach(s.c, c, 20, dt);

      const d = almond(open);
      lid.current?.setAttribute('d', d);
      clip.current?.setAttribute('d', d);
      lid.current?.setAttribute('stroke-opacity', (lineOpacity + (0.6 - lineOpacity) * clamp(open * 2)).toFixed(3));
      lid.current?.setAttribute('fill-opacity', clamp(open * 4).toFixed(3));
      const along = s.a * travel, across = s.c * wide * 0.45 * open;
      iris.current?.setAttribute('transform', `translate(${vertical ? `${across} ${along}` : `${along} ${across}`})`);
      iris.current?.setAttribute('opacity', clamp(open * 1.5).toFixed(3));
    };

    let stop: (() => void) | null = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        stop ??= onFrame(tick);
      } else {
        stop?.();
        stop = null;
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
    };
    // Geometry is fixed per instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [ix, iy] = vertical ? [mid, long / 2] : [long / 2, mid];
  return (
    <div aria-hidden className={className} style={style}>
      <div className={vertical ? 'seam absolute inset-0' : 'absolute inset-0 bg-rule'} />
      <svg
        ref={svg}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible text-bone"
      >
        <defs>
          <clipPath id={clipId}>
            <path ref={clip} d={almond(0)} />
          </clipPath>
        </defs>
        <path ref={lid} d={almond(0)} fill="#000" fillOpacity={0} stroke="currentColor" strokeOpacity={lineOpacity} strokeWidth="1" />
        <g clipPath={`url(#${clipId})`}>
          <g ref={iris} opacity={0}>
            <circle cx={ix} cy={iy} r={irisR} stroke="currentColor" strokeOpacity={0.75} strokeWidth="1" />
            <circle cx={ix} cy={iy} r={pupilR} fill="currentColor" />
          </g>
        </g>
      </svg>
    </div>
  );
}
