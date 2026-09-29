# Automated social posts for case files: feasibility

Status: researched 2026-09-26; built 2026-09-28 (`pipeline/social.mjs`, step "Post to X" in `.github/workflows/pipeline.yml`). Waits for the X account and its four secrets (§ What Konstantin does himself); until then the step logs one line and posts nothing. Konstantin asked for an account that posts neutral updates when a case file is published or updated. It must not tweet opinions.

## As built (2026-09-28)

- Templates in `pipeline/social.mjs`, filled by code. New case file: title, number of readings, link. Honorable mention: title, the case file's `missingCriterion`, link. Update: title, the last `updates[].change` line, link. Operator and date are left out: some operator fields run to a sentence.
- OAuth 1.0a signed by hand (node `crypto`, no dependency), `POST https://api.x.com/2/tweets`.
- State `pipeline/state/social.json`. The 9 case files live on 2026-09-28 were backfilled (`--backfill`), so the first live run posts only what is published after that. Konstantin can post the backlog by hand, which also warms up the account.
- At most `social.maxPostsPerRun` (4) posts a run; the rest wait. A post waits until its page answers 200. A 401, 402, 403 or 429 stops the run's posting and opens the `pipeline-run` issue.
- The two open decisions below were set to reversible defaults on 2026-09-28: honorable mentions are posted (`social.postMentions: true` in `pipeline/config.json`), since they pass the same quote checks and 4 of the 5 newest files are mentions; X spend is not counted in the pipeline's $10 cap, the X console's spending limit caps it.
- Dry run: `node pipeline/social.mjs --dry-run` prints every post it would make.

## Shape

The pipeline publishes or updates a case file. A fixed template is then filled from the case file's fields, with no model writing text: "New case file: {title}. {operator}, {date}. {n} readings, quoted word for word. {link}". The post goes to X, and optionally to Bluesky.

- **Not allowed:** replies, quote-posts, @-mentions of the people quoted, or free text written by a model.
- **Volume:** `pipeline/config.json` allows at most 3 new cases and 1 update per run, and since 2026-09-28 there are two runs a day. The spend cap binds first: at $0.30 a case, the $25 monthly cap allows about 70 new or updated files, so up to about 70 posts, $14 at $0.20 a link post; realistic months are far lower.

## Findings

| Question | Finding | Source | Confidence |
|---|---|---|---|
| X API cost | Pay-per-use since 2026-02-06; there is no free tier. Since 2026-04-16 a post costs $0.015, or $0.20 if it contains a URL. Credits are prepaid, with a spending limit. Rate limit: 100 posts per 15 min per user. That is about $1–4 a month here. | https://docs.x.com/x-api/getting-started/pricing, https://docs.x.com/changelog | High |
| X automation rules | The "Automated" label, with a human managing account, is required. Duplicate or substantially similar posts are banned; templated posts that vary by title are fine. Since 2026-02-23, automated replies are allowed only after an @mention. | https://help.x.com/en/using-x/automated-account-labels, https://help.x.com/en/rules-and-policies/x-automation (seen as search snippets; help.x.com blocks fetching) | Medium |
| Cloud IPs | X's rules say nothing about posting from GitHub Actions or other cloud IPs. Third-party reports say the April 2026 purge hit accounts on datacenter IPs with no human activity. | socialnexis.com, socialmediatoday.com | Low |
| Auth in a GitHub Action | OAuth 1.0a user context: the tokens don't expire until revoked. OAuth 2.0 access tokens last 2 hours and need refresh handling. | https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code | High for 2.0, Medium for 1.0a |
| Library | `twitter-api-v2` v1.29.1 (2026-08-04), maintained | `npm view`, 2026-09-26 | High |
| Bluesky | No API fee. Log in with an app password. Add the `bot` self-label. Limit: 1,666 records an hour. `@atproto/api` v0.21.0 | https://atproto.com/guides/bot-tutorial, https://docs.bsky.app/docs/advanced-guides/rate-limits | High |

## Risks, ranked

1. **A new automated account gets suspended or limited.** There were purges in April and July 2026. The label, a real bio and a human managing account reduce the risk; posting a few times by hand first, or starting on Bluesky, reduces it more.
2. **X changes prices again.** Link posts rose about 19x in April 2026. Keep a spending limit, and leave auto-recharge off.
3. **A post goes out for a case that turns out wrong.** Case files are published without human review, so a post inherits any mistake the gates miss.
4. **OAuth 1.0a might be retired.** No end date is announced; X added a 1.0a-to-2.0 token exchange on 2026-09-21.

## Where it hooks in

- **Placement:** a new step in `.github/workflows/pipeline.yml`, after "IndexNow ping for new case files". That step already waits until the new page answers 200, so the link works before anyone sees it.
- **What to post:** a script compares `content/cases/*.json` with a new state file, `pipeline/state/social.json` (`{slug: {postedAt, updatesCount, xId, bskyUri}}`).
  - A published case the state file doesn't list gets a "new" post.
  - A case whose `updates.length` has grown gets an "updated" post, with `updates.at(-1).change`.
- **Recording:** write each state entry right after its post succeeds, then commit and push. The post step runs after the pipeline's commit step, so it needs its own.
- **Backlog:** fill the state file with the existing cases before the first live run, or it will post all of them.
- **Fields:** `title`, `event.operator`, `event.dateStart`, `readings.length`, `slug` (the link is `https://isaiconsciousyet.com/cases/<slug>`).

## What Konstantin does himself

1. **Account:** create the X account. Turn on the Automated label with his personal handle as the managing account. Bio: "Automated. Posts when a case file is published or updated."
2. **Developer app:** log in to console.x.com as the bot and create an app with user authentication set to Read and write. Only then generate the API key and secret and the access token and secret.
3. **Credits:** buy about $5 of credits and set a spending limit, with auto-recharge off.
4. **Secrets:** add `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN` and `X_ACCESS_SECRET` as GitHub Actions secrets.
5. **Bluesky (optional):** create the account and an app password, and add two more secrets.

## Open decisions

- Should honorable mentions (`tier: "mention"`) be posted too?
- Should X spend count toward the pipeline's $10 a month cap (`pipeline/state/spend.json`), or only toward the X console's own limit?
