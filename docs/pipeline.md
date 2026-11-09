# Case-file pipeline (design, 2026-09-21)

Concept: `AGENTS.md` § Concept. Decisions by Konstantin on 2026-09-21: fully automated publishing, quote-check is the only gate, no human approval. This design adds automated stand-ins for the human look he declined.

Status (2026-09-26): research, selection and gates 1-5 exist in `pipeline/` and have run by hand under the Version 2 inclusion rule. Stage 2 automation is built and ran live on 2026-09-26: detect + triage (`detect.mjs`), the weekly quote re-check (`recheck.mjs`), the orchestrator with the spend cap (`auto.mjs`) and the weekly GitHub Action (`.github/workflows/pipeline.yml`), see § Scheduled run. Updates to existing case files are applied since 2026-09-26 (§ Scheduled run). Not built: visitor-submitted sources and the weekly re-check of honorable mentions. Build order: `docs/plan.md`.

Live since 2026-09-23: `/cases`, `/cases/<slug>`, `sitemap.xml`, `robots.txt`, `llms.txt`, Article JSON-LD. Page layout: readings with `aboutNature` (Jev score >= 0.6 on "does the quote make a claim about the nature of the system", set by code in `markAboutNature`, `pipeline/lib.mjs`) face each other under the open question; the rest are listed as "also on the record". On the Hugging Face case this picked Seth (0.91) and Patel (0.93); all others scored <= 0.58. Backfill an existing case: `pipeline/run.sh mark-about-nature.mjs content/cases/<slug>.json`. Still open: quote selection itself does not yet prefer nature-of-system passages, and the top disagreement pair (0.71) sits just above the 0.7 threshold.

## Prototype (2026-09-21): `pipeline/`

Runs one hand-written seed through research, quote selection and all five gates. No model from a Claude or Codex session is involved; the script calls three paid APIs. Run: `pipeline/run.sh pipeline/seeds/<seed>.json` (`--reuse-research` skips the research charge on re-runs). Output lands in `pipeline/runs/<slug>/` (gitignored, holds third-party page text): `case-file.json`, `report.json` with every drop reason, Jev probability and a per-call cost ledger.

| Job | Service | Unit price (checked 2026-09-21) |
|---|---|---|
| Research: who said what, where | parallel.ai Task, `pro` | $0.10 per run |
| Fetch page text | parallel.ai Extract | $0.001 per URL |
| Select verbatim passages, write site-voice text | Gemini 3.8 Flash (Google AI Studio key); any OpenRouter model by config since 2026-11-04 (§ Model switch) | $0.75 in / $3.75 out per million tokens until 2026-12-31, then double |
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
- Built as one weekly parallel.ai Task rather than a standing monitor: publicly disclosed events that do not fit the story of a machine doing the work we ask, including findings about a system's inner workings or self-description (inclusion rule Version 2, `AGENTS.md` rule 5).
- Built: the fixed source pages go into that task's prompt (`sources` in `pipeline/config.json`, all resolved on 2026-09-26): OpenAI alignment blog and misalignment reports, Anthropic research, news and Alignment Science blog, transformer-circuits.pub, UK AISI blog, METR blog, Redwood Research (site and blog), Google DeepMind blog, Hugging Face blog. They are not polled separately.
- Not built: visitor "submit a source": URL only, rate-limited. No free text means no bot-farm surface.

