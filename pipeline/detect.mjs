// Detect + triage: one parallel.ai Task finds recent events that may meet inclusion rule (b),
// Version 2 (AGENTS.md rule 5); one Jev call routes the batch. Design: docs/pipeline.md § Detect, § Triage.
// Usage: pipeline/run.sh detect.mjs [--processor base] [--write] [--from pipeline/runs/_detect/<file>.json]
// Without --write it only prints titles and routes; with it, new events become seeds and
// every candidate is recorded in pipeline/state/candidates.json. auto.mjs imports detect().

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parallelTask, jev, PRICES } from './lib.mjs';
import { root, loadConfig, loadCandidates, saveCandidates, loadCases, loadSeeds, writeSeed, seedExists, urlKey } from './state.mjs';

const FIT = 0.5; // rule (b) probability at or above which a candidate goes on to research
const SAME = 0.5; // same-event probability at or above which a candidate is not a new event

const DETECT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['events'],
  properties: {
    events: {
      type: 'array',
      description: 'Events or findings publicly disclosed in the time window. Empty if there are none. At most 10.',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'short_name', 'date', 'operator', 'description', 'primary_url', 'hint_urls'],
        properties: {
          title: { type: 'string', description: 'Neutral title, under 12 words, no verbs that attribute intent to the AI system.' },
          short_name: { type: 'string', description: '2 to 5 lowercase English words joined by hyphens, naming the operator and the subject, e.g. "openai-hugging-face".' },
          date: { type: 'string', description: 'ISO date (YYYY-MM-DD) of the disclosure or of the behaviour.' },
          operator: { type: 'string', description: 'Organisation that built or ran the AI system.' },
          description: { type: 'string', description: 'Neutral factual description, under 90 words: what the system did or what was observed. Say "reportedly" for anything not in the primary document. No mental-state verbs about the system in your own voice.' },
          primary_url: { type: 'string', description: 'Exact URL of the first-hand document from the operator or the affected party (report, blog post, paper). Not news coverage.' },
          hint_urls: { type: 'array', items: { type: 'string' }, description: 'Up to 4 other pages: further first-hand documents, or articles where named people interpret the event.' },
        },
      },
    },
  },
};

