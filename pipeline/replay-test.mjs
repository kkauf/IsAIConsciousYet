// Model-switch replay test (method: docs/pipeline.md § Model switch).
// Replays the cached runs in pipeline/runs/<slug>/ with --reuse-research: no published file is carried
// forward (content/cases/<slug>.json is moved aside during the run and restored after), Wayback is stubbed.
// Models come from env SELECT_MODEL / DRAFT_MODEL as in run-case.mjs.
//
//   DRAFT_MODEL=anthropic/claude-haiku-5.5 pipeline/run.sh replay-test.mjs --label haiku
//   DRAFT_MODEL=... pipeline/run.sh replay-test.mjs --label haiku --compare baseline --run --cap 3   (run with a spend cap, then compare)
//   pipeline/run.sh replay-test.mjs --label haiku --compare baseline      (summary only, no calls)
//   DRAFT_MODEL=anthropic/claude-haiku-5.5 pipeline/run.sh replay-test.mjs --probe   (one tiny call: route + ZDR check)
// Output: pipeline/runs/_replay/<label>/<slug>.json (report + case file) and summary.json.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const SLUGS = [
  '2026-04-claude-mythos-psychiatric-assessment', '2026-05-google-gemini-ctf-access', '2026-07-anthropic-cyber-eval-incidents', // gitleaks:allow (case slugs, not a key)
  '2026-07-anthropic-global-workspace', '2026-07-openai-astra-persona', '2026-07-openai-hugging-face',
  '2026-08-agents-email-consciousness-researchers', '2026-08-aisi-fake-identities', '2026-09-openai-sol-concealment-notes',
];
const slugs = opt('--only') ? opt('--only').split(',') : SLUGS;

if (args.includes('--probe')) {
  const { gemini, ledger } = await import('./lib.mjs');
  const out = await gemini('draft', { system: 'You answer in JSON.', prompt: 'Return {"ok": true}.', schema: { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } } } });
  console.log('probe ok', JSON.stringify(out), JSON.stringify(ledger));
  process.exit(0);
}

// Wayback stub: every web.archive.org / archive.org request fails fast, so waybackSnapshot returns null.
const STUB = `data:text/javascript,${encodeURIComponent("const f=globalThis.fetch;globalThis.fetch=(u,i)=>/(^|\\/\\/)(web\\.)?archive\\.org\\//.test(String(u?.url??u))?Promise.resolve(new Response('',{status:503})):f(u,i);")}`;

function summarise(dir) {
  const rows = {};
  for (const slug of slugs) {
    const f = path.join(dir, `${slug}.json`);
    if (!existsSync(f)) continue;
    const { report, caseFile, exit } = JSON.parse(readFileSync(f, 'utf8'));
    const calls = (report?.cost?.ledger ?? []).filter((l) => l.provider === 'openrouter' || l.provider === 'gemini');
    const kept = (report?.sources ?? []).filter((s) => !s.dropped && !s.error);
    rows[slug] = {
      exit,
      verdict: caseFile ? caseFile.status : 'no case file',
      tier: caseFile?.tier ?? null,
      keptQuotes: kept.length,
      keptReadings: kept.filter((s) => s.kind === 'reading').length,
      parkReasons: report?.parkReasons ?? [],
      neutrality: report?.gates?.neutrality?.flagged ?? null,
      modelUsd: Number(calls.reduce((a, l) => a + l.usd, 0).toFixed(4)),
      inTok: calls.reduce((a, l) => a + (l.inTok ?? 0), 0),
      outTok: calls.reduce((a, l) => a + (l.outTok ?? 0), 0),
      models: [...new Set(calls.map((l) => l.model).filter(Boolean))],
    };
  }
  return rows;
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };

const label = opt('--label') ?? 'run';
const outDir = path.join(root, 'pipeline', 'runs', '_replay', label);

