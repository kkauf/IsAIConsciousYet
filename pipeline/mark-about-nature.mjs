// Backfills `aboutNature` on the readings of an existing case file (one Jev call, ~$0.0001).
// Usage: pipeline/run.sh mark-about-nature.mjs content/cases/<slug>.json
import { readFile, writeFile } from 'node:fs/promises';
import { markAboutNature, ledgerTotal } from './lib.mjs';
import { CASE_FILE_SCHEMA, validate } from './contract.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: mark-about-nature.mjs <case-file.json>'); process.exit(2); }
const c = JSON.parse(await readFile(file, 'utf8'));
const marked = await markAboutNature(c.title, c.readings);
for (const r of marked) console.log(`${r._p.toFixed(2)} ${r.aboutNature ? 'nature ' : 'other  '} ${r.partyName}`);
c.readings = marked.map(({ _p, ...r }) => r);
const errs = validate(CASE_FILE_SCHEMA, c);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
await writeFile(file, JSON.stringify(c, null, 2) + '\n');
console.log('cost', JSON.stringify(ledgerTotal()));
