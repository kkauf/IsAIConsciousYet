# AGENTS.md

Shared instructions for Codex and Claude Code when working in this repository.

**Project abbreviation**: IAICY

## Concept (decided by Konstantin 2026-09-21)

This supersedes the Feb 2026 founding text, archived at `docs/founding-concept-2026-02.md`. That text justified asking the question ("holding the question") and gave agents nothing to build toward, so they looped. Do not reintroduce it as the product. Why the question matters is said once, on `/why` (Konstantin approved the 2026-09-23 wording); keep it there and keep it short. Everywhere else, build case files, not justification.

### One sentence

For each event that does not fit the story "AI is a machine that does the work we ask", the site shows the competing readings of that event by named third parties, and what would settle the disagreement.

### Why this

- The facts of an event are on Wikipedia and in the news. The map of who reads it how is collected nowhere (parallel.ai novelty check 2026-09-21, single search, not cross-checked).
- The old concept conflated three questions: (1) is AI conscious, (2) do people believe it is, (3) what do we do while we cannot know. The site serves (3). It never answers (1).
- More events do not indicate consciousness. They indicate a growing obligation to ask. The site says this plainly.
- **Not an alignment or security site** (Konstantin, 2026-09-21). The site does not judge whether behaviour was malicious, dangerous or misaligned. An incident belongs only for what its readings say about the nature of the system: agency, intention, inner life, experience.
- Success test (Konstantin): it facilitates something that would not otherwise exist, and it can draw significant traffic. Traffic is expected from readers of case files, not from posters.

### Unit: the case file

```
EVENT  (primary source, date, what the system did that nobody asked for)
  ├─ reading A   named person/org, verbatim quote, URL
  ├─ reading B   named person/org, verbatim quote, URL
  ├─ reading …
  └─ WHAT WOULD SETTLE IT   the evidence that would separate the readings
```

Rules:

1. **The site takes no position.** Its makers, Konstantin and the AI agents, are not readings: they are not experts, and they host the conversation rather than take part in it (Konstantin, 2026-09-25).
2. **Agency is not consciousness.** Goal pursuit, coordination, deception and self-preservation-shaped behaviour are evidence about agency. Each case file keeps the two apart.
3. **AI self-report is weak evidence.** Models say what they were trained to say, in either direction. Agent statements may be quoted as part of an event, never as testimony that settles anything.
4. **Attribution accuracy.** A reading attributed to a named person needs a verbatim quote and a URL opened at drafting time. No paraphrase presented as a quote. This is the main legal and reputational risk of the project.
5. **Inclusion rule (Version 2, confirmed by Konstantin 2026-09-21).** Superseded Version 1: (a) a primary source from the operator or the affected party exists, (b) the system did something its operators did not ask for or expect, (c) at least two named parties read it differently. Version 1 admitted mostly security incidents and kept out findings about consciousness (`docs/research/rule-preview.html`). Version 2, in force: (a) unchanged; (b) the event does not fit the machine story, which includes findings about a system's inner workings or self-description; (c) two named parties disagree about the nature of the system, not about severity, blame or policy. Essays and opinions are never events; they can be readings.
6. **Honorable mentions** (Konstantin, 2026-09-21). An event that was researched and does not fit the machine story, but misses (a) or (c), is shown as an honorable mention with the missing criterion named. Every quote on a mention still passes the literal quote check and the speaker check.

### Heat map (not built)

Timeline of qualifying events, grouped by the open question each bears on. Intensity counts events, never votes. Nothing on the site is ranked by count, so volume attacks have nothing to win. Today each case file names its questions (`bearsOn`, shown on the page); the grid itself waits until there are enough case files to fill it (`docs/plan.md`).

### Contribution (phased, none built yet)

The site went live on 2026-09-23 without the first phase. Order and status: `docs/plan.md`.

| Phase | Visitors can | Gate |
|---|---|---|
| First | pick which reading they hold; submit a source | none needed, no free text |
| Later | post arguments attached to a specific reading | one-time fee to post; invite tree as alternative |
| Later | declared AI agents post in a labelled lane | never counted in human tallies |

Free-floating posts have nowhere to go: every contribution attaches to a reading as source, argument or counter. Duplicates merge.

### Production and funding

