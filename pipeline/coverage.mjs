// Press coverage, the popular debate: articles in a fixed list of general-audience publications
// (pipeline/config.json § coverage) whose main subject is whether AI systems are, or could become,
// conscious. parallel.ai Search finds them, Jev judges the subject, and code reads the headline and
// date from the article page or its URL. Writes content/coverage.json, which /timeline draws.
// Design: docs/pipeline.md § Press coverage.
// Usage: pipeline/run.sh coverage.mjs --backfill [--outlets theguardian.com,economist.com] [--dry-run]
//        pipeline/run.sh coverage.mjs [--dry-run]    (weekly: articles since the last run; auto.mjs imports coverage())
//        pipeline/run.sh coverage.mjs --revalidate [--retry] [--dry-run]  (applies the code rules below to content/coverage.json again, no search)
// Adding an outlet: add it to the config, then backfill only that outlet (--backfill --outlets <domain>),
// so every outlet is counted over the same years and the chart stays comparable.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parallelSearch, parallelExtract, jev, ledgerTotal } from './lib.mjs';
import { root, loadConfig, urlKey, loadSpend, saveSpend, addSpend } from './state.mjs';

const OUT = path.join(root, 'content', 'coverage.json');
const STATE = path.join(root, 'pipeline', 'state', 'coverage.json');
const readJson = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 2) + '\n');

const SUBJECT = 'whether AI systems are, or could become, conscious or sentient, or have feelings, experiences, an inner life or moral status';
const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', accept: 'text/html' };

export function outletFor(outlets, url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  // The outlet's own site only: subdomains carry transcripts, newsletters, staging copies and downloads.
  return outlets.find((o) => o.domains.includes(host) && (!o.path || u.pathname.startsWith(o.path))) ?? null;
}

