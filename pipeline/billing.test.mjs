// Unit tests for provider billing stops (lib.mjs BillingStop). Run: npm run test:unit (no network, no keys).
// Bodies are the real ones seen on 2026-10-26: Gemini 429 spend cap, Parallel 402 insufficient credit.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { gemini, jev, ledger, parallelTask, parallelExtract, isBillingStop, billingStops, _resetBillingStops } from './lib.mjs';
import { triage } from './detect.mjs';

const GEMINI_CAP = JSON.stringify({ error: { code: 429, message: 'Your project has exceeded its monthly spending cap. Please go to AI Studio at https://ai.studio/spend to manage your project spend cap.', status: 'RESOURCE_EXHAUSTED' } });
const GEMINI_RATE = JSON.stringify({ error: { code: 429, message: 'You exceeded your current quota, please check your plan and billing details.', status: 'RESOURCE_EXHAUSTED' } });
const PARALLEL_402 = JSON.stringify({ type: 'error', error: { message: 'Insufficient credit in account. Please add credits to continue.' } });

const realFetch = globalThis.fetch;
let calls;
const respond = (status, body) => { globalThis.fetch = async (url) => { calls.push(String(url)); return new Response(body, { status }); }; };
beforeEach(() => {
  calls = [];
  _resetBillingStops();
  Object.assign(process.env, { GEMINI_API_KEY: 'k', PARALLEL_API_KEY: 'k', TYPESAFE_API_KEY: 'k', OPENROUTER_API_KEY: 'k', DRAFT_MODEL: 'gemini-3.8-flash' });
});
afterEach(() => { globalThis.fetch = realFetch; });
const args = { system: 's', prompt: 'p', schema: { type: 'object' } };

test('Gemini spend cap: BillingStop with a plain line, no retry, no further calls', async () => {
  respond(429, GEMINI_CAP);
  await assert.rejects(gemini('select-reading', args), (e) => isBillingStop(e) && e.provider === 'gemini' && e.message === 'Billing: Gemini spend cap reached or prepaid credits empty (ai.studio/spend, Billing)');
  assert.equal(calls.length, 1, 'a spend cap is not retried like a rate limit');
  await assert.rejects(gemini('select-primary', args), isBillingStop);
  assert.equal(calls.length, 1, 'no call after the provider said it is out of money');
  assert.deepEqual(billingStops().map((b) => b.provider), ['gemini']);
});

test('Gemini rate-limit 429 stays an ordinary error after its retries', { timeout: 20000 }, async () => {
  respond(429, GEMINI_RATE);
  await assert.rejects(gemini('select-reading', args), (e) => !isBillingStop(e) && /^gemini 429/.test(e.message));
  assert.equal(calls.length, 3, 'two retries, as before');
  assert.equal(billingStops().length, 0);
});

test('Parallel 402: extract and task stop, the provider is not called again', async () => {
  respond(402, PARALLEL_402);
  await assert.rejects(parallelExtract('extract', ['https://a.example']), (e) => isBillingStop(e) && e.provider === 'parallel' && /^Billing: Parallel/.test(e.message));
  await assert.rejects(parallelTask('research', { input: 'x', schema: {} }), isBillingStop);
  assert.equal(calls.length, 1);
});

test('Jev 402 is a billing stop; other Jev errors are not', async () => {
  respond(400, '{"detail":{"error_type":"max_tokens_exceeded"}}');
  await assert.rejects(jev('gate3', {}, {}), (e) => !isBillingStop(e));
  respond(402, '{"detail":"Payment required"}');
  await assert.rejects(jev('gate3', {}, {}), (e) => isBillingStop(e) && e.provider === 'jev');
});

test('triage passes a billing stop up instead of listing it as a triage error', async () => {
  respond(402, '{"detail":"Payment required"}');
  const cand = { title: 'Event', date: '2026-10-24', operator: 'Lab', description: 'x', primary_url: 'https://e.example' };
  await assert.rejects(triage([cand], [], { log: () => {} }), isBillingStop);
});

test('a billing stop keeps the provider\'s own words, so a spend cap and a depleted prepayment can be told apart', async () => {
  respond(429, GEMINI_CAP);
  await assert.rejects(gemini('select-reading', args), (e) => isBillingStop(e) && e.detail.startsWith('429: Your project has exceeded its monthly spending cap.'));
});

