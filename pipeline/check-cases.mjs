// Validates every case file against the contract. Runs before each build, so a malformed
// case file fails the deploy instead of breaking a live page. No API calls.
// Usage: node pipeline/check-cases.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { CASE_FILE_SCHEMA, validate } from './contract.mjs';

const dir = new URL('../content/cases/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
let failed = 0;
for (const f of files) {
  const c = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const errs = validate(CASE_FILE_SCHEMA, c);
  if (`${c.slug}.json` !== f) errs.push(`$.slug: "${c.slug}" does not match the file name`);
  if (errs.length) { failed++; console.error(`${f}\n  ${errs.join('\n  ')}`); }
}
console.log(`case files: ${files.length} checked, ${failed} invalid`);
process.exit(failed ? 1 : 0);
