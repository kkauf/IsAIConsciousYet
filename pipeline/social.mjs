// Posts case files to X as the eye: a claim-first text with the details, and a square card image (social-card.mjs).
// No link in the post (a link post costs $0.20, a plain one $0.015). Gemini writes the text; code checks every
// quoted span against the case file's quotes, and rejects links, handles, hashtags and lengths out of range.
// The card variant rotates A → B → C so their reach can be compared (--metrics). Design: docs/social-posting.md.
// Usage: node pipeline/social.mjs [--dry-run [--out dir]] [--max n] [--metrics] [--summary summary.md] [--actionable actionable.txt]
// --dry-run   writes the next posts' texts and cards to --out (default pipeline/runs/social-preview), posts nothing
// --metrics   reads reach of every post so far (owned reads, $0.001 each) into the state, prints a table by variant
// Needs X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET (OAuth 1.0a user context of @AIConsciousYet) and
// GEMINI_API_KEY. Without the X keys it logs one line and exits 0.
// State: pipeline/state/social.json { x: { <slug>: { id, postedAt, updates, variant, text, metrics } } }.
// Logs are public: no keys, no page text.

import crypto from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, loadCases, loadConfig, loadSpend, saveSpend, addSpend, monthToDate, capCheck } from './state.mjs';
import { gemini, normalise, ledgerTotal } from './lib.mjs';
import { renderCard, VARIANTS } from './social-card.mjs';

const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const dryRun = args.includes('--dry-run');
const metricsMode = args.includes('--metrics');
const summaryPath = opt('--summary');
const actionablePath = opt('--actionable');
const outDir = opt('--out') ?? path.join(root, 'pipeline', 'runs', 'social-preview');
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

const fullConfig = loadConfig();
const config = fullConfig.social ?? {};
const statePath = path.join(root, 'pipeline', 'state', 'social.json');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { x: {} };
const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
// X API prices (docs.x.com/x-api/getting-started/pricing, 2026-09-28): post $0.015, media metadata $0.005, owned read $0.001.
const X_USD = { post: 0.015, metadata: 0.005, read: 0.001 };
let xSpent = 0;

