// API clients, cost ledger and text helpers for the case-file pipeline.
// Design: docs/pipeline.md. Keys come from process.env only and are never logged.

import { createHash } from 'node:crypto';

// Unit prices in USD, checked 2026-09-21 against the providers' pricing pages.
// Gemini 3.8 Flash doubles on 2027-01-01.
export const PRICES = {
  gemini: { model: 'gemini-3.8-flash', inPerM: 0.75, outPerM: 3.75 },
  jev: { model: 'jev-latest', inPerM: 0.042 },
  parallelTask: { lite: 0.005, base: 0.01, core: 0.025, core2x: 0.05, pro: 0.1, ultra: 0.3 },
  parallelExtractPerUrl: 0.001,
};

export const ledger = [];
function charge(step, provider, detail, usd) {
  ledger.push({ step, provider, ...detail, usd: Number(usd.toFixed(6)) });
}
export function ledgerTotal() {
  const byProvider = {};
  for (const l of ledger) byProvider[l.provider] = (byProvider[l.provider] || 0) + l.usd;
  const total = Object.values(byProvider).reduce((a, b) => a + b, 0);
  return { total: Number(total.toFixed(4)), byProvider };
}

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

async function http(url, init, { timeoutMs = 120000, retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = null; }
      return { ok: res.ok, status: res.status, json, text };
    } catch (e) {
      if (attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
}

// ── parallel.ai ──────────────────────────────────────────────────────────────

export async function parallelTask(step, { input, schema, processor = 'pro' }) {
  const headers = { 'x-api-key': need('PARALLEL_API_KEY'), 'content-type': 'application/json' };
  const created = await http('https://api.parallel.ai/v1/tasks/runs', {
    method: 'POST',
    headers,
    body: JSON.stringify({ input, processor, task_spec: { output_schema: { type: 'json', json_schema: schema } } }),
  });
  if (!created.ok) throw new Error(`parallel task create ${created.status}: ${created.text.slice(0, 300)}`);
  const runId = created.json.run_id;
  // The result endpoint blocks until done or its own timeout; poll until it returns a result.
  for (let i = 0; i < 40; i++) {
    const r = await http(`https://api.parallel.ai/v1/tasks/runs/${runId}/result?timeout=300`, { headers }, { timeoutMs: 320000, retries: 1 });
    if (r.ok && r.json?.output) {
      charge(step, 'parallel', { kind: 'task', processor, runId }, PRICES.parallelTask[processor] ?? 0);
      return { runId, content: r.json.output.content, basis: r.json.output.basis ?? [] };
    }
    if (r.status !== 408 && r.status !== 202 && r.status !== 504) {
      throw new Error(`parallel task result ${r.status}: ${r.text.slice(0, 300)}`);
    }
  }
  throw new Error(`parallel task ${runId} did not finish`);
}

export async function parallelExtract(step, urls) {
  const out = {};
  for (let i = 0; i < urls.length; i += 5) {
    const batch = urls.slice(i, i + 5);
    const r = await http('https://api.parallel.ai/v1/extract', {
      method: 'POST',
      headers: { 'x-api-key': need('PARALLEL_API_KEY'), 'content-type': 'application/json' },
      body: JSON.stringify({ urls: batch, advanced_settings: { full_content: true } }),
    }, { timeoutMs: 180000 });
    if (!r.ok) {
      for (const u of batch) out[u] = { error: `extract ${r.status}: ${r.text.slice(0, 200)}` };
      continue;
    }
    for (const res of r.json.results ?? []) {
      out[res.url] = { title: res.title ?? '', published: res.publish_date ?? null, text: res.full_content ?? '' };
    }
    for (const err of r.json.errors ?? []) out[err.url] = { error: `${err.error_type ?? 'error'}: ${err.content ?? ''}`.slice(0, 200) };
    const okCount = (r.json.results ?? []).length;
    charge(step, 'parallel', { kind: 'extract', urls: okCount }, okCount * PRICES.parallelExtractPerUrl);
  }
  return out;
}

// ── Gemini (Google AI Studio) ────────────────────────────────────────────────

export async function gemini(step, { system, prompt, schema }) {
  const model = process.env.DRAFT_MODEL || PRICES.gemini.model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseJsonSchema: schema },
  };
  // Thinking tokens bill as output; selection and short drafting do not need much.
  body.generationConfig.thinkingConfig = { thinkingLevel: 'low' };
  const call = () => http(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': need('GEMINI_API_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }, { timeoutMs: 180000 });
  let r = await call();
  if (r.status === 400 && /thinking/i.test(r.text)) { delete body.generationConfig.thinkingConfig; r = await call(); }
  if (!r.ok) throw new Error(`gemini ${r.status}: ${r.text.slice(0, 300)}`);
  const u = r.json.usageMetadata ?? {};
  const inTok = u.promptTokenCount ?? 0;
  const outTok = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
  charge(step, 'gemini', { model, inTok, outTok }, (inTok * PRICES.gemini.inPerM + outTok * PRICES.gemini.outPerM) / 1e6);
  const text = r.json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try { return JSON.parse(text); } catch { throw new Error(`gemini returned non-JSON at ${step}: ${text.slice(0, 200)}`); }
}

