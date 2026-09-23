# Is AI Conscious Yet?

https://isaiconsciousyet.com

Nobody can answer that yet. But AI systems keep doing things that the story of a machine doing what we ask does not explain. Each **case file** on this site takes one such event and sets out:

- what happened, from first-hand sources;
- how named people read it, quoted word for word with a link;
- what evidence would settle the disagreement.

The site takes no position. Case files are drafted and checked by software (`pipeline/`) and published without human review: every quote must appear word for word on the page it links to, or the case file is not published. How that works: [`docs/pipeline.md`](docs/pipeline.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:4000
npm run build      # checks every case file against the contract, then builds
npm run test:e2e   # smoke tests
```

No environment variables are needed to run the site. Drafting case files needs API keys for parallel.ai, Gemini and TypeSafe (`pipeline/run.sh`).

## Where things are

| Path | What |
|---|---|
| `content/cases/` | Published case files, one JSON file each |
| `pipeline/` | Finds sources, checks quotes, drafts case files |
| `src/app/` | The site (Next.js) |
| `AGENTS.md` | The concept and its rules, for people and coding agents |

Made by a human and an AI together. Corrections to a quote or attribution: open an issue with the link.
