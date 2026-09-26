# Plan: a site that maintains itself (2026-09-25)

Goal (Konstantin, 2026-09-25): the project maintains itself, is visually appealing, is usable by agents and humans, and adds value. Concept and rules: `AGENTS.md`. Pipeline design: `docs/pipeline.md`.

## Where it stands

| Goal | Done | Missing |
|---|---|---|
| Adds value | 7 published (2026-09-26): 4 case files, 3 honorable mentions | Volume comes from the weekly run; readings per case are still thin (2 to 9) |
| Maintains itself | CI on every push; the build refuses a malformed case file. Stage 2 built 2026-09-26 and ran live the same day (issue #8): weekly Action with detect, triage, auto-publish, updates to existing files, one retry of parked events, quote re-check, spend cap, Dependabot | Re-checking honorable mentions |
| Usable by agents | `llms.txt`, sitemap, robots, Article JSON-LD, social cards, licence (MIT code, CC BY 4.0 content), case data as JSON, Atom feed, IndexNow ping after each automated publish (covers Bing) Google Search Console: domain property verified 2026-09-26 (DNS TXT on Cloudflare), sitemap submitted | |
| Usable by humans | Design pass 2026-09-23; case files first, vote last; "Report an error" link on each case page | A case index that scales past a handful |

## Order

```
1 CONTENT BY HAND ──► 2 SELF-MAINTAINING ──► 4 SCALE THE INDEX
  5-8 case files        scheduled Action         heat map / timeline
  fix open pipeline     publishes on its own     once 8+ case files
  items on real runs          │
                              ▼
                        3 AGENTS AND SEARCH (can run in parallel with 1)
```

Content goes first because the pipeline has only seen one kind of event (an incident). The J-space finding and the Hoel paper are research and argument, not incidents. Automating before the pipeline handles them would publish its failures unattended.

## 1. Content by hand

Status 2026-09-26: done. Nine seeds in `pipeline/seeds/` ran through the pipeline, at about $0.30 for a first run and $0.05 to $0.20 for a rerun on cached research. Seven were published: 4 case files and 3 honorable mentions. Two were parked by the gates: the Claude Mythos psychiatric assessment (neutrality lint, twice) and Google Gemini CTF access (no exact event date). Hoel and Hossenfelder did not survive as readings of the J-space case.

Pipeline changes from these runs (`pipeline/run-case.mjs`, `lib.mjs`, version 0.2):

| Observed | Change |
|---|---|
| Quotes about the nature of the system were picked by chance | Selection asks for them first. 15 of 21 readings on the six new files qualify, against 2 of 11 on case 1 |
| A paywalled or empty page cost the reading | Research returns a second URL per party; empty pages are fetched directly |
| Wayback lookups returned old snapshots | A fresh snapshot is saved at drafting time |
| An operator's paper on its own research domain failed the speaker check | Primary pages count as written by their publisher; co-authored passages merge |
| A quote about Anthropic's incidents was attached to the AISI incident | Gate 3 also checks the quote is about this event (0.8) and the party is identifiable (0.6), which drops anonymised and bare-handle parties |
| System cards run past 120k characters | The page is windowed around the event |
| Research returned dates like "2026-07; exact day not confirmed" | Only YYYY-MM-DD dates are kept; the contract rejects others |

Still open:
- Runs are not reproducible: rerunning the same research can drop a reading that passed before. Since 2026-09-26 a rerun carries forward everything the published file had (`docs/pipeline.md` § Scheduled run), so variance can only add. New cases still depend on one run.
- The disagreement threshold (0.7) and the summary number check are unchanged.
- Parties are checked for being identifiable, not for standing; small outlets (AlpacaX, Hyrax, GovKM) can be readings.

## 2. Self-maintaining

One scheduled GitHub Action. Nothing runs on Konstantin's Mac, and Actions are free for a public repo.

Status 2026-09-26: built (`.github/workflows/pipeline.yml`, `pipeline/auto.mjs`, `detect.mjs`, `recheck.mjs`, `config.json`, `state/`; details in `docs/pipeline.md` § Scheduled run). First live run 2026-09-26 (issue #8): 6 found, 0 published, 3 parked (new OpenAI reports with 0 or 1 readings yet), 1 queued, 88 quotes re-checked, $0.52. Bot commits deploy through Vercel. Detect costs $0.01 a week.

| Part | Status |
|---|---|
| detect + triage | Built. One parallel.ai Task (`base`) with the fixed source list, then one Jev call. The parallel.ai monitor and polled feeds were replaced by the task. |
| draft + gates | Built. Up to 3 queued events per run through `run-case.mjs`; build, then commit to `main`. |
| re-check | Built. Marks `sourceChanged`, shown on the case page. |
| notify | Built. Issue with label `pipeline-run` per run, another on failure. |
| spend cap | Built. $10/month from `pipeline/config.json`, checked before every paid step. |
| Dependabot | Built. npm weekly (minor and patch grouped), Actions monthly. `.github/workflows/dependabot-merge.yml` merges those after CI passes. npm major versions are not proposed (they need deliberate work). |
| Updates to existing cases | Built 2026-09-26. One case per run is rerun with the new sources; additions only, logged on the page under Updates. |
| Parked events | Retried once, 21 days after they parked. |
| Mention re-checks | Not built. |
| IndexNow on publish | Built. The workflow calls `pipeline/indexnow.mjs` once the first new page answers. |

Kill switch: `status: withdrawn` in the case file's JSON, then one commit.

## 3. Agents and search

- Done: `/cases/<slug>.json` and `/cases.json`, the case files as data, served by the same loader. Linked from `llms.txt` and `<link rel="alternate">`.
- Done: an Atom feed at `/feed.xml`, so people and agents can follow new case files.
- Done: a "Report an error" link on each case page that opens a prefilled GitHub issue.
- Done: `pipeline/indexnow.mjs` pings IndexNow (key file `public/<key>.txt`), which reaches Bing, Yandex and others; the weekly run calls it after publishing.
- Done 2026-09-26: Google Search Console domain property `isaiconsciousyet.com` on kgm@kaufmann.earth, verified by DNS TXT on Cloudflare; sitemap submitted.

## 4. Scale the index

Wait until there are 8 or more case files. Then `/cases` becomes the heat map from `AGENTS.md`: a timeline of events grouped by the open question each bears on. Honorable mentions get their own treatment in the list. The homepage keeps leading with the latest case file.

## Decisions (Konstantin, 2026-09-25)

| Decision | Outcome |
|---|---|
| Order | Content by hand first (stage 1), then the automation |
| Spend cap and cadence | Detect weekly; cap $10/month (about 30 case files) |
| Licence | Done: MIT for the code (`LICENSE`); CC BY 4.0 for the site's own text and the case files, quotes excepted (`content/LICENSE.md`) |
| Per-case reading tally | Proposed 2026-09-26: wait until the main vote passes 100 votes (7 on 2026-09-26), pending Konstantin |
| Konstantin's own reading | None. The makers host the conversation and are not readings; the `site-owner` party type is removed |

## Measuring value

The success test in `AGENTS.md` is traffic from people reading case files. Once search submission is done, read Search Console clicks per case page, not homepage visits.
