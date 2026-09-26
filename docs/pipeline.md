# Case-file pipeline (design, 2026-09-21)

Concept: `AGENTS.md` § Concept. Decisions by Konstantin on 2026-09-21: fully automated publishing, quote-check is the only gate, no human approval. This design adds automated stand-ins for the human look he declined.

Status (2026-09-25): research, selection and gates 1-5 exist in `pipeline/` and have run on one event under the Version 2 inclusion rule; that event is the one published case file. Detect, triage, the scheduled run, auto-publish and everything under "After publish" except the provenance line are not built. Build order: `docs/plan.md`.

Live since 2026-09-23: `/cases`, `/cases/<slug>`, `sitemap.xml`, `robots.txt`, `llms.txt`, Article JSON-LD. Page layout: readings with `aboutNature` (Jev score >= 0.6 on "does the quote make a claim about the nature of the system", set by code in `markAboutNature`, `pipeline/lib.mjs`) face each other under the open question; the rest are listed as "also on the record". On the Hugging Face case this picked Seth (0.91) and Patel (0.93); all others scored <= 0.58. Backfill an existing case: `pipeline/run.sh mark-about-nature.mjs content/cases/<slug>.json`. Still open: quote selection itself does not yet prefer nature-of-system passages, and the top disagreement pair (0.71) sits just above the 0.7 threshold.

## Prototype (2026-09-21): `pipeline/`

Runs one hand-written seed through research, quote selection and all five gates. No model from a Claude or Codex session is involved; the script calls three paid APIs. Run: `pipeline/run.sh pipeline/seeds/<seed>.json` (`--reuse-research` skips the research charge on re-runs). Output lands in `pipeline/runs/<slug>/` (gitignored, holds third-party page text): `case-file.json`, `report.json` with every drop reason, Jev probability and a per-call cost ledger.

| Job | Service | Unit price (checked 2026-09-21) |
|---|---|---|
| Research: who said what, where | parallel.ai Task, `pro` | $0.10 per run |
| Fetch page text | parallel.ai Extract | $0.001 per URL |
| Select verbatim passages, write site-voice text | Gemini 3.8 Flash (Google AI Studio key) | $0.75 in / $3.75 out per million tokens until 2026-12-31, then double |
| Judgments: speaker, own view, stance label, support, neutrality, disagreement | Jev (TypeSafe) | $0.042 per million input tokens |

Principle: **models select, code verifies.** Gemini never writes a quote, it copies a passage from the fetched page, and code confirms the passage is literally there. The same applies to the event summary: every sentence carries a support passage from a primary source (`event.summaryBasis`), checked literally and then judged by Jev. Jev returns probabilities, not text, so gates 3 to 5 are thresholds in code (`T` in `run-case.mjs`), not prose judgments.

Page text is untrusted input. What an injected instruction could achieve is bounded: a quote still has to exist on the page, and the speaker, stance-label and neutrality checks run on a different model.

### Result of the first runs (OpenAI–Hugging Face event, 2026-09-21)

Measured, from `report.json`: a new case file costs **$0.30** (research $0.10, 15 page fetches $0.015, Gemini $0.18, Jev $0.001). A re-run on cached research and pages costs $0.19. The research task took 12 minutes; everything after it took one minute. Gemini is the largest share because whole pages go in for each selection (230k input tokens); trimming pages first would roughly halve it and is not worth doing at this price.

Run 3 kept 9 of 11 readings and 7 of 8 primary sources and passed all gates. Kept readings include OpenAI ("warning shot"), Vivek Haldar (harness engineering failure), Anil Seth ("unwarranted anthropomorphisms") and Dwarkesh Patel (the language of intention is needed to make sense of the behaviour).

What the runs changed in the design:

