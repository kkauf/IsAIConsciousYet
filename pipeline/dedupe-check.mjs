// Dry check of the same-event routing: replays the recorded candidates of merged case files (candidates.json
// mergedInto) through triage against today's case files and prints where each would go now. Writes nothing.
// Usage: node pipeline/dedupe-check.mjs            name rule only, no API calls
//        pipeline/run.sh dedupe-check.mjs --jev    also Jev's same-event judgment, as detect runs it (about $0.02)
//        --batch N                                  candidates per triage call, default 10
//        --no-alias                                 name rule without retired slugs, to test Jev and the rule on their own
import { triage, knownItems, nameMatch, sameMatch, slugBase } from './detect.mjs';
import { loadCandidates, loadCases, loadSeeds, loadRedirects } from './state.mjs';
import { ledgerTotal } from './lib.mjs';

const useJev = process.argv.includes('--jev');
const noAlias = process.argv.includes('--no-alias');
const cases = loadCases().filter((c) => c.status !== 'withdrawn');
const redirects = loadRedirects();
const state = loadCandidates();
const replay = state.candidates.filter((c) => c.mergedInto);
const events = replay.map((c) => ({ title: c.title, short_name: slugBase(c.seed), date: c.date, operator: c.operator, description: c.description, primary_url: c.url }));
const known = knownItems(cases, loadSeeds(), state.candidates, redirects);
// --batch N: candidates per triage call (default 10, about one detect run). Jev's same-event answers got worse far down
// one long batch: in a single 41-candidate call the last 15 fell to p 0.5 to 0.6 and 6 of them went to the wrong case.
const batch = Number(process.argv.includes('--batch') ? process.argv[process.argv.indexOf('--batch') + 1] : 10);
const answers = [];
// sameMatch reads batch:j choices against the chunk, so each chunk's answers are resolved against its own events.
const chunkOf = [];
if (useJev) for (let s = 0; s < events.length; s += batch) {
  const chunk = events.slice(s, s + batch);
  const r = await triage(chunk, known, { log: () => {} });
  chunk.forEach((_, j) => { answers[s + j] = r.answers[j]; chunkOf[s + j] = chunk; });
}

let ok = 0;
const byTarget = new Map();
replay.forEach((c, i) => {
  // Same order as detect(): the case-only question, then the question over every known item, then the name rule.
  // --no-alias leaves retired slugs out of the name rule; a replayed seed would otherwise match its own retired slug.
  const a = answers[i];
  const inCases = a ? sameMatch(a.case, known, chunkOf[i]) : null;
  const jevCase = inCases?.kind === 'case' ? inCases : a ? sameMatch(a.same, known, chunkOf[i]) : null;
  const target = jevCase?.kind === 'case' ? jevCase.slug : nameMatch(events[i], cases, noAlias ? {} : redirects)?.slug ?? null;
  const how = jevCase?.kind === 'case' ? `jev p=${jevCase.p.toFixed(2)}` : target ? 'name' : a ? `jev: ${a.case?.choice ?? a.same.choice}` : 'no match';
  if (target === c.mergedInto) ok++;
  byTarget.set(target ?? 'new case file', (byTarget.get(target ?? 'new case file') ?? 0) + 1);
  console.log(`${target === c.mergedInto ? 'ok  ' : 'MISS'} ${c.seed} → ${target ?? 'new case file'} (${how}; expected ${c.mergedInto})`);
});
console.log(`\n${ok} of ${replay.length} replayed candidates map to their merged case file.`);
for (const [t, n] of byTarget) console.log(`  ${t}: ${n}`);
if (useJev) console.log(`cost: $${ledgerTotal().total}`);
process.exit(ok === replay.length ? 0 : 1);
