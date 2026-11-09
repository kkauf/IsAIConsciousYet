// Unit tests for detect triage batching. Run: npm run test:unit (no network, no keys).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triage, triageState, planRequests, JEV_LIMITS, knownItems, nameMatch, sameMatch, slugBase } from './detect.mjs';
import { loadCandidates, loadCases, loadRedirects } from './state.mjs';

const cand = (i, len = 300) => ({ title: `Event ${i}`, date: '2026-10-24', operator: 'Lab', description: 'x'.repeat(len), primary_url: `https://e.example/${i}` });
const item = (kind, i, len = 400) => ({ id: `${kind}:${i}`, kind, slug: `s${i}`, text: 'k'.repeat(len), urls: ['https://a.example', 'https://b.example', 'https://c.example'] });
const quiet = () => {};
// Answers every question; throws max_tokens_exceeded when the body is over the request limit, like Jev.
const fakeJev = (limits, calls, failTitle) => async (_step, state, q) => {
  calls.push(Object.keys(q).length / 2);
  if (Math.ceil(JSON.stringify({ state, q }).length / limits.charsPerToken) > limits.request) throw new Error('jev 400: {"detail":{"error_type":"max_tokens_exceeded"}}');
  const out = {};
  for (const k of Object.keys(q)) {
    const i = Number(k.replace(/\D/g, ''));
    if (state.candidates[i].title === failTitle) throw new Error('jev 400: {"detail":{"error_type":"max_tokens_exceeded"}}');
    out[k] = k.startsWith('fit') ? { noul: 0.9 } : { choice: 'none', probabilities: { none: 0.9 } };
  }
  return out;
};

test('a large batch is split over several requests, each under the limit', async () => {
  const known = [...Array(40)].map((_, i) => item('case', i)).concat([...Array(150)].map((_, i) => item('seen', i)));
  const toTriage = [...Array(40)].map((_, i) => cand(i));
  const calls = [];
  const { answers, errors } = await triage(toTriage, known, { log: quiet, jevFn: fakeJev(JEV_LIMITS, calls) });
  assert.equal(errors.length, 0);
  assert.equal(answers.filter(Boolean).length, 40);
  assert.ok(calls.length > 1, `expected several requests, got ${calls.length}`);
});

test('the shared state shrinks until one question fits beside it', () => {
  const known = [...Array(20)].map((_, i) => item('case', i, 700)).concat([...Array(300)].map((_, i) => item('seen', i, 700)));
  const toTriage = [...Array(30)].map((_, i) => cand(i, 2000));
  const { state, known: kept } = triageState(toTriage, known);
  assert.ok(kept.length < known.length, 'oldest seen items dropped');
  assert.equal(kept.filter((k) => k.kind === 'case').length, 20, 'case files never dropped');
  assert.ok(state.candidates.every((c) => c.description.length <= 600), 'candidate text capped');
  const tokens = Math.ceil(JSON.stringify(state).length / JEV_LIMITS.charsPerToken);
  assert.ok(tokens < JEV_LIMITS.question);
  for (const g of planRequests(toTriage, kept, tokens)) assert.ok(g.length >= 1);
});

test('one candidate that Jev rejects fails alone', async () => {
  const known = [...Array(10)].map((_, i) => item('case', i));
  const toTriage = [...Array(8)].map((_, i) => cand(i));
  const calls = [];
  const { answers, errors } = await triage(toTriage, known, { log: quiet, jevFn: fakeJev(JEV_LIMITS, calls, 'Event 5') });
  assert.equal(answers.filter(Boolean).length, 7);
  assert.equal(answers[5], undefined);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Event 5/);
});

test('a failure that is not about size does not split the request', async () => {
  const toTriage = [...Array(8)].map((_, i) => cand(i));
  let n = 0;
  const { answers, errors } = await triage(toTriage, [item('case', 0)], { log: quiet, jevFn: async () => { n++; throw new Error('jev 401: bad key'); } });
  assert.equal(n, 1);
  assert.equal(answers.filter(Boolean).length, 0);
  assert.equal(errors.length, 1);
});