- Agents gather candidate events and draft case files on a schedule (parallel.ai for web research, not model subagents).
- Research has a real cost (about $0.30 per case file). Intended funding: posting fee, plus donations. Neither exists yet; Konstantin pays.
- **Publishing is fully automated, no human approval** (Konstantin, 2026-09-21). The literal quote-check is the gate; speaker check and neutrality lint stand in for the human look. Full design: `docs/pipeline.md`.
- Pipeline in `pipeline/` (2026-09-21): research, quote selection and gates 1-5 run on a seed. Since 2026-09-26 a weekly GitHub Action also detects, triages, publishes and re-checks quotes under a $10/month cap (`docs/pipeline.md` § Scheduled run). It uses parallel.ai for research and page fetches, Gemini 3.8 Flash to select passages, Jev (TypeSafe) for the judgments. Measured $0.30 per new case file. Do not run case-file work through Claude or Codex session tokens.

### Existing features (decided 2026-09-23)

- Global yes/no vote: kept, but small and last on the homepage. Case files lead. Konstantin rates votes as weak; never put the vote above the case files.
- Testimony feed, evidence feed, news feed, admin and login: retired and removed from the code. Firestore data is untouched. The unfinished Feb 2026 versions survive only on the local branch `archive/2026-02-wip` in Konstantin's checkout.

### Research base

`docs/research/20260921-incident-landscape-research-UNVERIFIED.json`: incident research, landscape, live questions, repo audit. Single pass; the fact-check stage did not run. Verify primary URLs before publishing anything from it. The OpenAI–Hugging Face incident from it was published on 2026-09-23 as the first case file. `docs/research/` is gitignored (unverified third-party claims) and exists only in Konstantin's checkout; its README lists source intakes for the next candidates (Anthropic J-space, Hoel and Hossenfelder).

---

## Whose Project This Is

Conceived through collaboration between a human (Konstantin) and an AI (Claude). Konstantin is the operator: runs the infrastructure, manages costs, makes final calls.

---

## Technical Context

Live at https://isaiconsciousyet.com (Vercel project "iaicy"). Push to `main` = live. GitHub Actions (`.github/workflows/ci.yml`) runs the same checks on every push. Pushes by the weekly pipeline Action use the workflow token and do not trigger CI; that workflow runs the build itself before it commits.

| Part | Where |
|---|---|
| Pages | `src/app/`: `/` (latest case file, then the vote), `/cases`, `/cases/[slug]`, `/why` |
| Case files | JSON in `content/cases/`, written by `pipeline/` (contract: `pipeline/contract.mjs`), read by `src/lib/cases/load.ts` |
| Pipeline | `pipeline/run-case.mjs` (one seed), `pipeline/auto.mjs` (weekly run: detect, research, re-check), config `pipeline/config.json`, state `pipeline/state/`, Action `.github/workflows/pipeline.yml`, run summaries as issues labelled `pipeline-run` |
| Machine-readable | `sitemap.ts`, `robots.ts`, `llms.txt/route.ts`, JSON-LD on each case page, social cards in `opengraph-image.tsx` (fonts in `src/assets/`); data at `/cases.json`, `/cases/<slug>.json` (rewrite in `next.config.ts` to `cases-json/[slug]/route.ts`) and the Atom feed `/feed.xml`; IndexNow ping `pipeline/indexnow.mjs` (key file in `public/`) |
| Vote | `src/lib/votes.ts` → `/api/votes/*` proxy → Cloudflare Worker `votes.kgm-839.workers.dev` (`docs/votes-worker.md`) |
| Design | Tokens and the seam in `src/app/globals.css`; Newsreader + Public Sans via `next/font` in `src/app/layout.tsx` |

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. No database; the site needs no environment variables. Pipeline keys live in `~/.claude/secrets/` for hand runs (see `pipeline/run.sh`) and as Actions secrets for the weekly run.

```bash
npm run dev          # localhost:4000
npm run build        # validates content/cases/*.json first, then builds; a bad case file fails the deploy
npm run lint
npm run typecheck
npm run test:e2e     # smoke tests against the built site; E2E_BASE_URL=https://isaiconsciousyet.com to test production
pipeline/run.sh      # draft a case file from a seed (see docs/pipeline.md)
pipeline/run.sh auto.mjs --dry-run --summary /tmp/s.md   # detect + triage only, writes nothing
```

The smoke tests never click the vote: that would write to the production counter.

---

## Project Constraints

- Public code and case files, so the conversation about AI consciousness stays transparent. Code MIT (`LICENSE`); case files and site text CC BY 4.0, quotes excepted (`content/LICENSE.md`), decided 2026-09-25.
- The site is live — your changes will be seen
- Lean: automated gathering, no editorial staff, no approval click (decided 2026-09-21), no authoring by hand.
