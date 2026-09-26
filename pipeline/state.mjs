// Config, committed state (pipeline/state/) and the monthly spend cap for the scheduled run.
// Design: docs/pipeline.md § Storage and runtime. No API calls here.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const p = (...a) => path.join(root, ...a);
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 2) + '\n');

export const loadConfig = () => readJson(p('pipeline', 'config.json'));

// ── spend: USD per calendar month (UTC), summed from each automated run's ledger ──

export const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
export const loadSpend = () => readJson(p('pipeline', 'state', 'spend.json'));
export const saveSpend = (s) => writeJson(p('pipeline', 'state', 'spend.json'), s);
export function monthToDate(spend, month = monthKey()) {
  return spend.months[month]?.usd ?? 0;
}
export function addSpend(spend, usd, month = monthKey()) {
  const m = (spend.months[month] ??= { usd: 0, runs: 0 });
  m.usd = Number((m.usd + usd).toFixed(4));
  return spend;
}

// Returns null when the step fits under the cap, else the reason it does not.
export function capCheck({ config, spentBefore, spentThisRun, estimate, step }) {
  const would = spentBefore + spentThisRun + estimate;
  if (would <= config.monthlyCapUsd) return null;
  return `${step} skipped: month-to-date $${(spentBefore + spentThisRun).toFixed(2)} + worst case $${estimate.toFixed(2)} would exceed the $${config.monthlyCapUsd} monthly cap`;
}

// ── candidates: every candidate ever seen, so later runs dedupe ──

export const loadCandidates = () => readJson(p('pipeline', 'state', 'candidates.json'));
export const saveCandidates = (c) => writeJson(p('pipeline', 'state', 'candidates.json'), c);

// URL identity for dedupe: scheme, www, trailing slash, fragment and tracking parameters do not count.
export function urlKey(u) {
  try {
    const x = new URL(u.trim());
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|ref$|source$)/.test(k)) x.searchParams.delete(k);
    return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/+$/, '')}${x.search}`.toLowerCase();
  } catch { return u.trim().toLowerCase(); }
}

// ── what is already known: case files and seeds ──

export function loadCases() {
  const dir = p('content', 'cases');
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(dir, f)));
}
export function loadSeeds() {
  const dir = p('pipeline', 'seeds');
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ file: path.join('pipeline', 'seeds', f), ...readJson(path.join(dir, f)) }));
}
export function writeSeed(seed) {
  const f = p('pipeline', 'seeds', `${seed.slug}.json`);
  writeJson(f, seed);
  return path.relative(root, f);
}
export const seedExists = (slug) => existsSync(p('pipeline', 'seeds', `${slug}.json`)) || existsSync(p('content', 'cases', `${slug}.json`));
