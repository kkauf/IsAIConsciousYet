# Plan: a site that maintains itself (2026-09-25)

Goal (Konstantin, 2026-09-25): the project maintains itself, is visually appealing, is usable by agents and humans, and adds value. Concept and rules: `AGENTS.md`. Pipeline design: `docs/pipeline.md`.

## Where it stands

| Goal | Done | Missing |
|---|---|---|
| Adds value | 1 published case file (OpenAI–Hugging Face) | More case files. With one, the site is a single article. |
| Maintains itself | CI on every push; the build refuses a malformed case file | Detect, triage, a scheduled run, auto-publish, the weekly quote re-check, a spend cap. The pipeline runs only by hand. No API keys in Actions secrets. |
| Usable by agents | `llms.txt`, sitemap, robots, Article JSON-LD, social cards | Case data as JSON, a feed, search-engine submission, a licence |
| Usable by humans | Design pass 2026-09-23; case files first, vote last | "Report an error" link (promised in `docs/pipeline.md`), a case index that scales past a handful |

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

Run `pipeline/run.sh` on the candidates already researched: the source intakes for Anthropic J-space and Hoel/Hossenfelder, and the Version 2 case files from the rule preview (`docs/research/rule-preview.html`: 7 case files and 3 honorable mentions predicted). About $0.30 each.

While running them, fix the open items from `docs/pipeline.md`:
- Quote selection should prefer passages about the nature of the system. Today it selects them only by chance: 2 of 11 readings on case 1.
- Ask research for a second URL per party, so that a paywalled page (Gary Marcus) does not cost the reading.
- Save a Wayback snapshot at drafting time. `waybackSnapshot` in `pipeline/lib.mjs` only looks up an existing snapshot.
- Summary sentences that carry numbers fail the support check.
- Replace the fixed 0.7 disagreement threshold with a rule measured across several cases.

Done when: 5 or more case files are live and every run's drops are explained in its `report.json`.

## 2. Self-maintaining

One scheduled GitHub Action. Nothing runs on Konstantin's Mac, and Actions are free for a public repo.

| Job | Cadence | Does |
|---|---|---|
| detect + triage | weekly | parallel.ai monitor plus fixed feeds → Jev routes each candidate: new event, update to a case file, new reading, drop |
| draft + gates | per candidate | the existing `run-case.mjs`; a pass commits the JSON to `main`. The build validates it again, and the Vercel deploy publishes it. |
| re-check | weekly | gate 2 on every live quote. A quote that is gone gets marked "source changed" and shows its archived URL. |
| notify | on publish or failure | GitHub issue on this repo, which emails Konstantin. Not a gate. |

Also needed:
- The API keys as Actions secrets.
- A monthly spend cap read from config; when it is reached the job stops before research.
- Dependabot for npm, so that CI tests the updates.
- A kill switch, which already works: `status: withdrawn` in the case file's JSON, then one commit.

## 3. Agents and search

- `/cases/<slug>.json` and `/cases.json`: the case files as data, served by the same loader.
- An Atom feed at `/feed.xml`, so people and agents can follow new case files.
- Submit the sitemap to Google Search Console and Bing Webmaster, and ping IndexNow on every publish.
- A "Report an error" link on each case page that opens a prefilled GitHub issue.
- A licence file (decision below). A public repo without one is "all rights reserved", which contradicts "public code and case files".

## 4. Scale the index

Wait until there are 8 or more case files. Then `/cases` becomes the heat map from `AGENTS.md`: a timeline of events grouped by the open question each bears on. Honorable mentions get their own treatment in the list. The homepage keeps leading with the latest case file.

## Open decisions

| Decision | Proposed |
|---|---|
| Order | Content by hand first (stage 1) |
| Spend cap and cadence | Detect weekly; cap $10/month, about 30 case files |
| Licence | MIT for the code; CC BY 4.0 for the site's own text and the case-file structure. Quotes remain their authors'. |
| Per-case reading tally ("which reading do you hold") | Decide after stage 1. The first contribution phase in `AGENTS.md` asks for it, but only 2 readings per case face each other today. |
| Konstantin's own reading (`site-owner`) | He tells an agent, and it is labelled as his. It skips gates 2-3. |

## Measuring value

The success test in `AGENTS.md` is traffic from people reading case files. Once search submission is done, read Search Console clicks per case page, not homepage visits.