if (!opt('--compare') || args.includes('--run')) {
  mkdirSync(outDir, { recursive: true });
  const queue = [...slugs];
  const runOne = (slug) => new Promise((resolve) => {
    const pub = path.join(root, 'content', 'cases', `${slug}.json`);
    const aside = `${pub}.replay-aside`;
    if (existsSync(pub)) renameSync(pub, aside);
    const child = spawn(process.execPath, ['--import', STUB, path.join(root, 'pipeline', 'run-case.mjs'), path.join(root, 'pipeline', 'seeds', `${slug}.json`), '--reuse-research'], { cwd: root, env: process.env });
    let log = '';
    child.stdout.on('data', (d) => (log += d)); child.stderr.on('data', (d) => (log += d));
    child.on('close', (exit) => {
      // Restore: a file this run wrote is removed, the published one goes back byte for byte.
      if (existsSync(pub)) rmSync(pub);
      if (existsSync(aside)) renameSync(aside, pub);
      const runDir = path.join(root, 'pipeline', 'runs', slug);
      const read = (n) => (existsSync(path.join(runDir, n)) ? JSON.parse(readFileSync(path.join(runDir, n), 'utf8')) : null);
      const report = read('report.json');
      const fresh = report && report.startedAt >= started;
      const caseFile = fresh ? read('case-file.json') : null;
      rmSync(path.join(runDir, 'case-file.json'), { force: true });
      writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify({ exit, report: fresh ? report : null, caseFile, log }, null, 2));
      console.log(`${slug}: exit ${exit}, ${caseFile ? `${caseFile.status}/${caseFile.tier}` : 'no case file'}`);
      resolve();
    });
  });
  const started = new Date().toISOString();
  // --cap <usd>: no new case starts once this label's model spend reaches the cap (running cases finish).
  const cap = Number(opt('--cap') ?? Infinity);
  const spent = () => Object.values(summarise(outDir)).reduce((a, r) => a + r.modelUsd, 0);
  await Promise.all(Array.from({ length: Number(opt('--parallel') ?? 3) }, async () => {
    while (queue.length) {
      if (spent() >= cap) { console.log(`cap $${cap} reached, ${queue.splice(0).length} cases not run`); break; }
      await runOne(queue.shift());
    }
  }));
}

const rows = summarise(outDir);
const total = Object.values(rows).reduce((a, r) => a + r.modelUsd, 0);
const summary = {
  label, cases: Object.keys(rows).length, keptQuotes: Object.values(rows).reduce((a, r) => a + r.keptQuotes, 0),
  modelUsdTotal: Number(total.toFixed(4)), modelUsdPerCase: Number((total / Math.max(1, Object.keys(rows).length)).toFixed(4)),
  medianInTok: median(Object.values(rows).map((r) => r.inTok)), medianOutTok: median(Object.values(rows).map((r) => r.outTok)), rows,
};
writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, rows: undefined }));
for (const [s, r] of Object.entries(rows)) console.log(s.padEnd(48), r.verdict.padEnd(12), String(r.tier).padEnd(10), `q${r.keptQuotes}`, `$${r.modelUsd}`, r.parkReasons.join(' | ').slice(0, 120));

const base = opt('--compare');
if (base) {
  const b = summarise(path.join(root, 'pipeline', 'runs', '_replay', base));
  // Publish verdict = published or not (parked and "no case file" both mean not published).
  const pub = (r) => r.verdict === 'published';
  const flips = Object.keys(rows).filter((s) => b[s] && pub(b[s]) !== pub(rows[s]));
  const tierFlips = Object.keys(rows).filter((s) => b[s] && pub(b[s]) && pub(rows[s]) && b[s].tier !== rows[s].tier);
  const bq = Object.keys(rows).reduce((a, s) => a + (b[s]?.keptQuotes ?? 0), 0);
  console.log(`\nvs ${base}: same verdict ${Object.keys(rows).length - flips.length}/${Object.keys(rows).length}, kept quotes ${summary.keptQuotes} vs ${bq} (${(((summary.keptQuotes - bq) / bq) * 100).toFixed(1)}%)`);
  for (const s of flips) console.log(`  flip ${s}: ${b[s].verdict} → ${rows[s].verdict}; base park: ${b[s].parkReasons.join(' | ') || '-'}; this park: ${rows[s].parkReasons.join(' | ') || '-'}`);
  for (const s of tierFlips) console.log(`  tier ${s}: ${b[s].tier} → ${rows[s].tier}`);
}