// The article's address without query or fragment. Search returns tracking variants
// (?eafs_enabled=false, ?syn-…=1, ?error=cookies_not_supported) and AMP copies, which extract cannot
// date and which made one article look like two. Every listed outlet addresses its articles by path alone.
export function articleUrl(url) {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    u.pathname = u.pathname.replace(/\/amp\/?$/, '');
    return u.toString();
  } catch { return url; }
}

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
// /2023/06/12/, /2023/jun/12/, /2023-06-12/ in the path. Most of the outlets date their URLs.
export function urlDate(url) {
  const m = url.match(/\/(20\d\d)[/-](\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[/-](\d{1,2})(?=[/-]|$)/i);
  if (!m) return null;
  const mo = MON[m[2].toLowerCase()] ?? Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
  .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const truncated = (t) => /(\.\.\.|…)\s*$/.test(t);

// Section, tag, author, edition, issue and newsletter pages list articles; they are not articles.
const NOT_ARTICLE = /\/(all|tags?|topics?|series|profiles?|authors?|contributors|sections?|newsletters?|printedition|weeklyedition|hub|magazines|learningenglish)(\/|$)|\/(the-)?download[-/]|[?&]page=|\.pdf$/i;

// The code-side subject check: the headline or the address must name the subject. The model's
// score alone let through pages whose search excerpt came from a sidebar link.
const SUBJECT_WORDS = /conscious|sentien|feel|emotion|alive|soul|\bminds?\b|suffer|welfare|rights|personhood|self-aware|aware|inner|experience|moral|lamda|lemoine|sapien/i;
export const namesSubject = (a) => SUBJECT_WORDS.test(a.headline ?? a.title ?? '') || SUBJECT_WORDS.test(new URL(a.url).pathname.replace(/[-_/]+/g, ' '));

// What paywalls and bot walls return instead of the headline.
const PLACEHOLDER = /^(opinion|video: opinion|analysis|subscribe to read|access restricted|access denied|just a moment.*|attention required.*|sign in|log in|page not found|403 forbidden)$/i;
const badTitle = (t) => !t || truncated(t) || PLACEHOLDER.test(t.trim());

// Page titles carry the site name ("… | The Guardian", "… - The New York Times"); the headline is what is left.
export function cleanTitle(t, outlet) {
  // "Opinion | Headline - The New York Times", "Headline | Section | The Guardian": the longest part is the headline.
  let s = decode(t ?? '').replace(/\s+/g, ' ').trim().split(/\s\|\s/).reduce((a, b) => (b.length > a.length ? b : a), '');
  const names = [outlet.name, outlet.name.replace(/^The /, ''), ...outlet.domains, 'BBC News', 'BBC Future', 'Opinion', 'WSJ', 'AP News', 'FT'].map((n) => n.toLowerCase());
  for (;;) {
    const m = s.match(/^(.*\S)\s[-–—]\s([^-–—]+)$/);
    if (!m || !names.some((n) => m[2].toLowerCase().includes(n))) break;
    s = m[1];
  }
  return s.trim();
}

// Headline and publication date from the article's own HTML (Open Graph, JSON-LD). Free; many
// paywalled sites refuse it, and extract is the fallback.
async function pageMeta(url) {
  try {
    const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 500000);
    const metas = [...html.matchAll(/<meta\s[^>]*>/gi)].map((m) => {
      const a = {};
      for (const x of m[0].matchAll(/([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) a[x[1].toLowerCase()] = x[2] ?? x[3];
      return a;
    });
    const meta = (k) => metas.find((a) => [a.property, a.name, a.itemprop].includes(k))?.content;
    const type = meta('og:type') ?? null;
    const title = meta('og:title') ?? meta('twitter:title') ?? html.match(/<title[^>]*>([^<]*)</i)?.[1] ?? null;
    const date = meta('article:published_time') ?? meta('datePublished') ?? html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ?? meta('date') ?? null;
    return { type, title, date: /^\d{4}-\d{2}-\d{2}/.test(date ?? '') ? date.slice(0, 10) : null };
  } catch { return null; }
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const daysBefore = (iso, n) => new Date(Date.parse(iso) - n * 864e5).toISOString().slice(0, 10);

// The subject judgment. Code keeps an article when the probability is at or above coverage.threshold.
async function judge(items) {
  const out = [];
  for (let i = 0; i < items.length; i += 12) {
    const batch = items.slice(i, i + 12);
    const q = Object.fromEntries(batch.map((_, j) => [`a${j}`, {
      type: 'noul',
      instructions: `Is the main subject of \`articles[${j}]\` ${SUBJECT}?`,
      criteria: {
        true: 'The article is mainly about AI consciousness, sentience, feelings or inner experience, or whether AI systems deserve moral consideration',
        false: 'It is mainly about something else (AI capabilities, jobs, safety, regulation, business, or human or animal consciousness), mentions AI consciousness only in passing, or is not an article (a topic, author or index page)',
      },
    }]));
    const ans = await jev('coverage-subject', { articles: batch.map((a) => ({ publication: a.publication, headline: a.title, url: a.url, excerpt: a.excerpt.slice(0, 900) })) }, q);
    batch.forEach((a, j) => out.push({ ...a, p: Number((ans[`a${j}`]?.noul ?? 0).toFixed(3)) }));
  }
  return out;
}

// Headline and date for articles the judge kept, read by code: the date from the URL, else the page's
// own metadata, else extract; never from the search index alone, which dates topic pages too. A page
// that calls itself something other than an article (og:type "website") is marked notArticle.
async function readArticles(items) {
  await pool(items, 6, async (a) => {
    const m = await pageMeta(a.url);
    a.notArticle = !!m?.type && !/article/i.test(m.type);
    if (m?.title && badTitle(a.title)) a.title = cleanTitle(m.title, a.outlet);
    a.date = urlDate(a.url) ?? m?.date ?? null;
  });
  const needExtract = items.filter((a) => !a.notArticle && (!a.date || badTitle(a.title)));
  if (!needExtract.length) return;
  const ex = await parallelExtract('coverage-extract', needExtract.map((a) => a.url));
  for (const a of needExtract) {
    const e = ex[a.url];
    if (e?.title && badTitle(a.title)) a.title = cleanTitle(e.title, a.outlet);
    if (!a.date && /^\d{4}-\d{2}-\d{2}/.test(e?.published ?? '')) a.date = e.published.slice(0, 10);
  }
}

// Anything without a date, a real headline, or the subject named in headline or address is left out.
const validArticle = (a, cfg, today) => !a.notArticle && !badTitle(a.title) && namesSubject(a) && a.date && a.date >= cfg.since && a.date <= today;

// The same piece under a second URL (print and web edition, audio version) counts once: same
// publication and headline within 45 days keeps the earliest.
function mergeArticles(list) {
  const norm = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const merged = [];
  for (const a of [...list].sort((x, y) => x.date.localeCompare(y.date))) {
    const twin = merged.find((m) => m.publication === a.publication && norm(m.headline) === norm(a.headline) && (Date.parse(a.date) - Date.parse(m.date)) / 864e5 <= 45);
    if (!twin) merged.push(a);
  }
  return merged;
}

export async function coverage({ backfill = false, only, write = true, log = console.log } = {}) {
  const cfg = loadConfig().coverage;
  const outlets = only ? cfg.outlets.filter((o) => o.domains.some((d) => only.includes(d))) : cfg.outlets;
  const state = readJson(STATE, { lastRun: null, seen: {} });
  const data = readJson(OUT, { since: cfg.since, updatedAt: null, outlets: [], articles: [] });
  const known = new Set(data.articles.map((a) => urlKey(a.url)));
  const today = new Date().toISOString().slice(0, 10);
  const errors = [];
  const costBefore = ledgerTotal().total; // auto.mjs runs this in-process, after other steps

  // 1 search. Backfill: one search per outlet and year, since the index favours recent pages.
  // Weekly: outlets in groups of four, from two weeks before the last run.
  const jobs = [];
  if (backfill) {
    for (const o of outlets) {
      for (let y = Number(cfg.since.slice(0, 4)); y <= Number(today.slice(0, 4)); y++) {
        jobs.push({ domains: o.domains, afterDate: `${y}-01-01`, objective: `${o.name} articles published in ${y} about ${SUBJECT}.`, queries: [`AI conscious ${y}`, `sentient AI chatbot ${y}`, 'AI consciousness feelings', 'AI welfare moral status rights', 'is AI self-aware'] });
      }
    }
  } else {
    const afterDate = state.lastRun ? daysBefore(state.lastRun, 14) : daysBefore(today, 30);
    for (let i = 0; i < outlets.length; i += 4) {
      jobs.push({ domains: outlets.slice(i, i + 4).flatMap((o) => o.domains), afterDate, objective: `News articles, essays and opinion pieces about ${SUBJECT}.`, queries: ['AI consciousness', 'sentient AI', 'AI welfare moral status', 'is AI conscious'] });
    }
  }
  log(`coverage: ${jobs.length} searches over ${outlets.length} outlets${backfill ? ` since ${cfg.since}` : ` after ${jobs[0]?.afterDate}`}`);
  let done = 0;
  const results = await pool(jobs, 4, async (j) => {
    try { return await parallelSearch('coverage-search', j); } catch (e) { errors.push(`search ${j.domains.join(',')}: ${String(e.message ?? e).slice(0, 200)}`); return []; }
    finally { if (++done % 20 === 0) log(`coverage: ${done}/${jobs.length} searches`); }
  });

  // 2 candidates: on a listed outlet, not seen before.
  const cands = new Map();
  for (const r of results.flat()) {
    const url = articleUrl(r.url);
    const o = outletFor(outlets, url);
    const k = urlKey(url);
    if (!o || NOT_ARTICLE.test(r.url) || known.has(k) || state.seen[k] || cands.has(k)) continue;
    cands.set(k, { ...r, url, key: k, publication: o.name, outlet: o });
  }
  log(`coverage: ${results.flat().length} results, ${cands.size} new candidates`);

  // 3 subject judgment
  let judged = [];
  try { judged = await judge([...cands.values()].map((c) => ({ ...c, title: cleanTitle(c.title, c.outlet) }))); } catch (e) { errors.push(`judge: ${String(e.message ?? e).slice(0, 200)}`); }
  const kept = judged.filter((a) => a.p >= cfg.threshold);

  // 4 headline and date, read by code, then the same-piece merge
  await readArticles(kept);
  const valid = (a) => validArticle(a, cfg, today);
  const merged = mergeArticles([...data.articles, ...kept.filter(valid).map((a) => ({ date: a.date, publication: a.publication, headline: a.title, url: a.url, foundAt: today }))]);
  const added = merged.filter((a) => !known.has(urlKey(a.url)));
  const undated = kept.filter((a) => !valid(a));

  // 5 state and output
  const addedKeys = new Set(added.map((a) => urlKey(a.url)));
  for (const a of judged) state.seen[a.key] = { p: a.p, kept: addedKeys.has(a.key) };
  const cost = Number((ledgerTotal().total - costBefore).toFixed(4));
  if (write) {
    if (!backfill || !only) state.lastRun = today;
    writeJson(STATE, state);
    data.since = cfg.since;
    data.outlets = cfg.outlets.map((o) => o.name);
    data.updatedAt = today;
    data.articles = merged.sort((a, b) => b.date.localeCompare(a.date) || a.publication.localeCompare(b.publication));
    writeJson(OUT, data);
  }
  const dir = path.join(root, 'pipeline', 'runs', '_coverage');
  mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, `${today}${backfill ? '-backfill' : ''}.json`), { searches: jobs.length, judged: judged.map(({ outlet, excerpt, ...a }) => a), errors, cost });
  log(`coverage: ${judged.length} judged, ${kept.length} about the subject, ${added.length} added, ${undated.length} left out (not an article, or no date), ${kept.filter(valid).length - added.length} merged as the same piece, $${cost}`);
  return { searches: jobs.length, candidates: cands.size, added, undated: undated.map((a) => a.url), errors, cost };
}

// After a rule change: drops stored articles the rules now refuse, and reads placeholder headlines
// ("Opinion", "Subscribe to read") again from the page, then extract. Stored addresses and seen keys
// are reduced to articleUrl(). No search, no judgment. With retry, articles the judge kept in earlier
// runs but the rules then left out are read again (needs the local run files in pipeline/runs/_coverage/).
export async function revalidate({ write = true, retry = false, log = console.log } = {}) {
  const cfg = loadConfig().coverage;
  const state = readJson(STATE, { lastRun: null, seen: {} });
  const data = readJson(OUT, null);
  const costBefore = ledgerTotal().total;
  const today = new Date().toISOString().slice(0, 10);
  const seen = {};
  for (const [k, v] of Object.entries(state.seen)) {
    const c = k.replace(/[?#].*$/, '');
    seen[c] = seen[c] ? { ...seen[c], ...v, p: Math.max(seen[c].p, v.p), kept: seen[c].kept || v.kept } : v;
  }
  state.seen = seen;
  let retried = [];
  if (retry) {
    const known = new Set(data.articles.map((a) => urlKey(articleUrl(a.url))));
    const dir = path.join(root, 'pipeline', 'runs', '_coverage');
    const byKey = new Map();
    for (const f of existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []) {
      for (const j of readJson(path.join(dir, f), { judged: [] }).judged ?? []) {
        const url = articleUrl(j.url);
        const k = urlKey(url);
        const o = outletFor(cfg.outlets, url);
        if (j.p < cfg.threshold || !o || NOT_ARTICLE.test(j.url) || known.has(k) || byKey.has(k) || state.seen[k]?.removedBy) continue;
        byKey.set(k, { url, key: k, title: j.title, publication: o.name, outlet: o, date: null });
      }
    }
    retried = [...byKey.values()];
    await readArticles(retried);
    const ok = retried.filter((a) => validArticle(a, cfg, today));
    for (const a of ok) state.seen[a.key] = { ...state.seen[a.key], kept: true };
    data.articles.push(...ok.map((a) => ({ date: a.date, publication: a.publication, headline: a.title, url: a.url, foundAt: today })));
    log(`revalidate: ${retried.length} left-out articles read again, ${ok.length} now pass`);
    retried = ok;
  }
  const items = mergeArticles(data.articles.map((a) => ({ ...a, url: articleUrl(a.url) }))).map((a) => ({ ...a, outlet: outletFor(cfg.outlets, a.url) }));
  const fix = items.filter((a) => a.outlet && badTitle(a.headline));
  await pool(fix, 6, async (a) => { const m = await pageMeta(a.url); if (m?.title) a.headline = cleanTitle(m.title, a.outlet); });
  const still = fix.filter((a) => badTitle(a.headline));
  if (still.length) {
    const ex = await parallelExtract('coverage-extract', still.map((a) => a.url));
    for (const a of still) if (ex[a.url]?.title) a.headline = cleanTitle(ex[a.url].title, a.outlet);
  }
  const reason = (a) => (!a.outlet ? 'not on the outlet\'s own site' : NOT_ARTICLE.test(a.url) ? 'not an article' : badTitle(a.headline) ? 'no headline' : !namesSubject(a) ? 'headline and address do not name the subject' : null);
  const dropped = items.filter(reason).map((a) => ({ url: a.url, headline: a.headline, reason: reason(a) }));
  const keep = items.filter((a) => !reason(a)).map(({ outlet, ...a }) => a);
  for (const d of dropped) if (state.seen[urlKey(d.url)]) state.seen[urlKey(d.url)].kept = false;
  if (write) {
    writeJson(STATE, state);
    writeJson(OUT, { ...data, articles: keep.sort((a, b) => b.date.localeCompare(a.date) || a.publication.localeCompare(b.publication)) });
  }
  const cost = Number((ledgerTotal().total - costBefore).toFixed(4));
  log(`revalidate: ${items.length} articles, ${fix.length} headlines read again, ${dropped.length} dropped, ${keep.length} kept, $${cost}`);
  return { dropped, retried, kept: keep.length, cost };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--revalidate')) {
  const r = await revalidate({ write: !process.argv.includes('--dry-run'), retry: process.argv.includes('--retry') });
  for (const a of r.retried) console.log(`  added: ${a.date} ${a.publication}: ${a.title}  ${a.url}`);
  for (const d of r.dropped) console.log(`  dropped (${d.reason}): ${d.headline}  ${d.url}`);
  if (r.cost && !process.argv.includes('--dry-run')) saveSpend(addSpend(loadSpend(), r.cost));
  process.exit(0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  const write = !args.includes('--dry-run');
  const r = await coverage({ backfill: args.includes('--backfill'), only: opt('--outlets')?.split(','), write });
  // Hand runs count against the monthly cap too, so the cap reflects what was actually spent.
  if (write && r.cost) saveSpend(addSpend(loadSpend(), r.cost));
  for (const e of r.errors) console.error(e);
  process.exit(r.errors.length && !r.added.length ? 1 : 0);
}
