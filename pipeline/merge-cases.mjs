// Merges case files that report one event into one canonical case file. No API calls: every reading and source
// already passed the quote and speaker checks in the file it comes from, and is carried over unchanged.
// Usage: node pipeline/merge-cases.mjs <canonical-slug> <retired-slug> … [--base <slug>] [--drop <url-text>] [--dry-run] [--print]
//   canonical: the slug that stays (the oldest). --base: the file whose text (title, summary, notes) the merged file
//   keeps, default the canonical file, or the case-file member with most readings when the canonical is a mention.
// What it does (docs/pipeline.md § Merged case files):
//   readings: union, a reading is dropped when its URL and quote, or its party and URL, are already there;
//   primary sources and bearsOn: union; updates: the members' own, plus one line per retired file that added something,
//   dated by the newest source or reading it added; content/redirects.json: retired → canonical; the retired files are deleted;
//   candidates.json: candidates of retired seeds are marked mergedInto; social.json: the canonical's update count is
//   set, so the merge itself is not posted as an update.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { root, urlKey, loadRedirects, saveRedirects, loadCandidates, saveCandidates } from './state.mjs';
import { CASE_FILE_SCHEMA, validate } from './contract.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const baseArg = args.includes('--base') ? args[args.indexOf('--base') + 1] : null;
// --drop <text>: leave out readings and sources whose URL contains the text (a member that mixed in another event).
const drops = args.flatMap((a, i) => (args[i - 1] === '--drop' ? [a] : []));
const slugs = args.filter((a, i) => !a.startsWith('--') && !['--base', '--drop'].includes(args[i - 1]));
if (slugs.length < 2) { console.error('usage: merge-cases.mjs <canonical-slug> <retired-slug> … [--base <slug>] [--dry-run]'); process.exit(2); }
const [canonical, ...retired] = slugs;
const file = (s) => path.join(root, 'content', 'cases', `${s}.json`);
const read = (s) => JSON.parse(readFileSync(file(s), 'utf8'));
for (const s of slugs) if (!existsSync(file(s))) { console.error(`no case file ${s}`); process.exit(2); }

// When the site first had each file: its first commit, else today.
const firstSeen = (s) => {
  try { return execFileSync('git', ['log', '--diff-filter=A', '--format=%as', '--', path.relative(root, file(s))], { cwd: root, encoding: 'utf8' }).trim().split('\n').at(-1) || null; } catch { return null; }
};
const members = slugs.map((s) => ({ slug: s, c: read(s), seen: firstSeen(s) ?? new Date().toISOString().slice(0, 10) }));
const others = (b) => members.filter((m) => m.slug !== b).sort((a, b2) => a.seen.localeCompare(b2.seen));
const baseSlug = baseArg ?? (members[0].c.tier === 'case-file' ? canonical : (members.filter((m) => m.c.tier === 'case-file').sort((a, b) => b.c.readings.length - a.c.readings.length)[0]?.slug ?? canonical));
const base = members.find((m) => m.slug === baseSlug).c;

