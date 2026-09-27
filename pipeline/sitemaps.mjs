// Press coverage candidates from each outlet's own archive sitemaps. parallel.ai Search ignores
// before_date and ranks recent pages first, so earlier years come back thinner; a sitemap lists every
// article of a period, and filtering its addresses by words costs the same effort in every year.
// Free: plain HTTP, no API, no model. Judging the candidates stays in coverage.mjs.
// Usage: node pipeline/sitemaps.mjs --survey [--outlets nytimes.com,wired.com] [--from 2020-01] [--to 2026-09]
//        (crawls, compares with content/coverage.json, writes pipeline/runs/_coverage/sitemap-survey.json)
// Findings of 2026-09-26 (which outlets work and why the others don't): the SOURCES table below.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleUrl, outletFor, urlDate } from './urls.mjs';
import { root, loadConfig } from './state.mjs';

const RUNS = path.join(root, 'pipeline', 'runs', '_coverage');
const CACHE = path.join(RUNS, 'sitemap-cache');
const BROWSER = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

// ── the address filter ──

// Slug tokens: words between -, _, / and . in the lowercased path.
const tok = (w) => String.raw`(?:^|[^a-z0-9])(?:${w})(?![a-z0-9])`;
// ais: "could-ais-become-conscious"; chat-bot and neural networks: addresses the judge kept that the first list missed.
const AI_WORDS = String.raw`ai|ais|artificial-intelligence|chat-?bots?|robots?|machines?|computers?|neural-networks?|lamda|lemoine|gpt(?:-?[0-9]o?)?|chatgpt|claude|llms?|bing|sydney|gemini|bard|anthropic|openai|algorithms?`;
// SUBJECT_WORDS of coverage.mjs as whole slug tokens, inflections listed. Left out, measured on the
// 2020–2026 sitemaps: aware (situational-awareness funds) and experience (customer-, user-, fan-experience)
// admitted mostly business pieces and caught no article in content/coverage.json.
const SUBJECT_TOKENS = String.raw`(?:sub|un)?conscious(?:ness)?|sentien(?:t|ce)|feel(?:s|ing|ings)?|emotions?|emotional|alive|souls?|minds?|suffer(?:s|ing)?|welfare|rights|personhood|self-aware(?:ness)?|inner|moral(?:ity|s)?|lamda|lemoine|sapien(?:t|ce)`;
// Terms that name the subject alone. sentient/sentience also catch animal sentience, consciousness the
// neuroscience of it (about 300 addresses over 2020–2026, most at Scientific American); the judge
// sorts them out, and without it the pieces on consciousness in general that the judge kept are lost.
const ALONE = String.raw`sentient|sentience|consciousness|lamda|lemoine|ai-consciousness|machine-consciousness`;
// Test on the lowercased URL path: an AI word and a subject word, or one term that needs no partner.
export const CANDIDATE = new RegExp(String.raw`^(?=.*${tok(AI_WORDS)})(?=.*${tok(SUBJECT_TOKENS)})|${tok(ALONE)}`);
export const isCandidate = (url) => {
  try { return CANDIDATE.test(decodeURIComponent(new URL(url).pathname).toLowerCase()); } catch { return false; }
};

