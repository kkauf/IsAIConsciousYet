// CaseFile contract (docs/pipeline.md § Contract) as JSON Schema, plus a validator
// for the subset used here. JSON Schema because parallel.ai and Gemini both take it.

export const QUESTIONS = {
  'indicators-vs-training': 'Are consciousness indicators measuring the mechanism, or training data about the mechanism?',
  'substrate': 'Does substrate matter, or is consciousness computational?',
  'uncertainty-and-control': 'Does telling a model its moral status is uncertain make it less controllable?',
  'bearer-of-status': 'What bears moral status: weights, a running instance, a persona, a memory thread?',
  'self-report': "Can a model's self-report be trusted, and what does training do to it?",
  'avoid-building': 'Should we avoid building systems whose moral status is debatable, and have we already failed?',
  'intention-language': 'Does the language of intention (wanted, decided, collaborated) describe what AI agents do, or mislead?',
  'who-decides': 'Who decides, and by what process, when the science will not settle in time?',
  'personhood-laws': 'Are personhood-exclusion laws a guardrail or a foreclosure?',
  'public-belief': 'Why does the public believe what it believes?',
};

// No slot for the site's makers: they are not experts and their opinion is not a reading (Konstantin, 2026-09-25).
export const PARTY_TYPES = ['operator', 'affected', 'evaluator', 'scientist', 'commentator'];

const str = (extra = {}) => ({ type: 'string', ...extra });
const source = {
  type: 'object',
  required: ['url', 'publisher', 'quote'],
  // sourceChanged: date the weekly re-check (pipeline/recheck.mjs) found the page readable but the quote gone.
  properties: { url: str(), archivedUrl: str(), publisher: str(), published: str(), quote: str(), sourceChanged: str() },
};
const reading = {
  type: 'object',
  required: ['partyName', 'partyType', 'stanceLabel', 'quote', 'url', 'speakerCheck'],
  properties: {
    partyName: str(), partyType: str({ enum: PARTY_TYPES }), stanceLabel: str({ maxWords: 8 }),
    quote: str(), url: str(), archivedUrl: str(), date: str(), speakerCheck: str({ enum: ['pass'] }),
    // true = the quote says what the system is, not only what happened or how dangerous it was.
    aboutNature: { type: 'boolean' },
    sourceChanged: str(),
  },
};

export const CASE_FILE_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'status', 'tier', 'event', 'bearsOn', 'agencyNote', 'consciousnessNote', 'readings', 'whatWouldSettleIt', 'updates', 'provenance'],
  properties: {
    slug: str(), title: str(),
    status: str({ enum: ['published', 'parked', 'withdrawn'] }),
    // 'mention' = honorable mention: does not fit the machine story but misses (a) or (c); missingCriterion says which.
    tier: str({ enum: ['case-file', 'mention'] }), missingCriterion: str(),
    event: {
      type: 'object',
      required: ['dateStart', 'operator', 'affectedParties', 'summary', 'summaryBasis', 'unaskedBehaviour', 'primarySources'],
      properties: {
        dateStart: str(), dateEnd: str(), operator: str(),
        affectedParties: { type: 'array', items: str() },
        summary: str({ maxWords: 120 }),
        summaryBasis: { type: 'array', minItems: 1, items: { type: 'object', required: ['sentence', 'quote', 'url'], properties: { sentence: str(), quote: str(), url: str(), sourceChanged: str() } } },
        unaskedBehaviour: str(),
        primarySources: { type: 'array', minItems: 1, items: source },
      },
    },
    bearsOn: { type: 'array', minItems: 1, items: str({ enum: Object.keys(QUESTIONS) }) },
    agencyNote: str(), consciousnessNote: str(),
    readings: { type: 'array', minItems: 2, items: reading },
    whatWouldSettleIt: { type: 'array', minItems: 1, items: str() },
    updates: { type: 'array', items: { type: 'object', required: ['date', 'change', 'sourceUrl'], properties: { date: str(), change: str(), sourceUrl: str() } } },
    provenance: {
      type: 'object',
      required: ['draftedBy', 'pipelineVersion', 'checkedAt', 'humanReviewed'],
      properties: { draftedBy: str(), pipelineVersion: str(), checkedAt: str(), humanReviewed: { type: 'boolean' } },
    },
  },
};

// Returns a list of error strings; empty means valid.
export function validate(schema, value, path = '$') {
  const errs = [];
  const t = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (schema.type && t !== schema.type) return [`${path}: expected ${schema.type}, got ${t}`];
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${path}: "${value}" not in [${schema.enum.join(', ')}]`);
  if (schema.type === 'string') {
    if (!value.trim()) errs.push(`${path}: empty`);
    if (schema.maxWords && value.trim().split(/\s+/).length > schema.maxWords) errs.push(`${path}: over ${schema.maxWords} words`);
  }
  if (schema.type === 'array') {
    if (schema.minItems && value.length < schema.minItems) errs.push(`${path}: needs at least ${schema.minItems} items, has ${value.length}`);
    if (schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
  }
  if (schema.type === 'object') {
    for (const k of schema.required ?? []) if (value[k] === undefined) errs.push(`${path}.${k}: missing`);
    for (const [k, sub] of Object.entries(schema.properties ?? {})) if (value[k] !== undefined) errs.push(...validate(sub, value[k], `${path}.${k}`));
  }
  return errs;
}