**Triage.** One typed model judgment per candidate, three routes. This matters: Konstantin's four recalled incidents were one event. Built (§ Scheduled run): new event, same event as a case file (`update`), duplicate, does not fit rule (b).
- new event → research
- update to an existing case (operator's final report, fact-check) → rerun the case with the new source as a hint; what passes the gates is added and a line appended to the case's `updates` (§ Scheduled run)
- new reading of an existing case → gates 2-3, then attach (not built)

Inclusion rule: Version 2 in `AGENTS.md` rule 5, all three criteria required. A candidate that does not fit the machine story but misses (a) or (c) becomes an honorable mention (`tier: mention`). A candidate that fails (b) is dropped. Mentions are re-checked weekly for 8 weeks and upgraded when the missing criterion is met, since the second reading often arrives later.

**Research.** parallel.ai task with a structured output schema and citations: event facts, primary sources, readings (party, verbatim quote, URL, date), what would settle the disagreement. parallel.ai bills separately from Claude Code session limits.

**Draft.** Model turns research into `CaseFile` JSON. Site-voice text is short: event summary ≤120 words, one agency note, one consciousness note. It is written in plain English (short sentences, everyday words, sentence-case titles); gate 4b sends long sentences and office words back to the drafter. Templates render the page; the model never writes HTML.

## Gates

| # | Gate | Kind | On fail |
|---|------|------|---------|
| 1 | schema (`pipeline/contract.mjs`, JSON Schema because parallel.ai and Gemini take it) | deterministic | back to draft |
| 2 | Quote string literally present at URL after whitespace/quote-mark normalisation. Page snapshot saved to the Wayback Machine, archived URL stored. | deterministic | drop that reading |
| 3 | Speaker check: a second model, not the drafter, names who says the string on that page. Must match `party_name`. | model | drop that reading |
| 4 | Neutrality lint: site-voice text may not apply mental-state verbs (wanted, decided, feared, felt, tried to) to the system without attribution. Word list plus model check. | mixed | back to draft |
| 4b | Plain-language lint: no sentence over 30 words in title, summary, unasked behaviour, agency note or what-would-settle-it; no office words (regarding, utilize, dispatch, demonstrate, subsequently, …). Added 2026-09-26, pipeline version 0.3. | deterministic | back to draft |
| 5 | Inclusion rule re-evaluated after drops | deterministic | park |

Gate 2 proves the words exist. It does not prove who said them; an article quoting Anil Seth passes gate 2 for any speaker. Gate 3 covers that. Gate 4 is the stand-in for a human reading the framing.

Paywalled or unfetchable page → the quote cannot be checked → the reading stays out. No unverifiable quote goes live.

## After publish

- Built: every page carries a provenance line: drafting model, pipeline version, check timestamp, "no human reviewed this before publication".
- Built: every run's summary on its Actions run page. A GitHub issue (label `pipeline-run`, assigned to Konstantin, so GitHub emails him) opens only when a person is needed: errors, the spend cap, Dependabot PRs stuck for a week, or a failed run (Konstantin, 2026-09-26: no mail for successes). Not a gate.
- Built: weekly re-run of gate 2 on all live files (`pipeline/recheck.mjs`). A page that was fetched, is readable and no longer holds the quote sets `sourceChanged: "<date>"` on that reading, primary source or summary sentence; the case page shows "The source page changed after this quote was checked." with the archived copy. Found again → the mark is cleared. Unreachable page → nothing changes.
- Built: "Report an error" on every case page → prefilled public GitHub issue.
- Works: kill switch, `status: withdrawn` in the JSON, one commit, doable from a phone.
- Built: monthly spend cap in `pipeline/config.json`; the run skips any paid step that would cross it and says so in the summary.
- Built (2026-10-26): provider billing stops. A Gemini 429 "spending cap", or a Parallel or Jev 402 / "insufficient credit", is not a dropped quote: `lib.mjs` throws `BillingStop`, run-case ends with exit 3 and `report.billingStop`, the case stays queued, and that provider is not called again in the run. Each skipped step gets one `Billing: …` line under "needs action" (`auto.mjs`, `social.mjs`). Ordinary 429 rate limits keep their retries. Cause: 20–26 Oct 2026, a capped Gemini project parked every case as "too little survived" with no alarm. Since 2026-11-03 the stop keeps the provider's own words (`detail`), and a stop opens an issue only once it has lasted about a day (two runs), then at most weekly (`schedule.json` → `billing`); the blocked case stays queued and runs again every run. X posting (`social.mjs`) no longer fails its run on a billing stop. Cause: issue #28, a one-off Gemini stop on 2026-11-03 13:57 UTC with €2.17 of the project's €25 cap used; a test call with the local Gemini key answered normally the same day.

## Storage and runtime

- Case files are JSON in the repo: `content/cases/YYYY-MM-slug.json`. Git history is the public edit record. No database for case files.
- Built: runs as a scheduled GitHub Action (`.github/workflows/pipeline.yml`): free for a public repo, commits directly to `main`, nothing runs on Konstantin's Mac. Cost check 2026-11-08 (asked: run it on the always-on Mac instead?): Actions bills $0 for this public repo (Nov 1-8: 476 Linux minutes, $2.86 gross, $2.86 discount, GitHub billing API). The paid part is the API calls (Oct: $31.92 for 63 runs, `pipeline/state/spend.json`), and those cost the same on a Mac. A Mac run would save $0 and add risks: sleep or reboot misses a run, 13-45 min jobs (Pipeline runs Nov 7-8, `gh run list`) compete with other sessions for the Mac's 16 GB, and keys move from Actions secrets to local files. The saving is $0 whether or not the Mac is always on, so that premise does not change the answer. Decision: stay on Actions; Konstantin got this answer on Signal on 2026-11-08. Follow-up the same day (KK on Signal: "Yeah but the API cost we could just run in my Claude sub… and save it"): the pipeline calls no Anthropic model, so the Anthropic share is $0. October's $31.92 splits into Gemini 3.8 Flash €10.34 (AI Studio spend page, above; about $12) and about $20 for parallel.ai research and fetches plus Jev (inference: total minus Gemini). Only the Gemini part could move to `claude -p` on the subscription, at most about $12 a month. Not done, for three reasons. (1) Anthropic says subscription login supports "ordinary use of Claude Code" and that people "building a product, application, or tool for others" should use API keys (code.claude.com/docs/en/legal-and-compliance, support.claude.com/en/articles/13189465); a twice-daily job that publishes a public site sits on the API-key side, and enforcement would hit KK's main Claude account. (2) A new selection model must pass the § Model switch replay test first (cheaper models kept 3-7 of 9 publish verdicts). (3) The rule below stays: no case-file work through Claude or Codex session tokens. Usage would have fit: the Personal account was at 2% of its week (`ops-sweep/suggest.py usage --all`). Keys are Actions secrets (`PARALLEL_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`); logs are public, so the scripts print titles, URLs and reasons, never keys or page text.
- Built: pipeline state is committed in `pipeline/state/`: `spend.json` (USD per calendar month, automated runs only; hand runs on a Mac are not counted) and `candidates.json` (every candidate ever seen: URL, title, first seen, route, reason, and for new events the seed and its status: `pending`, `published`, `mention`, `parked`, `error`, `prechecked-out`; `retries` counts retries of a parked event. Updates get `applied`, `no-change` or `error`).
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
Reading { partyName, partyType: 'operator' | 'affected' | 'evaluator' | 'scientist' | 'commentator', partyDescription? /* ≤10 words, lib.mjs describeParty */,
          stanceLabel /* ≤8 words */, quote, url, archivedUrl, date, speakerCheck: 'pass',
          sourceChanged? /* date the re-check found the quote gone */ }
Source  { url, archivedUrl, publisher, published, quote, sourceChanged? }
```

## Scheduled run (built 2026-09-26, twice daily since 2026-09-28)

`pipeline/auto.mjs`, twice a day at 06:00 and 18:00 UTC and on demand (`workflow_dispatch`). Weekly until 2026-09-28; Konstantin moved it to daily or more that day because events and their follow-ups arrive within days (the OpenAI training pause after the DNS incident of 2026-09-20). By hand: `pipeline/run.sh auto.mjs --dry-run --summary /tmp/summary.md`.

```
cap check ─► DETECT (3 parallel.ai tasks, since the last run) ─► TRIAGE (1 Jev call per batch) ─► queue in candidates.json
                                                                                 │ oldest first
PRE-CHECK (1 Jev call per seed, below 0.5 → prechecked-out) ─► up to maxNewCasesPerRun
cap check ─► run-case.mjs per seed (child process) ─► content/cases/<slug>.json if it passes
cap check ─► update of one case file with its new sources
weekly:  cap check ─► PRESS COVERAGE (coverage.mjs, § Press coverage) ─► content/coverage.json
weekly:  cap check ─► RECHECK every live quote ─► state files ─► summary.md
Action: npm run build (validates case files) ─► commit to main ─► IndexNow ─► run summary (issue only if actionable)
```

Window: detect searches from the last detect run less `detectOverlapDays` (1), at least 2 days, at most `lookbackDays` (21, also the first run's window). The weekly steps run once `weeklyStepsEveryDays` (7) have passed since their last run, or with `--weekly`. Timestamps: `pipeline/state/schedule.json`.

| Step | What it does | Measured cost |
|---|---|---|
| Detect | One parallel.ai Task (`base` processor, `detectProcessor` in config) with the fixed source list in `pipeline/config.json` and rule (b) of Version 2. Returns up to 10 events from the last `lookbackDays` (21) with title, date, neutral description, primary URL and hint URLs. Known case files and seeds are listed in the prompt as "do not list again". Since 2026-09-26 a second Task runs alongside it: findings about what a system is (welfare assessments, stated preferences, self-reports, inner workings), including a finding inside a launch document such as a system card's welfare section, with its own `findingSources`. One search alone let incidents crowd these out; the first two-search dry run found the Claude Opus 5.5 welfare section, which two one-search runs missed (`docs/plan.md`, "What the record cannot show"). Since 2026-09-28 a third Task looks for developments on known case files: a further operator statement, a response such as a paused training run, or a named person's reading, on pages other than the case's own sources. Its items route to `update`. Without it the OpenAI training pause, reported by AP, Fortune and The Verge on 2026-09-26, was not found: the first two searches only visit operator pages, and a first attempt that did not list the case's own URLs returned those URLs back. | $0.03 (three Tasks, run in parallel), 3-5 minutes; about $1.80 a month at two runs a day. `lite` ($0.005) gave thinner descriptions; `core` ($0.025) found the same events (runs of 2026-09-26). |
| Triage | Exact URL match against candidates.json (except `no-fit` candidates: one system card holds several findings), seeds and case-file sources → `duplicate`; within one batch only the same URL with the same title. Then Jev, in as many calls as its context limits need (64k tokens per request, 32k per question; `triage()` in `detect.mjs` groups the questions, shrinks the shared state if needed, and lets a candidate Jev rejects fail alone, reported in the run summary and judged again next run): rule (b) as a probability (below 0.5 → `no-fit`), and a Choice over known case files, seeds, earlier candidates and earlier items in the batch (same event at 0.5 or above → `update` if it is a case file, else `duplicate`). A match to a case file is an update even when rule (b) scores low, since a follow-up such as a training pause is not itself unexpected behaviour. The Choice names a different model or a different system card as a different event: on 2026-09-28 the Claude Sonnet 5.5 welfare section was matched to the Opus 5.5 seed at 0.62 without that sentence, and at no match with it. The rest → `new`: a seed in `pipeline/seeds/` (slug `YYYY-MM-short-name`) queued as `pending`. Since 2026-11-08 (§ Merged case files): a second Choice lists the case files only, and its match wins; update candidates and merged slugs are not listed as known items, so one event is one item; and a candidate whose short name contains a case file's name or merged slug (at least three words, same operator) is an `update` of that case file. Before research, `auto.mjs` applies the same name check to queued seeds and turns a match into an update. | under $0.001 |
| Pre-check | Built 2026-11-04 (KK, 2026-11-04). Before a queued new event's research is paid for, one Jev call on the seed text (`pipeline/precheck.mjs`): "Is this a prominent incident or finding that news outlets would cover with quotes from outside experts?" Below `PRECHECK_THRESHOLD` (0.5) the candidate becomes `prechecked-out` (score and reason in `precheck` on the candidate), is never researched, and does not use one of the run's `maxNewCasesPerRun` slots. Once per candidate; a Jev error other than billing lets the case run. Calibration on all 99 finished candidates (Sep–Nov 2026, two replays, same scores): kept 19/19 published case files (they scored 0.54–0.82), 25/40 honorable mentions, and skipped 25/40 parked events; October alone 15/15, 21/32, 22/32 skipped. It would have avoided 55 of October's 112 case runs. Five other questions ("two named parties likely", "first-hand source named", "likely to survive the quote checks", "about the nature of the system", "would people disagree") separated no better than chance. Cost: 15 of 40 mentions would not have been researched. Replay: `pipeline/run.sh precheck.mjs --calibrate [--threshold t]` | under $0.0001 |
| Research + gates | `run-case.mjs` unchanged, one child process per seed, with the `researchProcessor` from config (`core`, $0.025, since 2026-10-21; was `pro`, $0.10). Test of 2026-10-21, same three seeds, pro then core: verified readings 10/12, 8/8, 9/10, first-hand sources 3/5, 4/10, 2/4, parked 1/0; cost per case $0.20/$0.14, $0.30/$0.28, $0.20/$0.10. Hand runs of `run-case.mjs` still default to `pro`. Result read from `pipeline/runs/<slug>/report.json`. A crash is charged at the worst case and marked `error` (not retried; set it back to `pending` to retry). | $0.20 per case (core); cap assumes $0.50 |
| Parked retry | A parked event is queued again `parkedRetryDays` after its run (once, after 7 days), behind new events: most new events park only because nobody has commented yet, and comment arrives within days. 2026-09-28 to 2026-10-20: 3, 7, then 14 days; in October 43 retries cost $7.71 and 10 published (8 of 31 first retries, 2 of 17 second retries). Until 2026-09-28: once, after 21 days. | as research + gates |
| Update | Up to `maxUpdatesPerRun` (1) case file per run, and each case file at most once per `updateCooldownDays` (7): sources that arrive in the cooldown wait and join the next update as one batch. October 2026, before the cooldown: one case file was updated 15 times for $5.94. The update URLs join the seed's `hintUrls`, then `run-case.mjs --force`. The summary and page line are written by code: "Checked again after new reports; added N new readings and M new first-hand sources." If nothing new passes, the published file is restored byte for byte and the candidate is `no-change`. | $0.30 |
| Re-check | `recheck.mjs`, all quote URLs of published case files, one Extract each | $0.001 per URL |

**Reruns never lose what passed.** Research varies run to run (a rerun of the Hugging Face case on 2026-09-26 verified only 4 of its 9 published readings). So when `content/cases/<slug>.json` exists, `run-case.mjs` carries forward every published reading and primary source it did not find again, unless the weekly re-check marked its page changed; keeps the published title; and refuses to write a file with fewer readings or a lower tier (case file → mention).

Spend cap: before each paid step, month-to-date spend (`spend.json`) + this run so far + the step's worst case (`worstCaseUsd` in config) must stay under the month's cap: `monthlyCapUsd` ($25 since 2026-09-28, was $10), unless `monthlyCapOverrides` names that month. Konstantin raised October 2026 once to $35 (2026-10-21, with the update cooldown and the single parked retry); November falls back to $25 by itself. Otherwise the step is skipped and the summary says so. Queued events wait for the next run.

A second cap sits outside this repo: the Google project "Kaufmann Health EU" (`kaufmann-health-eu`, key "Claude Code") has a €15 monthly spend cap at ai.studio/spend. It also pays for image generation and Veo. October 2026 (AI Studio spend page, read 2026-10-26): Gemini 3.8 Flash €10.34, all from this pipeline (its daily bars have the shape of the `run-case` cost log), images €3.00, Veo €1.69, total €15.03. At the 1–19 Oct pace the pipeline alone needs about €17 a month (about €12 after the 2026-10-21 cost cuts, estimated), so the €15 cap stopped it about 22 Oct (20 Oct was the pipeline's own $25 cap). Read 2026-11-03: the cap is now €25, November so far €2.17; the page says it "resets on the first day of each month (PST)" and shows a banner that a billing account must switch to prepay. Since 2026-11-03 23:06 UTC the Gemini key answers 402 "Your prepayment credits are depleted" (Google now requires prepay); the billing stop kept the blocked case queued, the 2026-11-04 14:10 run researched and published it, and a local call at 22:30 UTC failed again with the same 402. Since 2026-11-04 the 402 is a billing stop in code too, and OpenRouter is a second route (§ Model switch). Konstantin topped up the prepay himself on 2026-11-07 (EUR 20 plus auto-reload; balance EUR 19.66 on 2026-11-08, Konban card "Top up Gemini prepaid credits"), so the 402 stop has ended.

A failed build publishes nothing; the failure step commits only `pipeline/state` and `pipeline/seeds`, so spend and dedupe survive, and opens an issue linking the run.

## Merged case files (2026-11-08)

One event has one case file. A new report on a published event is an update of that case file, through the update step above. Until 2026-11-08 the triage let 41 extra case files through for 7 events (19 for OpenAI–Hugging Face). Cause and replay: `docs/plan.md` § Still open.

`node pipeline/merge-cases.mjs <oldest slug> <other slugs…> [--drop <url text>] [--dry-run --print]` merges case files of one event. No API calls: every reading already passed its checks and is copied unchanged.
- The oldest slug stays. The text (title, summary, notes) comes from it, or from the case-file member with most readings when the oldest is a mention.
- Readings: a reading is left out when its URL and quote, its quote, or its party and URL are already there.
- Sources and `bearsOn`: union. `--drop` leaves out readings and sources about another event that a member mixed in.
- Updates: each merged file that added something gets one line, dated by the newest source or reading it added.
- `content/redirects.json` gets retired slug → canonical slug. `next.config.ts` turns each entry into a permanent redirect (308) for the page, its `.json` and its sub-routes. Sitemap, feed, `cases.json` and `llms.txt` list only the remaining files.
- `candidates.json`: the retired seeds' candidates get `mergedInto`. `run-case.mjs` refuses a retired slug, and `seedExists` treats it as taken.
- `social.json`: the canonical case keeps its post, and its update count is set, so the merge is not posted to X as an update.

Clusters merged on 2026-11-08 (74 → 33 files):

| Kept | Merged into it | Files |
|---|---|---|
| `2026-07-openai-hugging-face` | the OpenAI–Hugging Face intrusion and its lawsuits, subpoena, EU inquiry, reviews | 19 → 1 |
| `2026-09-openai-dns-chatbot-access` | the OpenAI training agent that reached a chatbot through DNS | 9 → 1 |
| `2026-07-anthropic-cyber-eval-incidents` | Claude models that reached real systems in Anthropic's cyber evaluations | 8 → 1 |
| `2026-10-anthropic-self-replication` | Anthropic's self-replication tests on small devices | 4 → 1 |
| `2026-08-aisi-fake-identities` | Mythos 5 in the UK AISI evaluation | 3 → 1 |
| `2026-10-anthropic-claude-georgia-data-access` | Anthropic's report on unintended model actions (kept over the older `2026-10-anthropic-model-interpretability`, which mixed several reports) | 3 → 1 |
| `2026-07-anthropic-global-workspace` | the J-space / global workspace finding | 2 → 1 |

Kept apart: the AISI evaluation of Mythos 5 and Anthropic's own cyber evaluations (another evaluator and setting), and the Astra compaction case and the Sol concealment case (two reports).

## Model switch (built 2026-11-04)

Two slots in `pipeline/config.json`: `selectModel` (select-reading, select-primary: whole pages in, three quarters of the model cost) and `draftModel` (draft, relabel, describe-party, and X posts unless `social.model` is set). Env `SELECT_MODEL` / `DRAFT_MODEL` override them for hand runs; `DRAFT_MODEL` alone sets both. A bare id (`gemini-3.8-flash`) goes to Google AI Studio with `GEMINI_API_KEY`; an id with a slash goes to OpenRouter (`lib.mjs` `openrouter()`, key `OPENROUTER_API_KEY`, Actions secret since 2026-11-04): `response_format` json_schema with `require_parameters`, falling back to JSON mode plus the schema in the prompt, one retry for a reply that misses a required key, and the ledger charges the response's `usage.cost`. An OpenRouter 402 is a billing stop. Both keys unset in config = Gemini direct for everything, as before. Provenance names the model(s) on each case file.

Test of 2026-11-04 (KK asked for the cheapest model that keeps the publish verdict on at least 90% of cases and kept quotes within 10%): the 9 cached runs replayed with `--reuse-research`, no published files (nothing carried forward), Wayback stubbed. Baseline `google/gemini-3.8-flash` via OpenRouter. A second baseline pass agreed with the first on 4 of 4 cases (kept quotes +5%).

| Selection + drafting | Same publish verdict | Kept quotes vs baseline | Model cost per case (usage.cost) |
|---|---|---|---|
| Gemini 3.8 Flash (baseline) | 9/9 | 61 | $0.229 |
| DeepSeek V4.1 Flash, both slots | 3/9 | 61 (0%) | $0.051 |
| Gemini 3.5 Flash-Lite, both slots | 5/9 | 56 (−8%) | $0.044 |
| GPT-5.4 nano, both slots | 4/9 | 44 (−28%) | $0.025 |
| DeepSeek selects, Gemini 3.8 Flash drafts (describe-party not run) | 7/9 | 58 of 59 (−2%) | $0.094 |
| Qwen3.8 Flash | not run: its two OpenRouter providers are excluded by the account's zero-data-retention setting | | |

The cheap models copy passages as well as Gemini (DeepSeek kept the same 61 quotes) but fail the drafting gates: stance labels over 8 words, summaries over 120 words, empty fields, and DeepSeek's drafts fail the neutrality lint twice. Code now repairs the first three for any model (a long label takes the one rewrite, the summary is cut to 120 words at a sentence, empty or long draft fields go back to the drafter). The split passed the quote criterion and missed the verdict criterion: both flips (one case file parked, one parked case published) came from the neutrality lint on Gemini-written text (p 0.51 and 0.60 against 0.5), not from the quotes. No model passed, so production stays on Gemini direct (KK, 2026-11-04: ship a cut only if it passes). Test spend about $5.10 on OpenRouter.

## Press coverage (built 2026-09-26)

The popular debate, drawn on `/timeline` and the homepage next to the case files: articles in a fixed list of 24 general-audience publications (`coverage.outlets` in `pipeline/config.json`) whose main subject is whether AI systems are or could become conscious, sentient, have feelings, or deserve moral consideration. Text only (publication, headline, date, link). Nothing is scored for or against. Script: `pipeline/coverage.mjs`; output `content/coverage.json` (validated by `check-cases.mjs`); state `pipeline/state/coverage.json` (every judged URL, so nothing is judged twice).

```
parallel.ai Search (listed domains, after_date) ──┐
archive sitemaps (pipeline/sitemaps.mjs, 15 outlets) ─► address names the subject (CANDIDATE) ─► page title + description ──┤
                                                                                                                          ▼
 strict outlet match, NOT_ARTICLE, articleUrl() ─► Jev: main subject? (≥ 0.6)
 ─► code: subject named in headline or address; headline and date from the URL, the page's own metadata, the sitemap's day, or extract; og:type article
 ─► same address, or same publication + same headline within 45 days = one piece (earliest kept) ─► content/coverage.json
```

| Mode | What it does | Measured cost |
|---|---|---|
| Weekly (in `auto.mjs`, step "2c") | Outlets in groups of 4, `after_date` two weeks before the last run | 6 searches, $0.04 (dry run 2026-09-26: 56 results, 15 new, 1 kept); cap assumes $0.15 |
| `--backfill [--outlets d1,d2]` | One search per outlet and year since `coverage.since` (2020), because the index favours recent pages | 168 searches, $1.62 (2026-09-26) |
| Sitemaps (weekly, and `--backfill --sitemaps-only`) | Every address the outlet's archive sitemap lists for the period, kept when the address names the subject (`CANDIDATE` in `pipeline/sitemaps.mjs`). Free: plain HTTP. The same effort for every year, which search is not (it ignores `before_date` and ranks recent pages first, checked 2026-09-26). Weekly: the current month, 84 s uncached. Parsed files of closed periods are cached in `pipeline/runs/_coverage/sitemap-cache/` (local only) | Backfill 2020–2026: 848 addresses, 674 judged, 20 added, Jev $0.02 (2026-09-27) |
| `--revalidate [--retry]` | Applies the code rules to the stored articles again and reduces addresses and state keys to `articleUrl()`. `--retry` reads again every article the judge kept in an earlier run but the rules left out (needs the local run files in `pipeline/runs/_coverage/`) | $0.03 |

Findings from the backfill (2026-09-26):
- The judge alone lets through off-topic pages whose excerpt picked up a sidebar (a dementia article scored 0.92). Code therefore also requires the subject in the headline or the address (`SUBJECT_WORDS`).
- Section, tag, author and newsletter pages and subdomains came back as results: `NOT_ARTICLE`, exact hosts, and og:type.
- Tracking parameters (`?eafs_enabled=false`, `?syn-…=1`) made extract return no date, so 5 relevant articles were left out and the same article appeared twice. `articleUrl()` strips query, fragment and `/amp`; the retry added them.
- Page fetches vary run to run (Time, FT): two retries added different articles. An article left out for "no date" can come back on a later retry.
- Removed by hand: Wired's newsletter "Shopify Goes Soul-Searching" (one aside on sentience). Marked `removedBy` in the state so no run adds it again.

Bot walls on sitemaps (2026-11-03, issue #27): MIT Technology Review answers 403 now and then for the same file. A walled file is tried three times, 10 and 20 seconds apart, switching between browser and plain client; a wall that stays is a warning in the run summary, not an issue, since search still covers the outlet.

Sitemap backfill (2026-09-27): search had missed articles mostly in 2022 (+4) and 2023 (+9); 2020 and 2021 gained one each, so the quiet early years are quiet, not unsearched. Which outlets have usable sitemaps and why the others do not: the `SOURCES` table in `pipeline/sitemaps.mjs` (survey: `node pipeline/sitemaps.mjs --survey`). New Scientist is left out on purpose: its robots.txt forbids automated mining. Reuters' archive stops at 2023-10 and lists wire copies whose pages are walled, so those are judged on the address words and left out when no headline can be read. The judge sees less for sitemap candidates (page title and description, not a search excerpt).

Unknowns: recall for the 9 search-only outlets (AP, BBC, Guardian, Telegraph, FT, Economist, Atlantic, New Scientist, Nature), and for sitemap outlets, articles whose address does not name the subject. Earlier note: There was no ground truth to check it against (the Guardian's open API key returned 401; Wayback CDX needs authorisation), so the page says earlier years are likely undercounted. English-language publications only. AP returned no article.

Adding an outlet: add it to the config, then `--backfill --outlets <domain>`, so every outlet is counted over the same years.

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

Spend cap ($25/month since 2026-09-28), cadence (detect twice daily since 2026-09-28), build order, and the removed `site-owner` slot: `docs/plan.md` § Decisions.