// ── where each outlet lists its archive (checked 2026-09-26) ──
// granularity: the period one file covers. month/day files list what was published in that period
// (their lastmod values fall inside it); coarser files are filtered by the date in the address.
// addressless: the address carries no words (an id or uuid), so the filter can never match.
const mm = (m) => String(m).padStart(2, '0');
const SOURCES = {
  'nytimes.com': { granularity: 'month', earliest: '1851-01', file: (y, m) => `https://www.nytimes.com/sitemaps/new/sitemap-${y}-${mm(m)}.xml.gz` },
  'washingtonpost.com': { granularity: 'month', earliest: '2013-01', file: (y, m) => `https://www.washingtonpost.com/sitemaps/sitemap-${y}-${mm(m)}.xml` },
  'wsj.com': { granularity: 'month', earliest: '1996-01', file: (y, m) => `https://www.wsj.com/sitemaps/web/wsj/en/sitemap_wsj_en_m${m}_${y}.xml` },
  'bloomberg.com': { granularity: 'month', earliest: '1991-01', file: (y, m) => `https://www.bloomberg.com/sitemaps/news/${y}-${m}.xml` },
  // One file per section and month; the index names the sections that exist in each month.
  'cnn.com': { granularity: 'month', earliest: '2010-03', index: 'https://www.cnn.com/sitemap/article.xml', pick: (loc, y, m) => loc.endsWith(`/${y}/${mm(m)}.xml`) },
  'npr.org': { granularity: 'half-year', earliest: '1990-01', file: (y, m) => `https://googlecrawl.npr.org/standard/sitemap_standard_01-${m <= 6 ? 'Jan' : 'Jul'}-${String(y).slice(2)}.xml` },
  'newyorker.com': { granularity: 'month', earliest: '2000-01', file: (y, m) => `https://www.newyorker.com/sitemap-${y}-${mm(m)}.xml`, note: 'the index lists the last 60 months only; older month files answer too' },
  'wired.com': { granularity: 'month', earliest: '2000-01', file: (y, m) => `https://www.wired.com/sitemap-${y}-${mm(m)}.xml`, note: 'the index lists the last 60 months only; older month files answer too' },
  'vox.com': { granularity: 'month', earliest: '2014-01', file: (y, m) => `https://www.vox.com/sitemaps/entries/${y}/${m}` },
  'theverge.com': { granularity: 'month', earliest: '2011-04', file: (y, m) => `https://www.theverge.com/sitemaps/entries/${y}/${m}` },
  // time.com answers browser user-agents with 406 every second time and serves a plain client.
  'time.com': { granularity: 'day', earliest: '1923-03', plain: true, file: (y, m, d) => `https://time.com/sitemap.xml?yyyy=${y}&mm=${mm(m)}&dd=${mm(d)}` },
  // Day files exist (sitemap-<y>.xml?mm=&dd=), but robots.txt forbids automated mining and cached data
  // sets of the site's content. New Scientist is found by search only.
  'newscientist.com': { unusable: 'robots.txt forbids automated data mining', probe: 'https://www.newscientist.com/robots.txt' },
  // The archive stops at 2023-10-31 and lists the wire copies (/article/<section>/<slug>-idUS…), not the
  // /technology/<slug>-2022-07-23/ pages; newer articles are only in a rolling list of the latest 10,000.
  'reuters.com': { granularity: 'day', earliest: '2005-02', latest: '2023-10', file: (y, m, d) => `https://www.reuters.com/service/archive-sitemap/${y}-${mm(m)}-${mm(d)}.xml` },
  // 36 numbered files of 1,000 dated addresses: small enough to read whole.
  'technologyreview.com': { granularity: 'whole archive', earliest: '1997-01', index: 'https://www.technologyreview.com/sitemap-index-1.xml' },
  // Nine pages of 10,000 undated addresses; a 2024 migration stamped most lastmod values, so every page is read.
  'scientificamerican.com': { granularity: 'whole archive', earliest: '1845-08', undated: true, index: 'https://www.scientificamerican.com/platform/syndication/sitemaps/', pick: (loc) => loc.includes('/sitemaps/articles/') },
  // Pages of 10,000 undated addresses, newest lastmod first; an edit moves an article to page 1. Since
  // lastmod is never before publication, reading until a page ends before fromMonth misses nothing.
  'foxnews.com': { granularity: 'lastmod pages', earliest: '2015-01', undated: true, page: (n) => `https://www.foxnews.com/sitemap.xml?type=articles&page=${n}` },
  'ft.com': { granularity: 'month', earliest: '1995-11', addressless: true, file: (y, m) => `https://www.ft.com/sitemaps/archive-${y}-${m}.xml`, note: 'addresses are /content/<uuid>' },
  'nature.com': { granularity: 'month', earliest: '1869-11', addressless: true, file: (y, m) => `https://www.nature.com/nature/sitemap/${y}/${m}/articles.xml`, note: 'addresses are /articles/d41586-<id>' },
  'bbc.com': { unusable: 'the archive is 123 numbered files of 50,000 addresses across all BBC sites, not split by date, and news addresses are ids (/news/articles/c242pzr1zp2o, /news/technology-61784011)', probe: 'https://www.bbc.com/sitemaps/https-index-com-archive.xml' },
  'theguardian.com': { unusable: 'robots.txt lists only news.xml (the last two days) and video.xml; no archive sitemap', probe: 'https://www.theguardian.com/sitemaps/news.xml' },
  'apnews.com': { unusable: 'bot wall', probe: 'https://apnews.com/ap-sitemap.xml' },
  'economist.com': { unusable: 'bot wall', probe: 'https://www.economist.com/sitemap.xml' },
  'theatlantic.com': { unusable: 'bot wall', probe: 'https://www.theatlantic.com/sitemap.xml' },
  'telegraph.co.uk': { unusable: 'bot wall', probe: 'https://www.telegraph.co.uk/sitemap.xml' },
};
const sourceFor = (outlet) => outlet.domains.map((d) => SOURCES[d]).find(Boolean);
// Outlets whose sitemap addresses can be filtered by words.
export const hasSitemap = (outlet) => { const s = sourceFor(outlet); return !!s && !s.unusable && !s.addressless; };