// ── X API, OAuth 1.0a (HMAC-SHA1). Query parameters are signed; JSON and multipart bodies are not. ──
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
function oauthHeader(method, endpoint, query = {}) {
  const o = {
    oauth_consumer_key: process.env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  const all = { ...o, ...query };
  const params = Object.keys(all).sort().map((k) => `${enc(k)}=${enc(all[k])}`).join('&');
  const base = [method, enc(endpoint), enc(params)].join('&');
  const signingKey = `${enc(process.env.X_API_SECRET)}&${enc(process.env.X_ACCESS_SECRET)}`;
  o.oauth_signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  return 'OAuth ' + Object.keys(o).sort().map((k) => `${enc(k)}="${enc(o[k])}"`).join(', ');
}
async function x(method, endpoint, { query, json, form } = {}) {
  const url = query ? `${endpoint}?${new URLSearchParams(query)}` : endpoint;
  const headers = { authorization: oauthHeader(method, endpoint, query) };
  if (json) headers['content-type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: json ? JSON.stringify(json) : form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X ${res.status} ${endpoint.replace('https://api.x.com', '')}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}
async function uploadImage(png, alt) {
  const form = new FormData();
  form.append('media', new Blob([png], { type: 'image/png' }), 'card.png');
  form.append('media_category', 'tweet_image');
  form.append('media_type', 'image/png');
  const id = (await x('POST', 'https://api.x.com/2/media/upload', { form })).data.id;
  // Alt text is for screen readers; a failure here does not stop the post.
  await x('POST', 'https://api.x.com/2/media/metadata', { json: { id, metadata: { alt_text: { text: alt.slice(0, 1000) } } } })
    .then(() => { xSpent += X_USD.metadata; })
    .catch((e) => log(`X: alt text not set (${String(e.message).slice(0, 120)})`));
  return id;
}

const haveKeys = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'].every((k) => process.env[k]);

// ── --metrics: reach of every post so far ──
if (metricsMode) {
  if (!haveKeys) { log('X: secrets not set, metrics skipped'); process.exit(0); }
  const posted = Object.entries(state.x).filter(([, s]) => s.id);
  for (let i = 0; i < posted.length; i += 100) {
    const batch = posted.slice(i, i + 100);
    const r = await x('GET', 'https://api.x.com/2/tweets', { query: { ids: batch.map(([, s]) => s.id).join(','), 'tweet.fields': 'public_metrics' } });
    xSpent += X_USD.read * (r.data?.length ?? 0);
    for (const t of r.data ?? []) {
      const [, s] = batch.find(([, s]) => s.id === t.id);
      const m = t.public_metrics;
      s.metrics = { at: new Date().toISOString(), impressions: m.impression_count, likes: m.like_count, replies: m.reply_count, reposts: m.retweet_count, quotes: m.quote_count, bookmarks: m.bookmark_count };
    }
  }
  saveState();
  const median = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
  const rows = VARIANTS.map((v) => {
    const ms = Object.values(state.x).filter((s) => s.variant === v && s.metrics).map((s) => s.metrics);
    return `| ${v} | ${ms.length} | ${median(ms.map((m) => m.impressions))} | ${median(ms.map((m) => m.likes + m.replies + m.reposts + m.quotes + m.bookmarks))} |`;
  });
  const table = ['', '## X reach by card variant', '', '| Card | Posts | Median views | Median interactions |', '|---|---|---|---|', ...rows, ''].join('\n');
  console.log(table);
  if (summaryPath) appendFileSync(summaryPath, table);
  recordSpend();
  process.exit(0);
}

// ── what to post: case files not yet posted (newest event first), then updates ──
const live = loadCases().filter((c) => c.status === 'published' && (config.postMentions !== false || c.tier !== 'mention'));
const todo = [];
for (const c of [...live].sort((a, b) => (b.event.dateStart ?? '').localeCompare(a.event.dateStart ?? ''))) {
  const s = state.x[c.slug];
  if (!s) todo.push({ kind: 'new', c });
  else if ((c.updates?.length ?? 0) > (s.updates ?? 0)) todo.push({ kind: 'update', c });
}
todo.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'new' ? -1 : 1));

if (config.enabled === false && !dryRun) { log(`X: posting off in pipeline/config.json (${todo.length} post(s) waiting)`); process.exit(0); }
if (!dryRun && !haveKeys) { log(`X: secrets not set, skipped (${todo.length} post(s) waiting)`); process.exit(0); }

// ── the writer ──
const SYSTEM = `You write posts for @AIConsciousYet on X. The account is the eye of isaiconsciousyet.com, an archive of things AI systems did that nobody asked for, and of how named people read them. The eye is a witness: curious, exact, a little playful. It never gives a verdict on whether a system is conscious, intends anything, or feels anything, and never claims more than the case file says.

The post:
- First line: the boldest true claim in the case file, concrete and specific: which system, what it did, a number or a detail that makes people stop. No hedging words, no "reportedly".
- Then two to four short paragraphs with the details, from the case file only.
- Then at least two parties who read the event differently, each introduced by who they are. Use partyDescription when given ("Henry Shevlin, a philosopher and AI ethicist at Google DeepMind and Cambridge, …"). If a party has no description: an operator is named by name ("OpenAI's report says …"); anyone else is introduced only by the name as given and never with an invented role. When the description says unsigned post, say so plainly ("an unsigned post on Sorami argues …").
- Every party speaks in its own words: each reading you mention gets at least one quotation from its quote. Never paraphrase a reading or a report without quoting it.
- Last line: one short line that holds both readings open, a question or a contrast, without choosing between them.
- Use curly quotation marks “ ” for quotations (‘ ’ inside them), never straight ones. Put them only around words copied exactly from a reading's quote or a primary source's quote. You may drop words at the start or end and mark that with …, never in the middle.
- No links, no web addresses, no @handles, no hashtags, no emoji. Between 400 and 1000 characters. Plain words, short sentences.
For an update post, the first line starts with "Update:" and says what changed; then the event in one or two sentences, then the readings as above.

The card: "single" is the one most striking sentence from one reading's quote (reading index and the exact words, at most 140 characters, cut with … at the start or end if needed). "pair" is the two readings that disagree most (indexes and exact words, at most 90 characters each).`;
const excerptSchema = { type: 'object', required: ['reading', 'words'], properties: { reading: { type: 'integer' }, words: { type: 'string' } } };
const WRITE_SCHEMA = {
  type: 'object', required: ['text', 'single', 'pair'],
  properties: { text: { type: 'string' }, single: excerptSchema, pair: { type: 'object', required: ['left', 'right'], properties: { left: excerptSchema, right: excerptSchema } } },
};

const caseForWriter = (c, kind) => ({
  kind, title: c.title, date: c.event.dateStart, operator: c.event.operator, summary: c.event.summary, unaskedBehaviour: c.event.unaskedBehaviour,
  primarySourceQuotes: c.event.primarySources.map((s) => ({ publisher: s.publisher, quote: s.quote })),
  readings: c.readings.map((r, i) => ({ index: i, partyName: r.partyName, partyType: r.partyType, partyDescription: r.partyDescription ?? null, stanceLabel: r.stanceLabel, quote: r.quote })),
  whatWouldSettleIt: c.whatWouldSettleIt, ...(kind === 'update' ? { latestUpdate: c.updates.at(-1) } : {}),
});

const unquote = (s) => s.trim().replace(/^[“”"‘’']+|[“”"‘’']+$/g, '').trim();
// Quotes inside quotes turn “ ” into ‘ ’, so quotation marks do not count in the word-for-word check.
const norm = (s) => normalise(s).replace(/["']/g, '');
const stripEllipsis = (s) => unquote(s).replace(/^(…|\.\.\.)\s*/, '').replace(/\s*(…|\.\.\.)$/, '');
function problems(c, w) {
  const out = [];
  const sources = [...c.readings.map((r) => r.quote), ...c.event.primarySources.map((s) => s.quote)].map(norm);
  const verbatim = (s) => { const n = norm(stripEllipsis(s)); return n.length > 0 && sources.some((q) => q.includes(n)); };
  if (w.text.length < 250 || w.text.length > 1500) out.push(`text is ${w.text.length} characters; it must be 400 to 1000`);
  if (/https?:|www\.|\b[\w-]+\.(com|org|net|ai|io|co|uk|edu|gov|app|dev)\b/i.test(w.text)) out.push('text contains a link or web address');
  if (/(^|\s)[@#]\w/.test(w.text)) out.push('text contains an @handle or a hashtag');
  if (w.text.includes('"')) out.push('text uses straight quotation marks; use “ ” around quotations');
  for (const m of w.text.matchAll(/“([^”]+)”/g)) if (!verbatim(m[1])) out.push(`quoted words not found word for word in the case file (copy them exactly, or drop words only at the start or end): “${m[1].slice(0, 80)}”`);
  const ex = (e, max, name) => {
    if (!c.readings[e.reading]) return out.push(`${name}: reading ${e.reading} does not exist`);
    if (e.words.length > max) out.push(`${name}: ${e.words.length} characters, at most ${max}`);
    if (!norm(c.readings[e.reading].quote).includes(norm(stripEllipsis(e.words)))) out.push(`${name}: words not found in reading ${e.reading}'s quote; copy a continuous run of its words exactly, with … only at the start or end`);
  };
  ex(w.single, 170, 'single');
  if (c.readings.length >= 2) { ex(w.pair.left, 100, 'pair.left'); ex(w.pair.right, 100, 'pair.right'); if (w.pair.left.reading === w.pair.right.reading) out.push('pair: the two readings must differ'); }
  return out;
}
// A second read of the draft against the case file: statements that say more than the file, or other than it.
const CHECK_SCHEMA = { type: 'object', required: ['unsupported'], properties: { unsupported: { type: 'array', items: { type: 'string' }, description: 'Each statement in the post that the case file does not support, or that says more than it (a model, number, date, act or motive the file does not give). Empty when every statement is supported.' } } };
async function factCheck(c, kind, text) {
  const r = await gemini('social-check', { system: 'You compare a social media post with the case file it is based on. You list only real discrepancies of fact, never style.', prompt: `Case file:\n${JSON.stringify(caseForWriter(c, kind))}\n\nPost:\n${text}`, schema: CHECK_SCHEMA });
  return (r.unsupported ?? []).map((s) => `not supported by the case file: ${s}`);
}
async function write(c, kind) {
  let prompt = JSON.stringify(caseForWriter(c, kind), null, 1), w, p = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    w = await gemini('social-write', { system: SYSTEM, prompt, schema: WRITE_SCHEMA });
    p = problems(c, w);
    if (!p.length) p = await factCheck(c, kind, w.text);
    if (!p.length) return w;
    prompt += `\n\nYour previous draft had these problems; fix every one:\n- ${p.join('\n- ')}\n\nPrevious draft:\n${w.text}`;
  }
  throw new Error(`draft failed the checks: ${p.join('; ')}`);
}

// ── the card: the variant used least so far, C only when the case has two readings ──
const month = (d) => (d ? new Date(`${d.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
function card(c, w) {
  const used = Object.fromEntries(VARIANTS.map((v) => [v, Object.values(state.x).filter((s) => s.variant === v).length]));
  const variant = VARIANTS.filter((v) => v !== 'C' || c.readings.length >= 2).sort((a, b) => used[a] - used[b])[0];
  const side = (e) => { const r = c.readings[e.reading]; return { source: r.partyName, quote: unquote(e.words).replace(/“/g, '‘').replace(/”/g, '’'), date: r.date ?? c.event.dateStart }; // the card adds “ ” };
  if (variant === 'C') {
    const left = side(w.pair.left), right = side(w.pair.right);
    return { variant, data: { left, right }, alt: `${left.source}: “${left.quote}” ${right.source}: “${right.quote}”` };
  }
  const s = side(w.single);
  return { variant, data: { source: [s.source, month(s.date)].filter(Boolean).join(', '), quote: s.quote }, alt: `${s.source}: “${s.quote}”` };
}

// ── post ──
function recordSpend() {
  const usd = ledgerTotal().total + xSpent;
  if (dryRun || usd === 0) return;
  saveSpend(addSpend(loadSpend(), usd));
}
const max = Number(opt('--max') ?? config.maxPostsPerRun ?? 1);
const done = [], errors = [];
if (dryRun) mkdirSync(outDir, { recursive: true });
for (const { kind, c } of todo.slice(0, max)) {
  const cap = capCheck({ config: fullConfig, spentBefore: monthToDate(loadSpend()), spentThisRun: ledgerTotal().total + xSpent, estimate: 0.05, step: `X post for ${c.slug}` });
  if (cap && !dryRun) { errors.push(cap); break; }
  try {
    const w = await write(c, kind);
    const k = card(c, w);
    const png = await renderCard(k.variant, k.data);
    if (dryRun) {
      writeFileSync(path.join(outDir, `${c.slug}-${k.variant}.png`), png);
      writeFileSync(path.join(outDir, `${c.slug}.txt`), `${w.text}\n\n[card ${k.variant}] ${k.alt}\n`);
      console.log(`--- ${kind} ${c.slug} (card ${k.variant}, ${w.text.length} chars)\n${w.text}\n`);
      state.x[c.slug] = { variant: k.variant }; // so the dry run rotates like the live run; never saved
      continue;
    }
    const mediaId = await uploadImage(png, k.alt);
    const id = (await x('POST', 'https://api.x.com/2/tweets', { json: { text: w.text, media: { media_ids: [mediaId] } } })).data.id;
    xSpent += X_USD.post;
    state.x[c.slug] = { id, postedAt: new Date().toISOString(), updates: c.updates?.length ?? 0, variant: k.variant, text: w.text };
    saveState(); // after each post, so a later failure never re-posts this one
    done.push(`- ${kind === 'new' ? 'Posted' : 'Posted update'} (card ${k.variant}): [${c.title}](https://x.com/AIConsciousYet/status/${id})`);
    log(`X: posted ${kind} ${c.slug} card ${k.variant} (${id})`);
  } catch (e) {
    errors.push(`X post for ${c.slug}: ${String(e.message ?? e).slice(0, 300)}`);
    log(errors.at(-1));
    if (/\bX (401|402|403|429)\b/.test(String(e.message))) break; // auth, credits or rate limit: the rest would fail too
  }
}
if (todo.length > max) log(`X: ${todo.length - max} post(s) queued for later runs (max ${max} per run)`);
recordSpend();

if (summaryPath && (done.length || errors.length)) appendFileSync(summaryPath, ['', '## Posted to X', '', ...done, ...errors.map((e) => `- Error: ${e}`), ''].join('\n'));
if (actionablePath && errors.length) appendFileSync(actionablePath, errors.map((e) => `- Error: ${e}`).join('\n') + '\n');