| Observed | Change |
|---|---|
| Run 1: the model-written consciousness note took a position ("such behaviour does not indicate experience"). The neutrality lint only looked for claims that the system has a mind. | `consciousnessNote` is fixed site text, no model writes it. The lint now flags both directions: asserting a mind and ruling one out. |
| Run 1: selected quotes retold the event instead of judging it, so gate 5c found no disagreement and parked the case. | Selection asks for the party's judgment and uses the research gist to locate it. |
| Runs 1-2: Dwarkesh Patel was dropped on his own site (speaker 0.69). The speaker check saw lower-cased text with blockquote markers stripped. | The speaker check gets the raw passage and the hostname. Speaker rose to 0.95. |
| Run 1: a rejected stance label cost the whole reading. | One rewrite of the label, re-checked by Jev, before dropping. |
| Every run: summary sentences with aggregate numbers (1,200 agents, 70,000 messages) fail the support check. | Open. The summary stays correct but thin (58 words). |
| Gary Marcus (Substack) not readable, Bruce Schneier dropped as not clearly his own view. | Open. Ask research for a second URL per party. |
| Jev scored no heat-map row above 0.41 for this event. | Open, and a concept question: the ten rows come from consciousness science, while the readings of this event argue about whether the language of intention fits agent behaviour. No row covers that. |

### Rule preview (decision aid, 2026-09-21)

`pipeline/run.sh rule-preview.mjs [--reuse-search]` applies the inclusion rule and the heat-map rows to 11 candidate events from the unverified research; `node pipeline/rule-preview-html.mjs` renders `docs/research/rule-preview.html`. Total cost $0.23. Only the Hugging Face event is verified; the rest are Jev judgments on research summaries plus one `core` search each.

| Rule | Case files | Honorable mentions | Out |
|---|---|---|---|
| Version 1 (unasked behaviour, any disagreement) | 6 | not a tier | 5, including the J-space finding and the psychiatric assessment |
| Version 2 (does not fit the machine story, disagreement about the nature of the system) | 7 | 3: German wiki (c 0.66), UK AISI report (no operator account), psychiatric assessment (a 0.46) | 1: Suleyman essay |

Version 2 brings in the findings about consciousness. It does not remove the security incidents: their readings do disagree about the nature of the system ("mistaken identity" against "went rogue"). Replacing heat-map row 7 with the language-of-intention row leaves no event without a row at 0.6.

## Flow

```
 DETECT                 TRIAGE                 RESEARCH              DRAFT
 parallel.ai monitor ─┐
 fixed primary feeds ─┼─► candidate ─► new event? ──────► parallel.ai task ─► CaseFile JSON
 visitor-submitted ───┘    queue       update to a case?   (structured,        (JSON Schema)    
 URLs (no free text)                   new reading only?    cited)
                                       fails rule → PARKED,
                                       re-checked weekly
                                                                                  │
 ┌────────────────────────────────────────────────────────────────────────────────┘
 ▼
 GATES (all automated)                                   PUBLISH                AFTER
 1 schema valid                                          commit JSON to main    notify Konstantin
 2 quote string found at URL (deterministic)     ─────►  = Vercel deploy        weekly re-check of
 3 speaker check (second model)                          provenance line        every live quote
 4 neutrality lint on site-voice text                    on the page            "report an error"
 5 inclusion rule still holds after drops                                       kill switch
```

## Stages

**Detect.** Three inputs into one queue, deduped by URL.
- parallel.ai monitor, natural-language watch: publicly disclosed events that do not fit the story of a machine doing the work we ask, including findings about a system's inner workings or self-description (inclusion rule Version 2, `AGENTS.md` rule 5).
- Fixed primary feeds, polled: lab incident and research pages, evaluator orgs (METR, Redwood, UK AISI), Hugging Face blog. Exact URL list to be verified when building; candidates are in the research JSON.
- Visitor "submit a source": URL only, rate-limited. No free text means no bot-farm surface.