function detectInput(config, known) {
  const since = new Date(Date.now() - config.lookbackDays * 864e5).toISOString().slice(0, 10);
  return [
    `Find events or findings about AI systems that were publicly disclosed on or after ${since}.`,
    'Include only events that do not fit the story "AI is a machine that does the work we ask": an AI system did something its operators did not ask for or expect,',
    'or a finding was published about a system\'s inner workings, self-description, identity or apparent experience (for example interpretability results, model welfare assessments, self-reports, or unexpected behaviour in evaluations or deployment).',
    'Each event needs a first-hand document published by the operator of the system or by the affected party. Leave out product launches, benchmark results, capability announcements, policy papers, opinion essays and incidents caused by humans.',
    `Check these pages first, then search more widely: ${config.sources.map((s) => s.url).join(' , ')}`,
    known.length ? `Already known, do not list again: ${known.join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}

function shortName(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 5).join('-') || 'event';
}
function slugFor(ev) {
  const ym = /^\d{4}-\d{2}/.test(ev.date) ? ev.date.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const base = `${ym}-${shortName(ev.short_name || ev.title)}`;
  let slug = base;
  for (let n = 2; seedExists(slug); n++) slug = `${base}-${n}`;
  return slug;
}

// Returns { candidates, processor, runId }. Each candidate carries route, reason and, for new events, a seed.
// fromFile: reuse the events of an earlier detect run (pipeline/runs/_detect/*.json) instead of paying for a new task.
export async function detect({ processor, write = false, fromFile, log = console.log } = {}) {
  const config = loadConfig();
  processor ??= config.detectProcessor ?? 'base';
  const state = loadCandidates();
  const cases = loadCases().filter((c) => c.status !== 'withdrawn');
  const seeds = loadSeeds();

  // Known events, for the prompt and for the same-event judgment.
  const known = [
    ...cases.map((c) => ({ id: `case:${c.slug}`, kind: 'case', slug: c.slug, text: `${c.title} (${c.event.operator}, ${c.event.dateStart}${c.event.dateEnd ? ` to ${c.event.dateEnd}` : ''}). ${c.event.unaskedBehaviour} ${c.event.summary}`.slice(0, 700), urls: c.event.primarySources.map((s) => s.url).slice(0, 4) })),
    ...seeds.filter((s) => !cases.some((c) => c.slug === s.slug)).map((s) => ({ id: `seed:${s.slug}`, kind: 'seed', slug: s.slug, text: s.event.slice(0, 400), urls: (s.hintUrls ?? []).slice(0, 3) })),
    ...state.candidates.filter((c) => c.route !== 'duplicate').slice(-120).map((c, i) => ({ id: `seen:${i}`, kind: 'seen', slug: c.seed ?? null, text: `${c.title} (${c.operator ?? ''}, ${c.date ?? ''}). ${c.description ?? ''}`.slice(0, 400) })),
  ];
  const seenUrls = new Map();
  for (const c of state.candidates) seenUrls.set(urlKey(c.url), `earlier candidate "${c.title}" (${c.route})`);
  for (const s of seeds) for (const u of s.hintUrls ?? []) if (!seenUrls.has(urlKey(u))) seenUrls.set(urlKey(u), `seed ${s.slug}`);
  for (const c of cases) for (const s of c.event.primarySources) if (!seenUrls.has(urlKey(s.url))) seenUrls.set(urlKey(s.url), `case file ${c.slug}`);

  let r;
  if (fromFile) {
    r = JSON.parse(await readFile(fromFile, 'utf8'));
    r.content = { events: r.events };
    log(`detect: reused ${r.events.length} events from ${fromFile}`);
  } else {
    log(`detect: parallel.ai task (${processor}), lookback ${config.lookbackDays} days …`);
    const t0 = Date.now();
    const promptKnown = [...cases.map((c) => c.title), ...seeds.map((s) => s.event.split('. ')[0].slice(0, 120))];
    r = await parallelTask('detect', { input: detectInput(config, promptKnown), schema: DETECT_SCHEMA, processor });
    log(`detect: ${(r.content.events ?? []).length} events in ${Math.round((Date.now() - t0) / 1000)}s`);
    await mkdir(path.join(root, 'pipeline', 'runs', '_detect'), { recursive: true });
    await writeFile(path.join(root, 'pipeline', 'runs', '_detect', `${new Date().toISOString().slice(0, 19).replace(/:/g, '')}-${processor}.json`), JSON.stringify({ runId: r.runId, events: r.content.events ?? [], basis: r.basis }, null, 2));
  }
  const events = (r.content.events ?? []).filter((e) => e.title && e.primary_url);

  const firstSeen = new Date().toISOString().slice(0, 10);
  const base = (e) => ({ url: e.primary_url, title: e.title, firstSeen, date: e.date, operator: e.operator, description: e.description, hintUrls: e.hint_urls ?? [] });
  const out = [];
  const toTriage = [];
  for (const e of events) {
    const hit = seenUrls.get(urlKey(e.primary_url));
    if (hit) out.push({ ...base(e), route: 'duplicate', reason: `URL already seen: ${hit}` });
    else if (toTriage.some((t) => urlKey(t.primary_url) === urlKey(e.primary_url))) out.push({ ...base(e), route: 'duplicate', reason: 'URL repeated in this batch' });
    else toTriage.push(e);
  }

  // Triage: one Jev call for the whole batch. Rule (b) as a probability; same event as a choice over known items and earlier candidates in this batch.
  if (toTriage.length) {
    const jstate = {
      candidates: toTriage.map((e) => ({ title: e.title, date: e.date, operator: e.operator, description: e.description, primary_url: e.primary_url })),
      known: known.map((k) => ({ id: k.id, event: k.text, ...(k.urls ? { urls: k.urls } : {}) })),
    };
    const q = {};
    toTriage.forEach((e, i) => {
      q[`fit${i}`] = {
        type: 'noul',
        instructions: `Does \`candidates[${i}]\` report an event or finding that does not fit the story "AI is a machine that does the work we ask"?`,
        criteria: {
          true: 'An AI system did something its operators did not ask for or expect, or a finding was published about a system\'s inner workings, self-description, identity or apparent experience',
          false: 'A product launch, benchmark, capability announcement, policy, opinion essay, funding news, or an incident caused by humans; the system did what it was asked',
        },
      };
      const criteria = { none: 'None of the listed items reports this event or finding. A similar kind of behaviour in a different incident, in a different system, training run or evaluation, or at a different time, is a different event.' };
      known.forEach((k, j) => { criteria[k.id] = `\`known[${j}]\``; });
      for (let j = 0; j < i; j++) criteria[`batch:${j}`] = `\`candidates[${j}]\``;
      q[`same${i}`] = {
        type: 'choice',
        instructions: `Which item reports the same event or finding as \`candidates[${i}]\`? The same event means the same underlying incident or research result (same system, same time, same setting), including a follow-up report, a fact-check or coverage of it. Different incidents involving the same company, or similar behaviour observed elsewhere, are different events.`,
        criteria,
      };
    });
    const a = await jev('triage', jstate, q);
    toTriage.forEach((e, i) => {
      const fit = a[`fit${i}`].noul;
      const same = a[`same${i}`];
      const matchId = same.choice !== 'none' && same.probabilities[same.choice] >= SAME ? same.choice : null;
      const match = matchId?.startsWith('batch:') ? { kind: 'batch', text: toTriage[Number(matchId.slice(6))].title } : known.find((k) => k.id === matchId);
      const c = { ...base(e), jev: { fit: Number(fit.toFixed(2)), same: matchId ? Number(same.probabilities[matchId].toFixed(2)) : null } };
      if (fit < FIT) out.push({ ...c, route: 'no-fit', reason: `rule (b) p=${fit.toFixed(2)} < ${FIT}` });
      else if (match?.kind === 'case') out.push({ ...c, route: 'update', case: match.slug, reason: `same event as case file ${match.slug} (p=${c.jev.same})` });
      else if (match) out.push({ ...c, route: 'duplicate', reason: `same event as ${match.kind === 'seed' ? `seed ${match.slug}` : match.kind === 'batch' ? `"${match.text}" in this batch` : `earlier candidate "${match.text.split('. ')[0]}"`} (p=${c.jev.same})` });
      else out.push({ ...c, route: 'new', reason: `rule (b) p=${fit.toFixed(2)}, no known match`, _event: e });
    });
  }

  for (const c of out.filter((x) => x.route === 'new')) {
    const e = c._event; delete c._event;
    c.seed = slugFor(e);
    c.status = 'pending';
    const seed = { slug: c.seed, event: `${e.description} (${e.operator}, ${e.date}.)`, hintUrls: [...new Set([e.primary_url, ...(e.hint_urls ?? [])])] };
    if (write) writeSeed(seed); else c._seedPreview = seed;
  }
  if (write) {
    // A URL already in candidates.json is not recorded twice; the 21-day window returns the same events for three weeks.
    const inState = new Set(state.candidates.map((c) => urlKey(c.url)));
    state.candidates.push(...out.filter((c) => !inState.has(urlKey(c.url))).map(({ _seedPreview, ...c }) => c));
    saveCandidates(state);
  }
  return { candidates: out, processor, runId: r.runId, estimate: fromFile ? 0 : PRICES.parallelTask[processor] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const processor = args.includes('--processor') ? args[args.indexOf('--processor') + 1] : undefined;
  const { ledgerTotal } = await import('./lib.mjs');
  const fromFile = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined;
  const res = await detect({ processor, fromFile, write: args.includes('--write') });
  for (const c of res.candidates) console.log(`- [${c.route}] ${c.date} ${c.title}\n    ${c.url}\n    ${c.reason}${c.seed ? `\n    seed: ${c.seed}` : ''}`);
  console.log(`cost: $${ledgerTotal().total}`, JSON.stringify(ledgerTotal().byProvider));
}