test('Gemini 402 "prepayment credits are depleted" (seen 2026-11-03) is a billing stop', async () => {
  respond(402, JSON.stringify({ error: { code: 402, message: 'Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.', status: 'RESOURCE_EXHAUSTED' } }));
  await assert.rejects(gemini('select-reading', args), (e) => isBillingStop(e) && e.provider === 'gemini');
});

test('a model id with a slash goes to OpenRouter; the ledger charges usage.cost', async () => {
  process.env.DRAFT_MODEL = 'deepseek/deepseek-v4.1-flash';
  respond(200, JSON.stringify({ model: 'deepseek/deepseek-v4.1-flash', choices: [{ message: { content: '{"found":true}' } }], usage: { prompt_tokens: 100, completion_tokens: 10, cost: 0.0123 } }));
  const before = ledger.length;
  assert.deepEqual(await gemini('select-reading', { ...args, schema: { type: 'object', required: ['found'] } }), { found: true });
  assert.match(calls[0], /^https:\/\/openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.deepEqual(ledger.slice(before).map((l) => [l.provider, l.usd]), [['openrouter', 0.0123]]);
});

test('OpenRouter 402 is a billing stop for OpenRouter only', async () => {
  process.env.DRAFT_MODEL = 'deepseek/deepseek-v4.1-flash';
  respond(402, JSON.stringify({ error: { code: 402, message: 'Insufficient credits. Add more using https://openrouter.ai/settings/credits' } }));
  await assert.rejects(gemini('select-reading', args), (e) => isBillingStop(e) && e.provider === 'openrouter');
  assert.deepEqual(billingStops().map((b) => b.provider), ['openrouter']);
});

// Each model id reaches its own provider and comes back as parsed JSON (2026-11-14: an edit dropped the Gemini
// route and these tests still passed, because every test above stubs the route it calls).
const ROUTE_REPLY = {
  'generativelanguage.googleapis.com': { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: {} },
  'openrouter.ai': { choices: [{ message: { content: '{"ok":true}' } }], usage: { cost: 0 } },
  'api.anthropic.com': { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', content: [{ type: 'text', text: '{"ok":true}' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } },
};
for (const [model, provider, host] of [['gemini-3.8-flash', 'gemini', 'generativelanguage.googleapis.com'], ['anthropic/claude-haiku-5.5', 'openrouter', 'openrouter.ai'], ['claude-haiku-5-5', 'anthropic', 'api.anthropic.com']]) {
  test(`route: ${model} goes to ${provider}`, async () => {
    process.env.DRAFT_MODEL = model; process.env.ANTHROPIC_API_KEY = 'k';
    globalThis.fetch = async (url) => { calls.push(String(url)); return new Response(JSON.stringify(ROUTE_REPLY[new URL(String(url)).host]), { status: 200, headers: { 'content-type': 'application/json' } }); };
    const n = ledger.length;
    assert.deepEqual(await gemini('draft', { ...args, schema: { type: 'object', required: ['ok'] } }), { ok: true });
    assert.ok(calls.every((u) => new URL(u).host === host), calls.join(' '));
    assert.equal(ledger.at(-1).provider, provider);
    assert.ok(ledger.length > n);
    delete process.env.ANTHROPIC_API_KEY;
  });
}

test('Claude API key rejected: the same model runs on OpenRouter, the stop is recorded', async () => {
  process.env.DRAFT_MODEL = 'claude-haiku-5-5'; process.env.ANTHROPIC_API_KEY = 'k';
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (new URL(String(url)).host === 'api.anthropic.com') return new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(ROUTE_REPLY['openrouter.ai']), { status: 200 });
  };
  assert.deepEqual(await gemini('draft', { ...args, schema: { type: 'object', required: ['ok'] } }), { ok: true });
  assert.equal(ledger.at(-1).provider, 'openrouter');
  assert.equal(ledger.at(-1).model, 'anthropic/claude-haiku-5.5');
  assert.deepEqual(billingStops().map((b) => b.provider), ['anthropic']);
  delete process.env.ANTHROPIC_API_KEY;
});