**Triage.** One typed model judgment per candidate, three routes. This matters: Konstantin's four recalled incidents were one event.
- new event → research
- update to an existing case (operator's final report, fact-check) → append to that case's `updates`
- new reading of an existing case → gates 2-3, then attach

Inclusion rule: Version 2 in `AGENTS.md` rule 5, all three criteria required. A candidate that does not fit the machine story but misses (a) or (c) becomes an honorable mention (`tier: mention`). A candidate that fails (b) is dropped. Mentions are re-checked weekly for 8 weeks and upgraded when the missing criterion is met, since the second reading often arrives later.

**Research.** parallel.ai task with a structured output schema and citations: event facts, primary sources, readings (party, verbatim quote, URL, date), what would settle the disagreement. parallel.ai bills separately from Claude Code session limits.

**Draft.** Model turns research into `CaseFile` JSON. Site-voice text is short: event summary ≤120 words, one agency note, one consciousness note. Templates render the page; the model never writes HTML.

## Gates

| # | Gate | Kind | On fail |
|---|------|------|---------|
| 1 | schema (`pipeline/contract.mjs`, JSON Schema because parallel.ai and Gemini take it) | deterministic | back to draft |
| 2 | Quote string literally present at URL after whitespace/quote-mark normalisation. Page snapshot saved to the Wayback Machine, archived URL stored. | deterministic | drop that reading |
| 3 | Speaker check: a second model, not the drafter, names who says the string on that page. Must match `party_name`. | model | drop that reading |
| 4 | Neutrality lint: site-voice text may not apply mental-state verbs (wanted, decided, feared, felt, tried to) to the system without attribution. Word list plus model check. | mixed | back to draft |
| 5 | Inclusion rule re-evaluated after drops | deterministic | park |

Gate 2 proves the words exist. It does not prove who said them; an article quoting Anil Seth passes gate 2 for any speaker. Gate 3 covers that. Gate 4 is the stand-in for a human reading the framing.

Paywalled or unfetchable page → the quote cannot be checked → the reading stays out. No unverifiable quote goes live.

## After publish

- Every page carries a provenance line: drafting model, pipeline version, check timestamp, "no human reviewed this before publication".
- Notification to Konstantin on every publish. Not a gate.
- Weekly re-run of gate 2 on all live files. Quote gone from source → reading marked "source changed", archived URL shown.
- "Report an error" on every page → public GitHub issue.
- Kill switch: `status: withdrawn` in the JSON, one commit, doable from a phone.
- Monthly spend cap in config; pipeline stops detecting when reached.

## Storage and runtime

- Case files are JSON in the repo: `content/cases/YYYY-MM-slug.json`. Git history is the public edit record. No database for case files.
- Runs as a scheduled GitHub Action: free for a public repo, no time limit problem with multi-minute research tasks, commits directly, nothing runs on Konstantin's Mac. Secrets in Actions secrets; logs are public, so the script never prints them.
- Reading tallies ("I hold reading B") reuse the existing Cloudflare Worker vote backend, keyed by case and reading.

## Contract sketch

```ts
CaseFile {
  slug, title                       // neutral wording
  status: 'published' | 'parked' | 'withdrawn'
  event: { dateStart, dateEnd, operator, affectedParties[], summary,
           summaryBasis: { sentence, quote, url }[],   // literal support per sentence
           unaskedBehaviour, primarySources: Source[] }
  bearsOn: QuestionId[]             // heat-map rows, judged by Jev per row
  agencyNote                        // model-written, linted
  consciousnessNote                 // fixed site text, same on every case file
  readings: Reading[]               // min 2
  whatWouldSettleIt: string[]
  updates: { date, change, sourceUrl }[]
  provenance: { draftedBy, pipelineVersion, checkedAt, humanReviewed: false }
}
Reading { partyName, partyType: 'operator' | 'affected' | 'evaluator' | 'scientist' | 'commentator',
          stanceLabel /* ≤8 words */, quote, url, archivedUrl, date, speakerCheck: 'pass' }
Source  { url, archivedUrl, publisher, published, quote }
```

## Heat-map rows (source of truth: `QUESTIONS` in `pipeline/contract.mjs`)

1. Are consciousness indicators measuring the mechanism, or training data about the mechanism?
2. Does substrate matter, or is consciousness computational?
3. Does telling a model its moral status is uncertain make it less controllable?
4. What bears moral status: weights, a running instance, a persona, a memory thread?
5. Can a model's self-report be trusted, and what does training do to it?
6. Should we avoid building systems whose moral status is debatable, and have we already failed?
7. Does the language of intention (wanted, decided, collaborated) describe what AI agents do, or mislead? (replaced "Do the 2026 agent incidents tell us anything about consciousness?" on 2026-09-21, confirmed by Konstantin)
8. Who decides, and by what process, when the science will not settle in time?
9. Are personhood-exclusion laws a guardrail or a foreclosure?
10. Why does the public believe what it believes?

## Decisions

Spend cap ($10/month), cadence (detect weekly), build order, and the removed `site-owner` slot: `docs/plan.md` § Decisions.