// ── same event → update of the case file, not a second case file (2026-11-08: 41 case files merged into 7) ──
const kase = (slug, operator = 'OpenAI') => ({ slug, title: slug, status: 'published', event: { operator, dateStart: '2026-07-09', unaskedBehaviour: '', summary: '', primarySources: [{ url: `https://e.example/${slug}` }] } });

test('each event is listed once: no update candidates, retired seeds or merged candidates beside the case file', () => {
  const cases = [kase('2026-07-openai-hugging-face')];
  const seeds = [{ slug: '2026-10-openai-hugging-face-law', event: 'x' }, { slug: '2026-11-other', event: 'y' }];
  const candidates = [
    { route: 'update', case: '2026-07-openai-hugging-face', title: 'follow-up' },
    { route: 'new', seed: '2026-10-openai-hugging-face-law', mergedInto: '2026-07-openai-hugging-face', title: 'retired' },
    { route: 'no-fit', title: 'kept' },
  ];
  const ids = knownItems(cases, seeds, candidates, { '2026-10-openai-hugging-face-law': '2026-07-openai-hugging-face' }).map((k) => k.id);
  assert.deepEqual(ids, ['case:2026-07-openai-hugging-face', 'seed:2026-11-other', 'seen:0']);
});

test('a short name that contains a case file name, by the same operator, is that case', () => {
  const cases = [kase('2026-07-openai-hugging-face'), kase('2026-10-anthropic-self-replication', 'Anthropic')];
  const m = (short_name, operator = 'OpenAI', red = {}) => nameMatch({ short_name, operator }, cases, red)?.slug ?? null;
  for (const n of ['openai-hugging-face', 'cisco-openai-hugging-face', 'openai-hugging-face-texas-suit', 'openai-hugging-face-agents']) assert.equal(m(n), '2026-07-openai-hugging-face', n);
  assert.equal(m('openai-huggingface-circuit-distillation'), null, 'one word apart is another name');
  assert.equal(m('openai-hugging-face', 'Anthropic'), null, 'another operator');
  assert.equal(m('anthropic-iot-self-replication', 'Anthropic'), null, 'words not in order');
  assert.equal(m('anthropic-replication-risk', 'Anthropic', { '2026-10-anthropic-replication-risk': '2026-10-anthropic-self-replication' }), '2026-10-anthropic-self-replication', 'a retired slug names its canonical case');
});

test('the case-only answer is read like the full one, and below 0.5 it is no match', () => {
  const known = [{ id: 'case:a', kind: 'case', slug: 'a' }];
  assert.equal(sameMatch({ choice: 'case:a', probabilities: { 'case:a': 0.8, none: 0.2 } }, known, []).slug, 'a');
  assert.equal(sameMatch({ choice: 'case:a', probabilities: { 'case:a': 0.4, none: 0.3 } }, known, []), null);
  assert.equal(sameMatch({ choice: 'none', probabilities: { none: 0.9 } }, known, []), null);
});

test('the triage asks a case-only question per candidate, listing case files only', async () => {
  const known = [{ id: 'case:a', kind: 'case', slug: 'a', text: 'k' }, { id: 'seed:b', kind: 'seed', slug: 'b', text: 'k' }];
  let asked;
  await triage([cand(0)], known, { log: quiet, jevFn: async (_s, _st, q) => { asked = q; return { fit0: { noul: 0.9 }, same0: { choice: 'none', probabilities: { none: 1 } }, case0: { choice: 'case:a', probabilities: { 'case:a': 0.9 } } }; } });
  assert.deepEqual(Object.keys(asked.case0.criteria), ['none', 'case:a']);
});

test('every candidate of a merged case file maps to its canonical case file (pipeline/state, content/redirects.json)', () => {
  const cases = loadCases(), redirects = loadRedirects();
  const merged = loadCandidates().candidates.filter((c) => c.mergedInto);
  assert.ok(merged.length >= 41);
  for (const c of merged) {
    assert.ok(cases.some((k) => k.slug === c.mergedInto), `${c.mergedInto} exists`);
    assert.ok(!cases.some((k) => k.slug === c.seed), `${c.seed} has no case file`);
    assert.equal(nameMatch({ short_name: slugBase(c.seed), operator: c.operator }, cases, redirects)?.slug, c.mergedInto, c.seed);
  }
});
