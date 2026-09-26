// Weekly re-check: gate 2 again on every live case file. Design: docs/pipeline.md § After publish.
// Usage: pipeline/run.sh recheck.mjs [content/cases/<slug>.json …] [--dry-run]
// Default: every published case file in content/cases/.
//
// A page that was fetched, is readable and no longer contains the stored quote gets
// sourceChanged: "<YYYY-MM-DD>" on that reading, primary source or summary sentence.
// The mark is cleared when the quote is found again. An unreachable page changes nothing.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parallelExtract, findQuote } from './lib.mjs';
import { root } from './state.mjs';

const readable = (p) => p && !p.error && (p.text ?? '').length > 500;

// Every quoted item in a case file with the URL it must be found on.
function items(c) {
  return [
    ...c.readings.map((r, i) => ({ where: `readings[${i}] ${r.partyName}`, obj: r })),
    ...c.event.primarySources.map((s, i) => ({ where: `primarySources[${i}] ${s.publisher}`, obj: s })),
    ...(c.event.summaryBasis ?? []).map((s, i) => ({ where: `summaryBasis[${i}]`, obj: s })),
  ];
}

export function caseFiles() {
  const dir = path.join(root, 'content', 'cases');
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
}

export function recheckUrls(files) {
  const urls = new Set();
  for (const f of files) {
    const c = JSON.parse(readFileSync(f, 'utf8'));
    if (c.status !== 'published') continue;
    for (const it of items(c)) urls.add(it.obj.url);
  }
  return [...urls];
}

// Returns { changed: [{ file, where, url, action }], unreachable: [url], checked }.
export async function recheck({ files = caseFiles(), write = true, today = new Date().toISOString().slice(0, 10), log = console.log } = {}) {
  const cases = files.map((f) => ({ f, c: JSON.parse(readFileSync(f, 'utf8')) })).filter(({ c }) => c.status === 'published');
  const urls = [...new Set(cases.flatMap(({ c }) => items(c).map((it) => it.obj.url)))];
  log(`recheck: ${cases.length} case files, ${urls.length} pages …`);
  const pages = urls.length ? await parallelExtract('recheck', urls) : {};
  const unreachable = urls.filter((u) => !readable(pages[u]));
  const changed = [];
  let checked = 0;
  for (const { f, c } of cases) {
    let dirty = false;
    for (const it of items(c)) {
      const page = pages[it.obj.url];
      if (!readable(page)) continue; // unreachable or unreadable: no evidence either way
      checked++;
      const found = !!findQuote(page.text, it.obj.quote);
      const rel = path.relative(root, f);
      if (!found && !it.obj.sourceChanged) {
        it.obj.sourceChanged = today; dirty = true;
        changed.push({ file: rel, where: it.where, url: it.obj.url, action: 'marked' });
      } else if (found && it.obj.sourceChanged) {
        delete it.obj.sourceChanged; dirty = true;
        changed.push({ file: rel, where: it.where, url: it.obj.url, action: 'cleared' });
      }
    }
    if (dirty && write) writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
  }
  log(`recheck: ${checked} quotes checked, ${changed.length} changed, ${unreachable.length} pages unreachable`);
  return { changed, unreachable, checked };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const files = args.filter((a) => !a.startsWith('--')).map((a) => path.resolve(a));
  const { ledgerTotal } = await import('./lib.mjs');
  const res = await recheck({ files: files.length ? files : undefined, write: !args.includes('--dry-run') });
  for (const x of res.changed) console.log(`- ${x.action} ${x.file} ${x.where} (${x.url})`);
  for (const u of res.unreachable) console.log(`- unreachable, unchanged: ${u}`);
  console.log(`cost: $${ledgerTotal().total}`);
}
