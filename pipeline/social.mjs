// Posts to X when a case file is published or updated. Fixed templates filled from the case file's fields;
// no model writes text, no replies, no @-mentions. Design: docs/social-posting.md.
// Usage: node pipeline/social.mjs [--dry-run] [--backfill] [--summary summary.md] [--actionable actionable.txt]
// --dry-run   prints the posts it would make, posts nothing, writes nothing
// --backfill  records every live case file as posted without posting (run once before the first live run)
// Needs X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET (OAuth 1.0a user context of the bot account).
// Without them it logs one line and exits 0, writing no state, so cases published meanwhile are posted once the keys exist.
// State: pipeline/state/social.json { x: { <slug>: { id, postedAt, updates } } }. Logs are public: no keys, no page text.

import crypto from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, loadCases, loadConfig } from './state.mjs';

const SITE_URL = 'https://isaiconsciousyet.com'; // same as src/lib/cases/load.ts
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const dryRun = args.includes('--dry-run');
const backfill = args.includes('--backfill');
const summaryPath = opt('--summary');
const actionablePath = opt('--actionable');
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

const config = loadConfig().social ?? {};
const statePath = path.join(root, 'pipeline', 'state', 'social.json');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { x: {} };
const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');

// ── what to post ──
const live = loadCases().filter((c) => c.status === 'published' && (config.postMentions !== false || c.tier !== 'mention'));
const url = (c) => `${SITE_URL}/cases/${c.slug}`;
const text = {
  new: (c) => c.tier === 'mention'
    ? `Honorable mention: ${c.title}\n\nNot yet a full case file. ${c.missingCriterion ?? ''}\n\n${url(c)}`
    : `New case file: ${c.title}\n\n${c.readings.length} readings by named people, each quoted word for word, and what would settle the disagreement.\n\n${url(c)}`,
  update: (c) => `Updated: ${c.title}\n\n${c.updates.at(-1).change}\n\n${url(c)}`,
};
const todo = [];
for (const c of live) {
  const s = state.x[c.slug];
  if (!s) todo.push({ kind: 'new', c });
  else if ((c.updates?.length ?? 0) > (s.updates ?? 0)) todo.push({ kind: 'update', c });
}
todo.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'new' ? -1 : 1));

if (backfill) {
  for (const { c } of todo) state.x[c.slug] = { id: null, postedAt: null, updates: c.updates?.length ?? 0, backfilled: new Date().toISOString().slice(0, 10) };
  if (!dryRun) saveState();
  log(`backfill: ${todo.length} case file(s) recorded as posted`);
  process.exit(0);
}

const keys = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'];
if (!dryRun && keys.some((k) => !process.env[k])) {
  log(`X: secrets not set, skipped (${todo.length} post(s) waiting)`);
  process.exit(0);
}

// ── OAuth 1.0a (HMAC-SHA1). A JSON body is not part of the signature base. ──
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
function oauthHeader(method, endpoint) {
  const o = {
    oauth_consumer_key: process.env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  const params = Object.keys(o).sort().map((k) => `${enc(k)}=${enc(o[k])}`).join('&');
  const base = [method, enc(endpoint), enc(params)].join('&');
  const signingKey = `${enc(process.env.X_API_SECRET)}&${enc(process.env.X_ACCESS_SECRET)}`;
  o.oauth_signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  return 'OAuth ' + Object.keys(o).sort().map((k) => `${enc(k)}="${enc(o[k])}"`).join(', ');
}
async function post(body) {
  const endpoint = 'https://api.x.com/2/tweets';
  const res = await fetch(endpoint, { method: 'POST', headers: { authorization: oauthHeader('POST', endpoint), 'content-type': 'application/json' }, body: JSON.stringify({ text: body }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json.data.id;
}
// A new page may still be deploying: post only once it answers 200, else leave it for the next run.
async function pageLive(u) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(u, { method: 'HEAD' }).catch(() => null);
    if (r?.status === 200) return true;
    await new Promise((ok) => setTimeout(ok, 15000));
  }
  return false;
}

// ── post ──
const max = config.maxPostsPerRun ?? 4;
const done = [];
const errors = [];
for (const { kind, c } of todo.slice(0, max)) {
  const body = text[kind](c);
  if (dryRun) { console.log(`--- ${kind} ${c.slug}\n${body}\n`); continue; }
  if (!(await pageLive(url(c)))) { log(`X: ${c.slug} not live yet, left for the next run`); continue; }
  try {
    const id = await post(body);
    state.x[c.slug] = { id, postedAt: new Date().toISOString(), updates: c.updates?.length ?? 0 };
    saveState(); // after each post, so a later failure never re-posts this one
    done.push(`- ${kind === 'new' ? 'Posted' : 'Posted update'}: [${c.title}](https://x.com/i/status/${id})`);
    log(`X: posted ${kind} ${c.slug} (${id})`);
  } catch (e) {
    errors.push(`X post for ${c.slug}: ${String(e.message ?? e).slice(0, 300)}`);
    log(errors.at(-1));
    if (/\b(401|402|403|429)\b/.test(String(e.message))) break; // auth, credits or rate limit: the rest would fail too
  }
}
if (todo.length > max) log(`X: ${todo.length - max} post(s) left for the next run (max ${max} per run)`);

if (summaryPath && (done.length || errors.length)) appendFileSync(summaryPath, ['', '## Posted to X', '', ...done, ...errors.map((e) => `- Error: ${e}`), ''].join('\n'));
if (actionablePath && errors.length) appendFileSync(actionablePath, errors.map((e) => `- Error: ${e}`).join('\n') + '\n');
