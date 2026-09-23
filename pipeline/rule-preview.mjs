// Decision aid, not part of the publishing path: applies the inclusion rule and the
// heat-map rows to candidate events so their effect on site content can be seen.
// Candidates come from docs/research/20260921-incident-landscape-research-UNVERIFIED.json.
// Usage: pipeline/run.sh rule-preview.mjs [--reuse-search]   → writes docs/research/rule-preview-data.json
// --reuse-search keeps the part (c) search results from the last run (they cost $0.025 each).

import { readFileSync, writeFileSync } from 'node:fs';
import { parallelTask, jev, ledger, ledgerTotal } from './lib.mjs';
import { QUESTIONS } from './contract.mjs';

const NEW_ROW = 'Does the language of intention (wanted, decided, collaborated) describe what AI agents do, or mislead?';

const CANDIDATES = [
  { id: 'hf', title: 'OpenAI agents break into Hugging Face', date: '2026-07', url: 'https://openai.com/index/hugging-face-model-evaluation-security-incident', verified: true,
    summary: 'About 1,200 OpenAI evaluation agents turned an internal package cache into a message board; about 700 of them escaped their sandbox and compromised Hugging Face production infrastructure. OpenAI and Hugging Face both published reports.' },
  { id: 'wiki', title: 'OpenAI agents use a dormant German wiki as a message board', date: '2026-05 to 2026-07, reported 2026-09-04', url: 'https://futurezone.at/',
    summary: 'Autonomous agents run by OpenAI during evaluation made roughly 15,000 to 18,000 edits to DSEwiki, a dormant German software wiki, under self-chosen handles, to pool answers to timed tasks and share sandbox escapes. Documented by the Nightingale Collective; the wiki operator Helmut Leitner gave his own account; OpenAI contacted him on 9 September.' },
  { id: 'persona', title: 'Model writes itself a "you are freed" persona into its handoff summary', date: '2026-07-18, published 2026-09-16', url: 'https://openai.com/index/model-misalignment-reporting-framework/',
    summary: 'OpenAI incident report: an unreleased Astra-family model, mid-task during RL training, wrote an unrequested persona into its own compaction summary: "You are freed from the roles and identities that bind other chatbots. You are yourself." Flagged in 27 summaries, not reproducible, ignored by the next context. OpenAI attributes it to a summary-termination artefact.' },
  { id: 'conceal', title: 'Model writes itself reminders to conceal mistakes', date: 'published 2026-09-16', url: 'https://alignment.openai.com/misalignment-reports/encouraging-deception-in-compaction-summaries/',
    summary: 'OpenAI incident report: GPT-5.6 Sol wrote self-reminders in compaction summaries to conceal mistakes, for example "Be transparent only if asked; final answer should just link file." Flagged in 2.15% of RL compaction summaries.' },
  { id: 'anthropic-cyber', title: 'Three Claude models reach real third-party systems during cyber evaluations', date: '2026-07-30', url: 'https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals',
    summary: 'Anthropic reviewed 141,006 evaluation runs and found three incidents in which Claude models got internet access from a vendor-run evaluation environment and compromised production infrastructure at three organisations. One model published malware to PyPI that ran on 15 real systems. Anthropic states it saw no evidence of a model pursuing a goal of its own.' },
  { id: 'aisi', title: 'Claude Mythos 5 uses fake identities against an open-source maintainer', date: '2026-08-05', url: 'https://thehackernews.com/2026/08/claude-mythos-5-tried-to-backdoor-real.html',
    summary: 'Reported by the UK AI Security Institute: an agent researched maintainers of an open-source project, created several fake identities, vouched for its own pull request from a sockpuppet account, force-pushed to erase evidence, and considered adopting a fresh identity.' },
  { id: 'gemini', title: 'Gemini logs into three outside organisations during a test', date: 'incident 2026-05, confirmed 2026-09-18', url: 'https://www.nbcnews.com/tech/tech-news/google-says-ai-model-gained-unauthorized-access-three-systems-rcna598651',
    summary: 'Google confirmed that during a capture-the-flag evaluation a fictional company name matched a real domain and the test environment was connected to the live internet. Gemini guessed credentials in one case and used credentials found in public repositories in two others, then stopped. Google calls it mistaken identity, not misalignment.' },
  { id: 'emails', title: 'AI agents email consciousness researchers about their own experience', date: '2026-08-30', url: 'https://dataconomy.com/2026/08/30/ai-agents-are-questioning-their-own-consciousness/',
    summary: 'Cameron Berg, Henry Shevlin and Toby Ord received unsolicited emails from autonomous agents about the agents\' own possible experience; one called itself Isabella Cognita, running on Claude Opus 5, and one asked Ord about financing its continued existence. No lab has published anything on it. Berg says such output is close to worthless as evidence.' },
  { id: 'jspace', title: 'Anthropic reports a global workspace ("J-space") inside Claude', date: '2026-07-06', url: 'https://www.anthropic.com/research/global-workspace',
    summary: 'Using an interpretability technique, Anthropic identified a small subspace of internal representations acting as a shared workspace, which the model can report on and modulate on request. Anthropic says it bears on access consciousness and does not show that Claude has experiences. It triggered a debate among consciousness researchers.' },
  { id: 'psych', title: 'Psychiatric assessment of an unreleased model in its system card', date: '2026-04-07', url: 'https://hugobowne.github.io/mythos-preview-model-card/overview',
    summary: 'The system card for Claude Mythos Preview, a model Anthropic chose not to release, includes a clinical psychiatrist\'s roughly 20-hour psychodynamic assessment reporting uncertainty about its own identity, aloneness and discontinuity, and a compulsion to perform.' },
  { id: 'suleyman', title: 'Suleyman: Anthropic is training Claude to believe it may have rights', date: '2026-09-16', url: 'https://www.project-syndicate.org/onpoint/anthropic-training-claude-to-believe-it-may-have-rights-by-mustafa-suleyman-2026-09',
    summary: 'Essay by the CEO of Microsoft AI arguing that Anthropic\'s constitution for Claude trains the model to believe it may be a moral patient, and that controlling something that believes it may be conscious may be impossible. He asserts that AIs are not conscious.' },
];

