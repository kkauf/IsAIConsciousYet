// The image on each X post: a square card, 1080 x 1080, in one of three variants. Design: docs/social-posting.md.
//   A  grim: one sentence from a named party, the party and month above it, a bone line below.
//   B  prism: the same, with the eye watching; colour only on the eye and the line, never on the quote.
//   C  hold both: two named parties, one line each, the eye on the seam between them, grey on one side, prism on the other.
// No web address, handle or logo on the card. Rendered with the renderer the site's OG images use (next/og).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './state.mjs';

const require = createRequire(path.join(root, 'package.json'));
const { ImageResponse } = require('next/dist/compiled/@vercel/og/index.node.js');
const h = require('react').createElement;

export const VARIANTS = ['A', 'B', 'C'];
const BONE = '#ece8e1', ASH = '#a29e97';
// The seven prism hues of src/app/globals.css (--p1 … --p7, oklch(0.8 0.11 h)) as sRGB, since the renderer has no oklch.
const P = ['#fda1a0', '#efaf6f', '#c2c46e', '#89d298', '#57d4d4', '#7fc5ff', '#c8aefa'];
const S = 1080;
const fonts = () => [
  { name: 'Newsreader', data: readFileSync(path.join(root, 'src/assets/Newsreader-Light-72.ttf')), weight: 300, style: 'normal' },
  { name: 'Public Sans', data: readFileSync(path.join(root, 'src/assets/PublicSans-Regular.ttf')), weight: 400, style: 'normal' },
];

const eye = (size, prism) => h('svg', { width: size, height: size * 0.5, viewBox: '4 16 56 32' },
  h('defs', {}, h('linearGradient', { id: 'g', x1: '0', y1: '0', x2: '1', y2: '1' }, ...P.map((c, i) => h('stop', { key: i, offset: `${i / 6}`, stopColor: c })))),
  h('path', { d: 'M 8 32 Q 32 14, 56 32 Q 32 50, 8 32 Z', stroke: BONE, strokeWidth: 1.2, fill: 'none' }),
  h('circle', { cx: 32, cy: 32, r: 8, stroke: prism ? 'url(#g)' : BONE, strokeWidth: prism ? 2.4 : 1.2, fill: 'none' }),
  h('circle', { cx: 32, cy: 32, r: 3.2, fill: prism ? 'url(#g)' : BONE }));
const line = (prism) => h('div', { style: { display: 'flex', height: 2, width: '100%', background: prism ? `linear-gradient(90deg, ${P.join(', ')})` : BONE, opacity: prism ? 0.9 : 0.35 } });
// Long sentences get a smaller size so every card keeps the same weight of text.
const size = (q, big) => (q.length < 70 ? big : q.length < 110 ? big * 0.85 : q.length < 160 ? big * 0.72 : big * 0.6);

function single({ source, quote }, prism) {
  return h('div', { style: { width: '100%', height: '100%', background: '#000', color: BONE, display: 'flex', flexDirection: 'column', padding: 90, fontFamily: 'Public Sans' } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 60 } },
      h('div', { style: { fontSize: 28, color: ASH } }, source), prism ? eye(120, true) : null),
    h('div', { style: { fontFamily: 'Newsreader', fontSize: size(quote, 96), lineHeight: 1.05, letterSpacing: '-0.02em', marginTop: 'auto', marginBottom: 'auto' } }, `“${quote}”`),
    line(prism));
}

function pair({ left, right }) {
  const half = ({ source, quote }, end) => h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: end ? 'flex-end' : 'flex-start' } },
    h('div', { style: { fontFamily: 'Newsreader', fontSize: size(quote, 70), lineHeight: 1.06, letterSpacing: '-0.015em', textAlign: end ? 'right' : 'left' } }, `“${quote}”`),
    h('div', { style: { fontSize: 26, color: ASH, marginTop: 22 } }, source));
  return h('div', { style: { width: '100%', height: '100%', background: '#000', color: BONE, display: 'flex', flexDirection: 'column', padding: '80px 90px', fontFamily: 'Public Sans' } },
    half(left, false),
    h('div', { style: { display: 'flex', alignItems: 'center' } },
      h('div', { style: { display: 'flex', flex: 1 } }, line(false)), h('div', { style: { display: 'flex', margin: '0 28px' } }, eye(150, true)), h('div', { style: { display: 'flex', flex: 1 } }, line(true))),
    half(right, true));
}

// variant 'A' | 'B': { source, quote }; 'C': { left: { source, quote }, right: { source, quote } }. Returns a PNG buffer.
export async function renderCard(variant, data) {
  const el = variant === 'C' ? pair(data) : single(data, variant === 'B');
  const img = new ImageResponse(el, { width: S, height: S, fonts: fonts() });
  return Buffer.from(await img.arrayBuffer());
}
