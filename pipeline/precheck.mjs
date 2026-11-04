// Pre-check of a queued seed before its research is paid for (docs/pipeline.md § Scheduled run, "Pre-check").
// One Jev call on the seed text: is this a prominent event that outlets would cover with outside experts' quotes?
// Code skips the case below PRECHECK_THRESHOLD (status `prechecked-out`). Built 2026-11-04 (KK, 2026-11-04).
//
// Calibration (2026-11-04, 99 finished candidates of Sep–Nov 2026, scores stable over two replays):
//   threshold 0.5 keeps 19/19 published case files and 25/40 honorable mentions, and skips 25/40 parked events.
//   Published scored 0.54–0.82. Questions that scored no better than chance (AUC 0.3–0.55): "two named parties
//   likely", "first-hand source named", "likely to survive the quote checks", "nature of the system", "controversy".
// Replay: pipeline/run.sh precheck.mjs --calibrate [--threshold 0.5]

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jev, ledgerTotal } from './lib.mjs';

export const PRECHECK_THRESHOLD = 0.5;

const QUESTIONS = {
  prominent: { type: 'noul', instructions: 'Is `event` a prominent incident or finding that news outlets would cover with quotes from outside experts?' },
};

export async function precheck(seed, candidate = {}) {
  const state = { event: seed.event, operator: candidate.operator ?? '', event_date: candidate.date ?? '', detected: candidate.firstSeen ?? '', hint_urls: seed.hintUrls ?? [] };
  const a = await jev('precheck', state, QUESTIONS);
  const p = Number(a.prominent.noul.toFixed(3));
  return { p, pass: p >= PRECHECK_THRESHOLD, reason: `pre-check: prominence p=${p.toFixed(2)} < ${PRECHECK_THRESHOLD}, unlikely to find two named readings` };
}

// ── calibration on history: confusion table of the threshold against final outcomes ──
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain && process.argv.includes('--calibrate')) {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined);
  const t = Number(arg('--threshold') ?? PRECHECK_THRESHOLD);
  const { candidates } = JSON.parse(readFileSync(arg('--state') ?? path.join(root, 'pipeline', 'state', 'candidates.json'), 'utf8'));
  const done = candidates.filter((c) => c.route === 'new' && ['published', 'mention', 'parked'].includes(c.status));
  const rows = [];
  for (const c of done) {
    const f = path.join(root, 'pipeline', 'seeds', `${c.seed}.json`);
    const seed = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { event: c.description, hintUrls: c.hintUrls };
    rows.push({ seed: c.seed, status: c.status, ...(await precheck(seed, c)) });
  }
  for (const s of ['published', 'mention', 'parked']) {
    const g = rows.filter((r) => r.status === s);
    console.log(`${s}: ${g.filter((r) => r.p >= t).length}/${g.length} kept at ${t}; scores ${g.map((r) => r.p.toFixed(2)).sort().join(' ')}`);
  }
  console.log('cost', ledgerTotal());
}