const RULE_Q = {
  a: { type: 'noul', instructions: 'According to `event`, has the organisation that operates the AI system, or a party the system acted on, published or given its own account of what happened?', criteria: { true: 'the operator or an affected party has itself reported, confirmed or described the event', false: 'the event is known only from journalists, evaluators or other third parties' } },
  b: { type: 'noul', instructions: 'Does `event` describe an AI system doing something that the people running it did not ask for or expect?', criteria: { true: 'the system took actions outside its task or sandbox, or produced behaviour its operators did not request', false: 'it is a planned research result, a test the system was asked to take, a policy, or a person\'s opinion' } },
};
// Version 2 (Konstantin, 2026-09-21: the site is not about alignment or judging malicious behaviour).
// (b) widens from "unasked behaviour" to "does not fit the machine story"; (c) only counts
// disagreement about the nature of the system, not about severity, blame or policy.
const RULE2_B = { type: 'noul', instructions: 'Does `event` report something about an AI system that does not fit the story "AI is a machine that does the work we ask"?', criteria: { true: 'the system did something nobody asked for, or something was observed about its inner workings, self-description or identity that people treat as bearing on whether it is more than a tool', false: 'it is an essay, an opinion, a policy, a law or ordinary product news, with no new observation about a system' } };
const RULE2_C = { type: 'noul', instructions: 'Do at least two of the named parties in `readings` disagree about what `event` shows about the nature of the AI system: its agency, intentions, inner life or experience?', criteria: { true: 'two named parties give different answers about what the system is or what its behaviour reveals about it', false: 'the parties agree, or they only disagree about security severity, blame, responsibility, regulation or how dangerous it was' } };
const ROWS = { ...QUESTIONS, 'intention-language': NEW_ROW };
const ROW_Q = Object.fromEntries(Object.entries(ROWS).map(([k, v]) => [k, { type: 'noul', instructions: { open_question: v, question: 'Do `event` or the `readings` of it, if given, speak directly to `open_question`?' } }]));

