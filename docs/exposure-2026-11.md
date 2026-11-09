# Exposure and money: where IACY stands (2026-11-08)

Konstantin, Signal 2026-11-08 19:31: "kinda would like monetization/exposure. Can't be that Patrick Collins posts about ai consciousness and I'm one of the few pages on it on the web". 19:32: "I bookmarked his post on X".

## The post

Patrick **Collison** (@patrickc, Stripe, 1.84 M followers), 2026-11-08 18:22 UTC: https://x.com/patrickc/status/2119495828683530519. At 00:40 UTC on Nov 9 (X API): 408,452 views, 2,844 likes, 273 replies, 3,040 bookmarks. His second point: if AIs get moral worth, "even epsilon of moral worth will multiply to a lot", so one must reject AI moral worth, utilitarianism, or AIs outnumbering humans.

Inference: this is the post Konstantin bookmarked. The bookmark list could not be read (Agent Chrome's DevTools port did not answer, 2026-11-09 00:33–00:45 UTC). The match is by name, topic and date. @PatrickAlphaC (Patrick Collins, Cyfrin) posted nothing on AI consciousness: his timeline, read by X API, has no such post and a content break since 2026-07-30.

## Reach so far

| Channel | Since | Result | Source |
|---|---|---|---|
| Google search | 2026-09-26 to 11-06 | 1 click, 71 impressions; best page "anthropic-claude-cyber-evaluation" at position 10 | Search Console API |
| X @AIConsciousYet | 73 posts since 2026-09-28 | 163 views in total, median 2 a post, 0 likes, 0 reposts | X API public_metrics, read 2026-11-09 |
| Spend | Sep to Nov 8 | $46.96 (Sep $8.04, Oct $31.92, Nov $6.99) | `pipeline/state/spend.json` |

Konstantin's premise holds in part. Few sites track AI events against the consciousness question: the only other "tracker" found (ai-consciousness-tracker.vercel.app) scores AI progress in general. But the head searches ("is AI conscious") go to large outlets (Semafor, LSE, BuiltIn), and Google shows IACY almost never.

## What held reach back (fixed 2026-11-08/09)

1. **74 case files held 33 events.** 19 files covered one event, the OpenAI evaluation agents breaking into Hugging Face; 6 more events had 2 to 9 files each. To Google and to a reader the site looked like repeats. Cause: the same-event check picked from 100+ known items, many of them copies, so the right case scored below its 0.5 threshold. Commit 9a71834 merged them into 33 case files, redirects the retired URLs (308) and lists only published case files in the check (`docs/pipeline.md` § Merged case files).
2. **X reach was never measured.** The reach step ran only when a job started at 13:00 UTC. GitHub starts the jobs hours late, so it never ran. It now runs once a day (commit 0b0c007).

## Levers, by expected visits per minute of Konstantin's time

| # | Lever | His minutes | Cost | Why |
|---|---|---|---|---|
| 1 | Reply under Collison's post from @kgmkauf with the site link | 2 | $0 | 408k views and 273 replies today; attention on a post fades within 1–2 days (inference). X allows API replies only after a mention or quote (X automation rules, 2026-02-23), so @AIConsciousYet cannot reply by itself |
| 2 | Tip the Digital Minds Newsletter (digitalminds@substack.com) | 10 | $0 | It collects AI consciousness news and research: the closest audience fit |
| 3 | EA Forum or LessWrong post: "a neutral case-file tracker" | 60 | $0 | Digital-minds work is discussed and cross-posted there |
| 4 | Show HN | 30 | $0 | One spike; no earlier AI-consciousness tracker found there |

## Money

| Route | Earns more than the $25/month pipeline cap at | Verdict now |
|---|---|---|
| Display ads (AdSense) | about 2,500–5,000 page views a month (inference, $5–10 RPM) | $0 at 1 click a month |
| Premium ad networks (Mediavine, Raptive, Ezoic) | 25k–250k sessions a month | out of reach |
| Grant (e.g. Longview Digital Sentience Consortium, $50k–$2M for applied work and field-building) | one grant | the only route that pays soon; a neutral, sourced tracker fits "field-building" (inference). Needs traffic or researcher users as proof |

Order: reach first, then a grant application with the reach numbers. Ads only after ~5k page views a month.

## Not checked

Google Trends direction and keyword volumes; exact top-10 order per keyword; subreddit self-promotion rules; donations; data licensing.
