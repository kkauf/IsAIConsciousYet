// Scheduled run: cap check → detect + triage → run-case on queued seeds → recheck → state → summary.
// Design: docs/pipeline.md. Runs weekly in .github/workflows/pipeline.yml; by hand: pipeline/run.sh auto.mjs …
// Usage: node pipeline/auto.mjs [--summary summary.md] [--new-urls new-urls.txt] [--dry-run] [--detect-from <file>]
// --dry-run stops after detect + triage and writes no seeds and no state (the summary is still written).
// --detect-from reuses the events of an earlier detect run (pipeline/runs/_detect/*.json), no detect charge.
//
// Logs are public in Actions: print titles, slugs, URLs and reasons, never keys or page text.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ledgerTotal, PRICES } from './lib.mjs';
import { detect } from './detect.mjs';
import { recheck, caseFiles, recheckUrls } from './recheck.mjs';
import { root, loadConfig, loadSpend, saveSpend, monthToDate, addSpend, capCheck, loadCandidates, saveCandidates, monthKey } from './state.mjs';

const SITE_URL = 'https://isaiconsciousyet.com'; // same as src/lib/cases/load.ts

const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const dryRun = args.includes('--dry-run');
const summaryPath = opt('--summary');
const newUrlsPath = opt('--new-urls');
const detectFrom = opt('--detect-from');
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

const config = loadConfig();
const spend = loadSpend();
const month = monthKey();
const spentBefore = monthToDate(spend, month);
let childCost = 0; // run-case children; in-process calls are in lib's ledger
const runCost = () => ledgerTotal().total + childCost;
const cap = (step, estimate) => capCheck({ config, spentBefore, spentThisRun: runCost(), estimate, step });

const out = { capStops: [], errors: [], detected: [], published: [], mentions: [], parked: [], recheck: null, processor: null };

// ── 1 detect + triage ────────────────────────────────────────────────────────
const processor = config.detectProcessor ?? 'base';
const detectStop = cap('detect', (detectFrom ? 0 : PRICES.parallelTask[processor] ?? 0.1) + config.worstCaseUsd.detectTriage);
if (detectStop) { out.capStops.push(detectStop); log(detectStop); }
else {
  try {
    const d = await detect({ processor, write: !dryRun, fromFile: detectFrom, log });
    out.detected = d.candidates;
    out.processor = d.processor;
    for (const c of d.candidates) log(`  [${c.route}] ${c.title} (${c.reason})`);
  } catch (e) { out.errors.push(`detect: ${String(e.message ?? e).slice(0, 300)}`); log('detect failed:', out.errors.at(-1)); }
}

// ── 2 research + gates on queued seeds (oldest first) ────────────────────────
function runCase(seedFile) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, 'pipeline', 'run-case.mjs'), seedFile], { cwd: root, stdio: 'inherit', env: process.env });
    child.on('close', (code) => resolve(code));
    child.on('error', () => resolve(-1));
  });
}

if (!dryRun) {
  const state = loadCandidates();
  const queue = state.candidates.filter((c) => c.route === 'new' && c.status === 'pending');
  for (const c of queue.slice(0, config.maxNewCasesPerRun)) {
    const stop = cap(`research for ${c.seed}`, config.worstCaseUsd.case);
    if (stop) { out.capStops.push(stop); log(stop); break; }
    const seedFile = path.join('pipeline', 'seeds', `${c.seed}.json`);
    const target = path.join(root, 'content', 'cases', `${c.seed}.json`);
    const existed = existsSync(target);
    const started = new Date().toISOString();
    log(`run-case: ${c.seed} …`);
    const code = existsSync(path.join(root, seedFile)) ? await runCase(seedFile) : 'no seed file';
    const runDir = path.join(root, 'pipeline', 'runs', c.seed);
    const report = existsSync(path.join(runDir, 'report.json')) ? JSON.parse(readFileSync(path.join(runDir, 'report.json'), 'utf8')) : null;
    const fresh = report && report.startedAt >= started;
    // A run that crashed before its report is charged at the worst case, so the cap errs on the safe side.
    childCost += fresh ? report.cost.total : config.worstCaseUsd.case;
    c.lastRun = started.slice(0, 10);
    if (code !== 0 || !fresh) {
      c.status = 'error'; // not retried automatically; set back to "pending" in candidates.json to retry
      out.errors.push(`run-case ${c.seed}: exit ${code}${fresh ? '' : ', no report'}`);
      saveCandidates(state);
      continue;
    }
    const cf = existsSync(path.join(runDir, 'case-file.json')) ? JSON.parse(readFileSync(path.join(runDir, 'case-file.json'), 'utf8')) : null;
    if (report.parkReasons.length || !cf) {
      c.status = 'parked'; c.parkReasons = report.parkReasons;
      out.parked.push({ slug: c.seed, title: cf?.title ?? c.title, reasons: report.parkReasons, cost: report.cost.total });
    } else if (existed) {
      c.status = 'exists';
      out.errors.push(`run-case ${c.seed}: content/cases/${c.seed}.json already existed and was not overwritten`);
    } else {
      c.status = cf.tier === 'mention' ? 'mention' : 'published';
      const entry = { slug: c.seed, title: cf.title, url: `${SITE_URL}/cases/${c.seed}`, readings: cf.readings.length, cost: report.cost.total, missing: cf.missingCriterion };
      (cf.tier === 'mention' ? out.mentions : out.published).push(entry);
    }
    saveCandidates(state);
  }
  out.queueLeft = loadCandidates().candidates.filter((c) => c.route === 'new' && c.status === 'pending').length;
}