// ── fetching ──

export const stats = { requests: 0, cached: 0, bytes: 0, retries: 0 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// At most three requests at a time per host.
const slots = new Map();
async function slot(host) {
  const s = slots.get(host) ?? slots.set(host, { active: 0, wait: [] }).get(host);
  if (s.active >= 3) await new Promise((r) => s.wait.push(r));
  s.active++;
  return () => { s.active--; s.wait.shift()?.(); };
}

class Blocked extends Error {}
// Bot walls answer 402/403/406, or 200 with a challenge page instead of XML.
const WALL = /<title>\s*(just a moment|attention required|access denied|your access has been blocked)|access issue help/i;

async function fetchText(url, { plain = false } = {}) {
  const release = await slot(new URL(url).host);
  try {
    for (let attempt = 0; ; attempt++) {
      stats.requests++;
      let res;
      try {
        res = await fetch(url, { headers: plain ? {} : BROWSER, redirect: 'follow', signal: AbortSignal.timeout(60000) });
      } catch (e) {
        if (attempt >= 3) throw e;
        stats.retries++;
        await sleep(5000 * 2 ** attempt);
        continue;
      }
      // Back off on 429 and 5xx: Retry-After when given, else 5, 10, 20, 40 seconds.
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        stats.retries++;
        const after = Number(res.headers.get('retry-after'));
        await sleep(after > 0 ? Math.min(after, 120) * 1000 : 5000 * 2 ** attempt);
        continue;
      }
      let buf = Buffer.from(await res.arrayBuffer());
      stats.bytes += buf.length;
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf); // .xml.gz files come as gzip bodies
      const text = buf.toString('utf8');
      // time.com answers every second browser-headed request with 406, New Scientist every one; both serve a plain client.
      if (res.status === 406 && !plain) { plain = true; continue; }
      if ([402, 403, 406].includes(res.status) || WALL.test(text.slice(0, 5000))) throw new Blocked(`${res.status} bot wall at ${url}`);
      return { status: res.status, text };
    }
  } finally { release(); }
}

const decode = (s) => s.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim()
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;|&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]) : undefined; };

