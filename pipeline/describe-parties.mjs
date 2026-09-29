// Adds partyDescription to readings of published case files that lack one (lib.mjs describeParty).
// New case files get it in run-case.mjs; this fills the files published before 2026-09-28.
// Usage: node pipeline/describe-parties.mjs [--dry-run]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { root } from './state.mjs';
import { describeParty, ledgerTotal } from './lib.mjs';

const dry = process.argv.includes('--dry-run');
const dir = path.join(root, 'content', 'cases');
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const file = path.join(dir, f), c = JSON.parse(readFileSync(file, 'utf8'));
  let changed = false;
  for (const r of c.readings) {
    if (r.partyDescription) continue;
    const d = await describeParty(r).catch((e) => { console.log(`  error ${r.partyName}: ${String(e.message).slice(0, 120)}`); return null; });
    console.log(`${c.slug} | ${r.partyName} → ${d ?? '(none)'}`);
    if (d) { r.partyDescription = d; changed = true; }
  }
  if (changed && !dry) writeFileSync(file, JSON.stringify(c, null, 2) + '\n');
}
console.log(`cost $${ledgerTotal().total}`);