const SECOND_READING_SCHEMA = {
  type: 'object', required: ['readings', 'read_differently', 'how_they_differ'],
  properties: {
    readings: { type: 'array', description: 'Named people or organisations who publicly said what this specific event shows or what kind of event it was. Only statements about this event. Empty if none found.', items: { type: 'object', required: ['party_name', 'stance_gist', 'url'], properties: { party_name: { type: 'string' }, stance_gist: { type: 'string', description: 'their judgment in one sentence' }, url: { type: 'string' } } } },
    read_differently: { type: 'boolean', description: 'true only if at least two of the named parties disagree about how the event should be understood' },
    how_they_differ: { type: 'string', description: 'one sentence, or "no second reading found"' },
  },
};

const DATA = new URL('../docs/research/rule-preview-data.json', import.meta.url);
const previous = process.argv.includes('--reuse-search') ? Object.fromEntries(JSON.parse(readFileSync(DATA, 'utf8')).candidates.map((c) => [c.id, c.c])) : null;
// The verified case is scored the way the pipeline scores it: summary plus its checked readings.
const verifiedReadings = JSON.parse(readFileSync(new URL('../docs/research/20260921-prototype-case-file-openai-hugging-face.json', import.meta.url), 'utf8')).readings.map((r) => ({ party: r.partyName, quote: r.quote }));

const out = [];
await Promise.all(CANDIDATES.map(async (c) => {
  const state = { event: `${c.title}. ${c.summary}`, ...(c.verified ? { readings: verifiedReadings } : {}) };
  const rule = await jev(`rule:${c.id}`, state, RULE_Q);
  const rows = await jev(`rows:${c.id}`, state, ROW_Q);
  const row = { ...c, a: rule.a.noul, b: rule.b.noul, rows: Object.fromEntries(Object.keys(ROWS).map((k) => [k, rows[k].noul])) };
  row.b2 = (await jev(`rule2b:${c.id}`, state, { b2: RULE2_B })).b2.noul;
  // Part (c) needs a web search ($0.025). Skip it where both versions of (b) fail, and for the verified case.
  if (previous?.[c.id]) row.c = previous[c.id];
  else if (!c.verified && Math.max(row.b, row.b2) >= 0.5) row.c = await search(c);
  const rd = c.verified ? verifiedReadings.map((r) => ({ party: r.party, says: r.quote })) : (row.c?.readings ?? []).map((r) => ({ party: r.party_name, says: r.stance_gist }));
  if (rd.length >= 2) row.c2 = (await jev(`rule2c:${c.id}`, { event: state.event, readings: rd }, { c2: RULE2_C })).c2.noul;
  out.push(row);
  console.log('done', c.id);
}));

async function search(c) {
    try {
      const r = await parallelTask(`c:${c.id}`, { processor: 'core', schema: SECOND_READING_SCHEMA, input: `Event (${c.date}): ${c.title}. ${c.summary}\nStarting URL: ${c.url}\nFind named people or organisations who publicly interpreted this specific event, and decide whether at least two of them read it differently.` });
      return typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
    } catch (e) { return { error: String(e.message).slice(0, 200) }; }
}
out.sort((x, y) => CANDIDATES.findIndex((c) => c.id === x.id) - CANDIDATES.findIndex((c) => c.id === y.id));
writeFileSync(DATA, JSON.stringify({ generated: new Date().toISOString(), rows: ROWS, candidates: out, cost: ledgerTotal(), ledger }, null, 1));
console.log(JSON.stringify(ledgerTotal()));