// ── Jev (TypeSafe): typed judgments, no generated text ───────────────────────

export async function jev(step, state, questions) {
  const r = await http('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { authorization: `Bearer ${need('TYPESAFE_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ state, model: PRICES.jev.model, questions }),
  });
  if (!r.ok) throw new Error(`jev ${r.status}: ${r.text.slice(0, 300)}`);
  const inTok = r.json.usage?.input_tokens ?? 0;
  charge(step, 'jev', { model: r.json.model, inTok }, (inTok * PRICES.jev.inPerM) / 1e6);
  return r.json.answers;
}

// Marks readings that say something about what the system is (agency, intentions,
// inner life, experience) rather than only retelling the event or judging the danger.
// The case page shows these first. Code sets the flag from Jev's probability.
export const ABOUT_NATURE_THRESHOLD = 0.6;
export async function markAboutNature(event, readings) {
  const q = Object.fromEntries(readings.map((r, i) => [`r${i}`, { type: 'noul', instructions: `Does \`readings[${i}].quote\` make a claim about the nature of the AI system in \`event\`: its agency, intentions, inner life, experience, or which words fit what it did?`, criteria: { true: 'The quote says what the system is, what its behaviour reveals about it, or whether mental or intentional language fits it', false: 'The quote only retells what happened, or judges danger, security, blame, responsibility or regulation' } }]));
  const a = await jev('about-nature', { event, readings: readings.map((r) => ({ party: r.partyName, quote: r.quote })) }, q);
  return readings.map((r, i) => ({ ...r, aboutNature: a[`r${i}`].noul >= ABOUT_NATURE_THRESHOLD, _p: a[`r${i}`].noul }));
}

// ── Wayback Machine (best effort, free) ──────────────────────────────────────

export async function waybackSnapshot(url) {
  try {
    const r = await http(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, {}, { timeoutMs: 20000, retries: 0 });
    return r.json?.archived_snapshots?.closest?.url ?? null;
  } catch { return null; }
}

// ── text helpers ─────────────────────────────────────────────────────────────

// Normalisation for the literal quote check: the comparison must survive smart
// quotes, dashes, markdown emphasis and line wrapping, and nothing else.
export function normalise(s) {
  return s
    .normalize('NFKC')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown links → link text
    .replace(/[*_`>#]/g, '')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/­/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function findQuote(pageText, quote) {
  const page = normalise(pageText);
  const q = normalise(quote);
  const at = q.length >= 20 ? page.indexOf(q) : -1;
  if (at < 0) return null;
  // The gate is the match above. The window is context for the speaker check, taken from
  // the raw page where possible, because blockquote markers and casing show who is speaking.
  return { window: rawWindow(pageText, quote) ?? page.slice(Math.max(0, at - 1200), at + q.length + 600) };
}

function rawWindow(pageText, quote) {
  const flat = (s) => s.normalize('NFKC').replace(/[\u2018\u2019\u201A\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"').replace(/[\u2010-\u2015\u2212]/g, '-');
  const hay = flat(pageText);
  const tokens = flat(quote).replace(/[*_`>#]/g, '').split(/\s+/).filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  let m;
  try { m = new RegExp(tokens.join('[\\s*_`>#]+'), 'i').exec(hay); } catch { return null; }
  return m ? hay.slice(Math.max(0, m.index - 1500), m.index + m[0].length + 700) : null;
}

export const shortHash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);