// "Ajeya Cotra (METR investigator)" and "Ajeya Cotra" are one party; accents and brackets do not count.
const party = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\([^)]*\)/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const norm = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const out = structuredClone(base);
out.slug = canonical;
if (members.some((m) => m.c.tier === 'case-file')) { out.tier = 'case-file'; delete out.missingCriterion; }
const has = { rq: new Set(), pu: new Set(), q: new Set(), src: new Set(), upd: new Set() };
const addReading = (r) => {
  const rq = `${urlKey(r.url)} ${norm(r.quote)}`, pu = `${party(r.partyName)} ${urlKey(r.url)}`;
  if (drops.some((d) => r.url.includes(d))) return false;
  if (has.rq.has(rq) || has.pu.has(pu) || has.q.has(norm(r.quote))) return false;
  has.rq.add(rq); has.pu.add(pu); has.q.add(norm(r.quote));
  return true;
};
out.readings = out.readings.filter(addReading);
for (const s of out.event.primarySources) has.src.add(urlKey(s.url));
const updates = [...(out.updates ?? [])];
for (const u of updates) has.upd.add(`${u.date} ${urlKey(u.sourceUrl)}`);
const log = [];
for (const m of others(baseSlug)) {
  const newR = m.c.readings.filter(addReading);
  const newS = m.c.event.primarySources.filter((s) => !has.src.has(urlKey(s.url)) && !drops.some((d) => s.url.includes(d)));
  for (const s of newS) has.src.add(urlKey(s.url));
  out.readings.push(...newR);
  out.event.primarySources.push(...newS);
  out.bearsOn = [...new Set([...out.bearsOn, ...m.c.bearsOn])];
  for (const u of m.c.updates ?? []) { const k = `${u.date} ${urlKey(u.sourceUrl)}`; if (!has.upd.has(k)) { has.upd.add(k); updates.push(u); } }
  log.push(`${m.slug}: +${newR.length} readings, +${newS.length} sources (of ${m.c.readings.length} / ${m.c.event.primarySources.length})`);
  if (m.slug === canonical || (!newR.length && !newS.length)) continue;
  const list = (xs) => [...new Set(xs)].join(', ');
  const parts = [
    newS.length && `${newS.length === 1 ? 'a first-hand source' : `${newS.length} first-hand sources`} (${list(newS.map((s) => s.publisher))})`,
    newR.length && `${newR.length === 1 ? 'a reading' : `${newR.length} readings`} (${list(newR.map((r) => r.partyName))})`,
  ].filter(Boolean);
  // Dated by the newest thing it added (a source's publication or a reading's date), else when the site first had the file.
  const dated = [...newS.map((s) => s.published), ...newR.map((r) => r.date)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '')).sort().at(-1);
  updates.push({ date: dated ?? m.seen, change: `Added ${parts.join(' and ')}.`, sourceUrl: (newS[0] ?? newR[0]).url });
}
out.updates = updates.sort((a, b) => a.date.localeCompare(b.date));
const errs = validate(CASE_FILE_SCHEMA, out);
if (errs.length) { console.error(`merged file invalid:\n  ${errs.join('\n  ')}`); process.exit(1); }
console.log(`${canonical} ← ${retired.join(', ')} (text from ${baseSlug})`);
for (const l of log) console.log(`  ${l}`);
console.log(`  result: ${out.tier}, ${out.readings.length} readings, ${out.event.primarySources.length} sources, ${out.updates.length} updates`);
// --print: the merged updates, readings and sources, to read before writing.
if (args.includes('--print')) console.log(out.updates.map((u) => `  ${u.date} ${u.change}`).join('\n'), '\n  readings:', out.readings.map((r) => `${r.partyName} <${r.url.slice(0, 60)}>`).join(' | '), '\n  sources:', out.event.primarySources.map((x) => x.url.slice(0, 70)).join(' | '));
if (dryRun) process.exit(0);

writeFileSync(file(canonical), JSON.stringify(out, null, 2) + '\n');
for (const s of retired) unlinkSync(file(s));
// Redirects: retired → canonical, and any earlier redirect to a retired slug now points at the canonical.
const red = loadRedirects();
for (const s of retired) red[s] = canonical;
for (const [k, v] of Object.entries(red)) if (retired.includes(v)) red[k] = canonical;
delete red[canonical];
saveRedirects(red);
// Candidates: the retired seeds' candidates point at the canonical case; an update queued for a retired case moves too.
const st = loadCandidates();
for (const c of st.candidates) {
  if (c.seed && retired.includes(c.seed)) c.mergedInto = canonical;
  if (c.route === 'update' && retired.includes(c.case)) c.case = canonical;
}
saveCandidates(st);
// Social: the merge adds update lines, which social.mjs would otherwise post as an update of the canonical case.
const socialPath = path.join(root, 'pipeline', 'state', 'social.json');
const social = JSON.parse(readFileSync(socialPath, 'utf8'));
// A canonical that was never posted takes over the post of a retired member, so it is not posted as new either.
const posted = social.x?.[canonical] ?? retired.map((s) => social.x?.[s]).find(Boolean);
if (posted) { social.x[canonical] = { ...posted, updates: out.updates.length }; writeFileSync(socialPath, JSON.stringify(social, null, 2) + '\n'); }