// <url> entries, or <sitemap> children of an index.
function parse(xml) {
  const index = /<sitemapindex[\s>]/.test(xml);
  const entries = [];
  for (const block of xml.split(index ? /<sitemap>/ : /<url>/).slice(1)) {
    const loc = tag(block, 'loc');
    if (!loc) continue;
    const title = tag(block, 'news:title') ?? tag(block, 'image:title');
    entries.push({ url: loc, lastmod: tag(block, 'lastmod'), ...(title ? { title } : {}) });
  }
  return { index, entries };
}

const thisMonth = () => new Date().toISOString().slice(0, 7);
// Parsed files are cached under pipeline/runs (gitignored). A file of a closed period does not change
// after the month ends; anything else is reused on the same day only.
async function readSitemap(url, { closed = false, plain = false } = {}) {
  const f = path.join(CACHE, createHash('sha1').update(url).digest('hex').slice(0, 20) + '.json.gz');
  const today = new Date().toISOString().slice(0, 10);
  if (existsSync(f)) {
    const c = JSON.parse(gunzipSync(readFileSync(f)).toString('utf8'));
    if (closed || c.day === today) { stats.cached++; return c; }
  }
  let r;
  try { r = await fetchText(url, { plain }); } catch (e) { if (e instanceof Blocked) throw e; return { url, status: `error ${e.message}`, entries: [] }; }
  // A missing month (404, or an HTML page) is an empty list, not an error: CNN has no section file for some months.
  const out = { url, day: today, status: r.status, ...(r.status === 200 && /<(urlset|sitemapindex)[\s>]/.test(r.text) ? parse(r.text) : { index: false, entries: [] }) };
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(f, gzipSync(JSON.stringify(out)));
  return out;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

function monthsBetween(from, to) {
  const out = [];
  for (let [y, m] = from.split('-').map(Number); `${y}-${mm(m)}` <= to; m === 12 ? (y++, m = 1) : m++) out.push([y, m]);
  return out;
}
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// The files to read for a range, each with the period it covers.
async function filesFor(src, from, to) {
  const months = monthsBetween(from < src.earliest ? src.earliest : from, src.latest && to > src.latest ? src.latest : to);
  const now = thisMonth();
  if (src.granularity === 'day') {
    return months.flatMap(([y, m]) => Array.from({ length: daysIn(y, m) }, (_, i) => ({ url: src.file(y, m, i + 1), period: `${y}-${mm(m)}-${mm(i + 1)}`, closed: `${y}-${mm(m)}` < now })))
      .filter((f) => f.period <= new Date().toISOString().slice(0, 10));
  }
  if (src.file) {
    const seen = new Map();
    for (const [y, m] of months) {
      const url = src.file(y, m);
      const period = src.granularity === 'half-year' ? `${y}-H${m <= 6 ? 1 : 2}` : `${y}-${mm(m)}`;
      const lastMonth = src.granularity === 'half-year' ? `${y}-${m <= 6 ? '06' : '12'}` : `${y}-${mm(m)}`;
      if (!seen.has(url)) seen.set(url, { url, period, closed: lastMonth < now });
    }
    return [...seen.values()];
  }
  const index = await readSitemap(src.index);
  if (src.granularity === 'month') {
    return months.flatMap(([y, m]) => index.entries.filter((e) => src.pick(e.url, y, m)).map((e) => ({ url: e.url, period: `${y}-${mm(m)}`, closed: `${y}-${mm(m)}` < now })));
  }
  return index.entries.filter((e) => !src.pick || src.pick(e.url)).map((e) => ({ url: e.url, period: null, closed: false }));
}

// Sitemap entries of one outlet for the months fromMonth..toMonth ('2020-01'), normalised with
// articleUrl() and kept only when outletFor() puts them on the outlet's own site. Each entry also
// carries the period of the file it came from (a day, a month, or null for undated archives).
export async function sitemapUrls(outlet, fromMonth, toMonth = thisMonth(), { onFile } = {}) {
  if (typeof outlet === 'string') outlet = loadConfig().coverage.outlets.find((o) => o.domains.includes(outlet));
  const src = outlet && sourceFor(outlet);
  if (!src || src.unusable) throw new Error(`${outlet?.name ?? 'outlet'}: no usable archive sitemap (${src?.unusable ?? 'not surveyed'})`);
  const byUrl = new Map();
  const add = (e, period, coarse) => {
    const url = articleUrl(e.url);
    if (!outletFor([outlet], url) || byUrl.has(url)) return;
    // Coarse files (half-year, whole archive) are cut to the range by the date in the address; lastmod
    // only bounds from below, since a later edit moves it forward.
    if (coarse) {
      const d = urlDate(url);
      if (d ? d.slice(0, 7) < fromMonth || d.slice(0, 7) > toMonth : (e.lastmod ?? '9999').slice(0, 7) < fromMonth) return;
    }
    byUrl.set(url, { url, ...(e.lastmod ? { lastmod: e.lastmod } : {}), ...(e.title ? { title: e.title } : {}), period });
  };
  if (src.page) {
    // Newest lastmod first: read pages until one reaches back before fromMonth.
    for (let n = 1; ; n += 3) {
      const pages = await Promise.all([n, n + 1, n + 2].map((k) => readSitemap(src.page(k), { plain: src.plain })));
      let done = false;
      for (const p of pages) {
        onFile?.(p);
        for (const e of p.entries) add(e, null, true);
        const oldest = p.entries.map((e) => e.lastmod ?? '').filter(Boolean).sort()[0];
        if (!p.entries.length || (oldest && oldest.slice(0, 7) < fromMonth)) done = true;
      }
      if (done) break;
    }
  } else {
    const files = await filesFor(src, fromMonth, toMonth);
    let wall = null; // after a bot wall the other workers stop instead of reading on
    await pool(files, 3, async (f) => {
      if (wall) return;
      const s = await readSitemap(f.url, { closed: f.closed, plain: src.plain }).catch((e) => { wall = e; return { entries: [] }; });
      onFile?.(s, f);
      const coarse = src.granularity !== 'month' && src.granularity !== 'day';
      for (const e of s.entries) add(e, f.period, coarse);
    });
    if (wall) throw wall;
  }
  return [...byUrl.values()];
}

// ── survey: reachability, crawl, and comparison with content/coverage.json ──

// Comparison key: the path without host, trailing slash, /index.html or .amp, so edition.cnn.com and
// www.cnn.com, or a trailing slash, do not count as two addresses.
const key = (url) => { try { return decodeURIComponent(new URL(articleUrl(url)).pathname).toLowerCase().replace(/(\/index\.html|\.amp|\/)+$/, ''); } catch { return url; } };
// The slug without a trailing date or wire id, to recognise one article under two addresses (Reuters).
const slugStem = (url) => key(url).split('/').pop().replace(/-(id[a-z0-9]+|20\d\d-\d\d-\d\d|\d{8,})$/, '');

// Publication date from the article page, for archives whose addresses carry none (Fox News, Scientific American).
async function publishedDate(url) {
  try {
    const { text } = await fetchText(url);
    const m = text.match(/<meta[^>]+(?:property|name|itemprop)="(?:article:published_time|datePublished|dc\.date|date)"[^>]+content="(\d{4}-\d\d-\d\d)/i)
      ?? text.match(/<meta[^>]+content="(\d{4}-\d\d-\d\d)[^"]*"[^>]+(?:property|name)="article:published_time"/i)
      ?? text.match(/"datePublished"\s*:\s*"(\d{4}-\d\d-\d\d)/);
    return m?.[1] ?? null;
  } catch { return null; }
}

const strength = (url) => (/sentien|conscious/.test(url) ? 0 : /lamda|lemoine|feel|emotion|alive|soul|welfare|rights|suffer|moral|personhood/.test(url) ? 1 : 2);

export async function survey({ only, from = '2020-01', to = thisMonth(), log = console.log } = {}) {
  const cfg = loadConfig().coverage;
  const outlets = only ? cfg.outlets.filter((o) => o.domains.some((d) => only.includes(d))) : cfg.outlets;
  const articles = JSON.parse(readFileSync(path.join(root, 'content', 'coverage.json'), 'utf8')).articles;
  const years = monthsBetween(from, to).map(([y]) => String(y)).filter((y, i, a) => a.indexOf(y) === i);
  const report = { from, to, surveyedAt: new Date().toISOString().slice(0, 10), candidate: CANDIDATE.source, outlets: [], pooled: {} };

  await Promise.all(outlets.map(async (o) => {
    const src = sourceFor(o) ?? { unusable: 'not surveyed' };
    const row = { name: o.name, domain: o.domains[0], granularity: src.granularity ?? null, earliest: src.earliest ?? null, note: src.note ?? src.unusable ?? null };
    report.outlets.push(row);
    if (src.unusable) {
      try { row.probe = (await fetchText(src.probe)).status; } catch (e) { row.probe = String(e.message).slice(0, 80); }
      row.usable = false;
      return;
    }
    row.pattern = src.file ? src.file(2022, 6, 13) : src.page ? src.page(1) : src.index;
    const t0 = Date.now();
    let files = 0;
    const A = articles.filter((a) => outletFor([o], a.url)).map((a) => ({ ...a, key: key(a.url), stem: slugStem(a.url) }));
    const aKeys = new Map(A.map((a) => [a.key, a]));
    const aStems = new Map(A.map((a) => [a.stem, a]));
    const found = new Map(); // A key → sitemap entry
    let entries;
    const periods = new Map();
    try {
      entries = await sitemapUrls(o, from, to, {
        onFile: (s, f) => { files++; if (f) periods.set(f.period, (periods.get(f.period) ?? 0) + s.entries.length); },
      });
    } catch (e) {
      row.usable = false;
      row.error = String(e.message).slice(0, 200);
      log(`sitemaps: ${o.name}: ${row.error}`);
      return;
    }
    // Year of an entry: the date in its address, else the day or month of its file, else the article page.
    let B = [];
    const perYear = Object.fromEntries(years.map((y) => [y, { sitemapUrls: 0 }]));
    for (const e of entries) {
      const k = key(e.url);
      const a = aKeys.get(k) ?? aStems.get(slugStem(e.url));
      if (a && !found.has(a.key)) found.set(a.key, e);
      e.year = urlDate(e.url)?.slice(0, 4) ?? (e.period && !e.period.includes('H') ? e.period.slice(0, 4) : null);
      if (e.year && perYear[e.year]) perYear[e.year].sitemapUrls++;
      if (isCandidate(e.url)) B.push(e);
    }
    // Reuters lists each story up to four times, once per wire copy; count a slug once.
    const stems = new Set();
    B = B.filter((e) => !stems.has(slugStem(e.url)) && stems.add(slugStem(e.url)));
    if (src.undated) {
      await pool(B.filter((e) => !e.year), 3, async (e) => { e.date = await publishedDate(e.url); e.year = e.date?.slice(0, 4) ?? null; });
    }
    row.usable = true;
    row.addressless = !!src.addressless;
    row.files = files; // sitemap files read (the stats counter is shared by outlets crawled at the same time)
    row.seconds = Math.round((Date.now() - t0) / 1000);
    row.entries = entries.length;
    const monthly = [...periods.entries()].filter(([p]) => /^\d{4}-\d\d/.test(p)).reduce((m, [p, n]) => m.set(p.slice(0, 7), (m.get(p.slice(0, 7)) ?? 0) + n), new Map());
    row.urlsPerMonth = monthly.size ? Math.round([...monthly.values()].reduce((s, n) => s + n, 0) / monthly.size) : Math.round(entries.length / monthsBetween(from, to).length);
    const bKeys = new Set(B.map((e) => key(e.url)));
    const inB = (a) => { const e = found.get(a.key); return !!e && bKeys.has(key(e.url)); };
    row.years = {};
    for (const y of years) {
      const Ay = A.filter((a) => a.date.slice(0, 4) === y);
      const By = B.filter((e) => e.year === y);
      const aSet = new Set(A.map((a) => a.key));
      const matchesA = (e) => aSet.has(key(e.url)) || aStems.has(slugStem(e.url));
      const outOfRange = (a) => (src.latest && a.date.slice(0, 7) > src.latest) || a.date.slice(0, 7) < src.earliest;
      row.years[y] = {
        sitemapUrls: perYear[y].sitemapUrls,
        A: Ay.length,
        B: By.length,
        AB: By.filter(matchesA).length,
        AnotB: Ay.filter((a) => !inB(a)).map((a) => ({
          url: a.url,
          reason: outOfRange(a) ? 'outside the sitemap\'s range'
            : found.has(a.key) ? `address does not name the subject${key(found.get(a.key).url) !== a.key ? ` (listed as ${found.get(a.key).url})` : ''}`
            : `missing from the sitemap${isCandidate(a.url) ? '' : ' (and the address does not name the subject)'}`,
        })),
        BnotA: By.filter((e) => !matchesA(e)).sort((p, q) => strength(p.url) - strength(q.url)).slice(0, 15).map((e) => ({ url: e.url, slug: key(e.url).split('/').filter(Boolean).pop() })),
      };
    }
    log(`sitemaps: ${o.name}: ${entries.length} addresses, ${B.length} candidates, ${found.size}/${A.length} coverage articles listed, ${files} files, ${row.seconds}s`);
  }));

  // Recall on address-matching candidates, pooled over the outlets whose addresses carry words.
  const pooledFrom = report.outlets.filter((r) => r.usable && !r.addressless);
  for (const y of years) {
    const sum = (k) => pooledFrom.reduce((s, r) => s + (r.years?.[y]?.[k] ?? 0), 0);
    const B = sum('B');
    report.pooled[y] = { A: sum('A'), B, AB: sum('AB'), recall: B ? Number((sum('AB') / B).toFixed(4)) : null };
  }
  report.pooledOutlets = pooledFrom.map((r) => r.domain);
  report.stats = { ...stats };
  report.outlets.sort((a, b) => cfg.outlets.findIndex((o) => o.name === a.name) - cfg.outlets.findIndex((o) => o.name === b.name));
  mkdirSync(RUNS, { recursive: true });
  writeFileSync(path.join(RUNS, 'sitemap-survey.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--survey')) {
  const args = process.argv.slice(2);
  const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  const t0 = Date.now();
  const r = await survey({ only: opt('--outlets')?.split(','), from: opt('--from') ?? '2020-01', to: opt('--to') });
  console.log('\noutlet                 usable  gran.          per month  candidates by year');
  for (const o of r.outlets) {
    const ys = o.years ? Object.entries(o.years).map(([y, v]) => `${y.slice(2)}:${v.AB}/${v.B}`).join(' ') : `${o.note ?? ''} ${o.probe ?? o.error ?? ''}`;
    console.log(`${o.name.padEnd(22)} ${String(o.usable).padEnd(7)} ${String(o.granularity ?? '').padEnd(14)} ${String(o.urlsPerMonth ?? '').padStart(9)}  ${ys}`);
  }
  console.log('\npooled (A∩B / B):', Object.entries(r.pooled).map(([y, v]) => `${y} ${v.AB}/${v.B}=${v.recall}`).join('  '));
  console.log(`${r.stats.requests} requests (${r.stats.cached} cached files), ${(r.stats.bytes / 1e6).toFixed(0)} MB, ${Math.round((Date.now() - t0) / 1000)}s`);
  process.exit(0);
}
