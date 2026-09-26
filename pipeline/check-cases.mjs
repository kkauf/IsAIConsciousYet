// Validates every case file, and content/coverage.json, against the contract. Runs before each build, so a malformed
// case file fails the deploy instead of breaking a live page. No API calls.
// Usage: node pipeline/check-cases.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { CASE_FILE_SCHEMA, COVERAGE_SCHEMA, validate } from './contract.mjs';

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

// Press coverage for /timeline: every article on a listed outlet, with an https link.
const covFile = new URL('../content/coverage.json', import.meta.url);
if (existsSync(covFile)) {
  const cov = JSON.parse(readFileSync(covFile, 'utf8'));
  const errs = validate(COVERAGE_SCHEMA, cov);
  cov.articles?.forEach((a, i) => {
    if (!cov.outlets?.includes(a.publication)) errs.push(`$.articles[${i}].publication: "${a.publication}" is not a listed outlet`);
    if (!/^https:\/\//.test(a.url ?? '')) errs.push(`$.articles[${i}].url: not an https link`);
  });
  if (errs.length) { failed++; console.error(`coverage.json\n  ${errs.join('\n  ')}`); }
  console.log(`coverage.json: ${cov.articles?.length ?? 0} articles checked, ${errs.length} errors`);
}
process.exit(failed ? 1 : 0);