// ── 3 weekly re-check of every live quote ────────────────────────────────────
if (!dryRun) {
  const files = caseFiles();
  const n = recheckUrls(files).length;
  const stop = cap('recheck', n * config.worstCaseUsd.recheckPerUrl + 0.005);
  if (stop) { out.capStops.push(stop); log(stop); }
  else {
    try { out.recheck = await recheck({ files, write: true, log }); } catch (e) { out.errors.push(`recheck: ${String(e.message ?? e).slice(0, 300)}`); }
  }
}

// ── 4 state ──────────────────────────────────────────────────────────────────
const cost = Number(runCost().toFixed(4));
if (!dryRun) {
  addSpend(spend, cost, month);
  spend.months[month].runs += 1;
  saveSpend(spend);
}
const mtd = Number((spentBefore + cost).toFixed(4));
const newUrls = [...out.published, ...out.mentions].map((p) => p.url);
if (newUrlsPath) writeFileSync(newUrlsPath, newUrls.join('\n') + (newUrls.length ? '\n' : ''));

// ── 5 summary ────────────────────────────────────────────────────────────────
const md = [];
const today = new Date().toISOString().slice(0, 10);
md.push(`# Pipeline run ${today}${dryRun ? ' (dry run)' : ''}`, '');
md.push(`Published ${out.published.length}, honorable mentions ${out.mentions.length}, parked ${out.parked.length}, updates found ${out.detected.filter((c) => c.route === 'update').length}, source changes ${out.recheck?.changed.length ?? 0}, errors ${out.errors.length}.`, '');
if (out.capStops.length) md.push('**Spend cap reached.** ' + out.capStops.join('; ') + '.', '');
const section = (title, lines) => { if (lines.length) md.push(`## ${title}`, '', ...lines, ''); };
section('Published', out.published.map((p) => `- [${p.title}](${p.url}) (${p.readings} readings, $${p.cost})`));
section('Honorable mentions', out.mentions.map((p) => `- [${p.title}](${p.url}): ${p.missing ?? ''} ($${p.cost})`));
section('Parked', out.parked.map((p) => `- \`${p.slug}\` ${p.title}: ${p.reasons.join('; ')} ($${p.cost})`));
section('Updates to existing case files (recorded, not applied)', out.detected.filter((c) => c.route === 'update').map((c) => `- \`${c.case}\` ← [${c.title}](${c.url}), ${c.date}`));
section('Errors', out.errors.map((e) => `- ${e}`));
if (out.detected.length) {
  md.push(`## Detected (${out.processor ?? 'no'} task, lookback ${config.lookbackDays} days)`, '', '| Route | Date | Candidate | Reason |', '|---|---|---|---|');
  for (const c of out.detected) md.push(`| ${c.route} | ${c.date ?? ''} | [${c.title.replace(/\|/g, '/')}](${c.url})${c.seed ? ` → \`${c.seed}\`` : ''} | ${c.reason.replace(/\|/g, '/')} |`);
  md.push('');
} else if (!out.capStops.some((s) => s.startsWith('detect'))) md.push('Detect found no candidates.', '');
if (out.queueLeft) md.push(`${out.queueLeft} new event(s) still queued for the next run (max ${config.maxNewCasesPerRun} per run).`, '');
if (out.recheck) {
  const r = out.recheck;
  section('Source changes', r.changed.map((x) => `- ${x.action} ${x.file} ${x.where}: ${x.url}`));
  md.push(`Re-check: ${r.checked} quotes checked, ${r.changed.length} changed, ${r.unreachable.length} page(s) unreachable (left unchanged).`, '');
}
md.push('## Spend', '', '| | USD |', '|---|---|', `| This run | ${cost.toFixed(4)} |`, `| Month to date (${month}, automated runs only) | ${mtd.toFixed(4)} |`, `| Monthly cap | ${config.monthlyCapUsd} |`, '');
md.push(`Cap status: ${out.capStops.length ? 'reached, steps skipped' : `ok, $${(config.monthlyCapUsd - mtd).toFixed(2)} left this month`}.`, '');
const summary = md.join('\n');
if (summaryPath) writeFileSync(summaryPath, summary);
console.log('\n' + summary);
