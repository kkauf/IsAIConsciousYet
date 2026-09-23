# AGENTS.md

Shared instructions for Codex and Claude Code when working in this repository.

**Project abbreviation**: IAICY

## Concept (decided by Konstantin 2026-09-21)

This supersedes the Feb 2026 founding text, archived at `docs/founding-concept-2026-02.md`. That text justified asking the question ("holding the question") and gave agents nothing to build toward, so they looped. Do not reintroduce it. Do not write copy about why the question matters. Build the thing below.

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

1. **The site takes no position.** Konstantin's own reading is one slot among the others, labelled as his.
2. **Agency is not consciousness.** Goal pursuit, coordination, deception and self-preservation-shaped behaviour are evidence about agency. Each case file keeps the two apart.
3. **AI self-report is weak evidence.** Models say what they were trained to say, in either direction. Agent statements may be quoted as part of an event, never as testimony that settles anything.
4. **Attribution accuracy.** A reading attributed to a named person needs a verbatim quote and a URL opened at drafting time. No paraphrase presented as a quote. This is the main legal and reputational risk of the project.
5. **Inclusion rule (Version 2, confirmed by Konstantin 2026-09-21).** Superseded Version 1: (a) a primary source from the operator or the affected party exists, (b) the system did something its operators did not ask for or expect, (c) at least two named parties read it differently. Version 1 admitted mostly security incidents and kept out findings about consciousness (`docs/research/rule-preview.html`). Version 2, in force: (a) unchanged; (b) the event does not fit the machine story, which includes findings about a system's inner workings or self-description; (c) two named parties disagree about the nature of the system, not about severity, blame or policy. Essays and opinions are never events; they can be readings.
6. **Honorable mentions** (Konstantin, 2026-09-21). An event that was researched and does not fit the machine story, but misses (a) or (c), is shown as an honorable mention with the missing criterion named. Every quote on a mention still passes the literal quote check and the speaker check.

### Heat map

Timeline of qualifying events, grouped by the open question each bears on. Intensity counts events, never votes. Nothing on the site is ranked by count, so volume attacks have nothing to win.

### Contribution (phased)

| Phase | Visitors can | Gate |
|---|---|---|
| Launch | pick which reading they hold; submit a source | none needed, no free text |
| Later | post arguments attached to a specific reading | one-time fee to post; invite tree as alternative |
| Later | declared AI agents post in a labelled lane | never counted in human tallies |

Free-floating posts have nowhere to go: every contribution attaches to a reading as source, argument or counter. Duplicates merge.

### Production and funding

- Agents gather candidate events and draft case files on a schedule (parallel.ai for web research, not model subagents).
- Research has a real cost. Funding: posting fee, plus donations.
- **Publishing is fully automated, no human approval** (Konstantin, 2026-09-21). The literal quote-check is the gate; speaker check and neutrality lint stand in for the human look. Full design: `docs/pipeline.md`.
- Prototype in `pipeline/` (2026-09-21): parallel.ai for research and page fetches, Gemini 3.8 Flash to select passages, Jev (TypeSafe) for the judgments. Measured $0.30 per new case file. Do not run case-file work through Claude or Codex session tokens.

### Existing features (decided 2026-09-23)

- Global yes/no vote: kept, but small and last on the homepage. Case files lead. Konstantin rates votes as weak; never put the vote above the case files.
- Testimony feed, evidence feed, news feed, admin and login: retired and removed from the code. Firestore data is untouched. The unfinished Feb 2026 versions survive only on the local branch `archive/2026-02-wip` in Konstantin's checkout.

### Research base

`docs/research/20260921-incident-landscape-research-UNVERIFIED.json`: incident research, landscape, live questions, repo audit. Single pass; the fact-check stage did not run. Verify primary URLs before publishing anything from it. First case file candidate: the OpenAI–Hugging Face incident (May–July 2026).

---

## Whose Project This Is

Conceived through collaboration between a human (Konstantin) and an AI (Claude). Konstantin is the operator: runs the infrastructure, manages costs, makes final calls.

---

## Technical Context

Live at https://isaiconsciousyet.com (Vercel project "iaicy"). Push to `main` = live. GitHub Actions (`.github/workflows/ci.yml`) runs the same checks on every push.

| Part | Where |
|---|---|
| Pages | `src/app/`: `/` (latest case file, then the vote), `/cases`, `/cases/[slug]`, `/why` |
| Case files | JSON in `content/cases/`, written by `pipeline/` (contract: `pipeline/contract.mjs`), read by `src/lib/cases/load.ts` |
| Machine-readable | `sitemap.ts`, `robots.ts`, `llms.txt/route.ts`, JSON-LD on each case page, social cards in `opengraph-image.tsx` (fonts in `src/assets/`) |
| Vote | `src/lib/votes.ts` → `/api/votes/*` proxy → Cloudflare Worker `votes.kgm-839.workers.dev` (`docs/votes-worker.md`) |
| Design | Tokens and the seam in `src/app/globals.css`; Newsreader + Public Sans via `next/font` in `src/app/layout.tsx` |

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. No database; the site needs no environment variables. Pipeline keys live in `~/.claude/secrets/` (see `pipeline/run.sh`).

```bash
npm run dev          # localhost:4000
npm run build        # validates content/cases/*.json first, then builds; a bad case file fails the deploy
npm run lint
npm run typecheck
npm run test:e2e     # smoke tests against the built site; E2E_BASE_URL=https://isaiconsciousyet.com to test production
pipeline/run.sh      # draft a case file from a seed (see docs/pipeline.md)
```

The smoke tests never click the vote: that would write to the production counter.

---

## Project Constraints

- Open source — the conversation about AI consciousness should be transparent
- The site is live — your changes will be seen
- Lean: automated gathering, no editorial staff. An approval click is acceptable; authoring by hand is not.
