// Unit tests for detect triage batching. Run: npm run test:unit (no network, no keys).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triage, triageState, planRequests, JEV_LIMITS } from './detect.mjs';

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
