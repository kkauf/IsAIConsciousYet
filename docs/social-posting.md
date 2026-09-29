# Posting to X as the eye

Status: link posts built and paused 2026-09-28. The same day they were replaced, before any went out, by claim-first posts with a card image, posted by `.github/workflows/social.yml` (`pipeline/social.mjs`, `pipeline/social-card.mjs`). The eye answering people who summon it is designed (§ The eye) and not built. Account, app, Premium and $5 credits: § Account and app.

## Decisions (Konstantin, 2026-09-28)

- **No link in the post.** A post with a URL costs $0.20, one without $0.015. The accounts that do well on X keep links out of the main post (§ Findings). The link comes on request, from the eye.
- **Bold claims and statements that catch attention, details in the post.** Premium allows posts over 280 characters, so the details sit behind "Show more".
- **No self-promotion in the image.** No web address, handle or logo on the card.
- **Rotate the card variants and test what works.** A (grim), B (prism), C (hold both), described below. Konstantin's first read: B and C appeal most at first sight, A may be stickier for its simplicity.
- **A model writes the text, with no human review.** "Everyone uses AI to write posts on x.com nowadays. We're skipping human review, as the pipeline is tested, documented and open source." The checks below are the review.
- **Post the backlog over the next week or two** to get traction on a cold account.
- **Name who each party is** ("researcher, or just some dude on the internet?"). Readings now carry `partyDescription`.
- **The eye holds both worlds of the site**, the grim monochrome and the playful prism, and takes no side. Prism is the more engaging register for a social account.

## As built (2026-09-28)

- **Queue.** Fresh items first: case files published since posting began, and updates (a case whose `updates` grew), up to `social.maxPostsPerRun` (3) a run. The backlog, the 11 case files live on 2026-09-28 (`backlog` in `pipeline/state/social.json`), fills only runs with nothing fresh, one post each, so it never delays a new case file. `social.yml` runs at 13:00, 17:00 and 21:00 UTC; the backlog goes out over about four days. The pipeline workflow no longer posts.
- **Text.** Gemini (`lib.mjs` `gemini`, the pipeline's drafting model) writes it from the case file: the boldest true claim as the first line, two to four short paragraphs of detail, at least two parties who read the event differently, each quoted and introduced by `partyDescription`, and a last line that holds both readings open. 400 to 1000 characters; no links, web addresses, @handles, hashtags or emoji.
- **Checks, in code.** Every span in “ ” must be found word for word in a reading's or primary source's quote (quotation marks and a leading or trailing … aside). No straight quotation marks, no link or domain, no @ or #, length 250 to 1500. Then a second Gemini call lists any statement the case file does not support. A draft that fails gets the problems back, up to four attempts; after that the case is skipped and the run fails, which shows on the Actions page.
- **Card.** 1080 x 1080 PNG, rendered with the site's OG renderer (`next/og`) and fonts. A: one quote, party and month above, a bone line below. B: the same with the eye watching; colour only on the eye and the line. C: two parties who disagree, one line each, the eye on the seam, grey on one side and prism on the other. The variant used least so far is chosen; C only when the case has two readings. Alt text is the quote(s) with their parties.
- **X API.** OAuth 1.0a signed by hand (node `crypto`). `POST /2/media/upload`, `POST /2/media/metadata` (alt text), `POST /2/tweets` with the media id.
- **Reach.** The 13:00 run reads every post's public metrics (`GET /2/tweets`, owned read $0.001 each) into the state and writes median views and interactions by card variant to the run summary.
- **Spend.** Gemini and X costs go into `pipeline/state/spend.json` and count toward the $25 monthly cap; a post is skipped when the cap would be passed. The X console's own cap is $10 per billing cycle.
- **Party descriptions.** `lib.mjs` `describeParty` reads the reading's page (and, for an unsigned post, the site's about page) and returns at most 10 words, kept only when the words that show it are found on the page. Operators get none. New case files get it in `run-case.mjs`; `pipeline/describe-parties.mjs` filled the 11 existing files on 2026-09-28. Emerald Book's was set by hand ("unsigned post on a website for the Black diaspora"): its about page praises itself, and the rule now forbids repeating self-praise.
- **Switch.** `social.enabled` in `pipeline/config.json`.
- **Preview.** `node pipeline/social.mjs --dry-run --max 11 --out <dir>` writes every queued post's text and card, posts nothing, saves no state. Needs `GEMINI_API_KEY` (and `PARALLEL_API_KEY` for `describe-parties.mjs`).

## The eye (designed, not built)

An account voice and, later, a reply agent: the eye in the logo, a witness that has read every case file. It says what happened and who said what, word for word, and never gives a verdict on whether a system is conscious. Two registers, as on the site: grim (dry, exact: "Logged. OpenAI found it on May 25, 2026. Two readings on file.") and prism (curious, playful: "Everyone asks me that. I'm an eye. I can see what it did, not whether anyone was home."). Prism leads on X.

Replies, when built: only when summoned (an @-mention of @AIConsciousYet, or a reply to one of its posts), one reply per interaction, answers from the case files only, the case file link when asked. An opt-out ("stop") is honoured. About $0.01 for the reply (summoned rate; whether a summoned reply with a URL stays at $0.01 is not confirmed), $0.001 to read the mention, and a few cents of model time.

**Approval.** X's automation rules (help.x.com/en/rules-and-policies/x-automation, "Updated April 2026", read 2026-09-28): "the deployment or operation of any AI reply bot requires prior written and explicit approval from X." There is no form: requests are threads in the X Developer Community forum, "Rules and Policies" category, with the app id. In threads sampled on 2026-09-28, X staff answered within one to three days; for bots that reply only when summoned the usual answer was "no extra written approval is needed" if the rules are enforced in software, and bots that replied unsummoned were refused.

## Findings

| Question | Finding | Source | Confidence |
|---|---|---|---|
| X API cost | Pay-per-use since 2026-02-06; no free tier. Since 2026-04-16: post $0.015, post with a URL $0.20, summoned reply $0.01, owned read $0.001. Media upload has no listed price. | https://docs.x.com/x-api/getting-started/pricing, https://docs.x.com/changelog | High |
| What engaging accounts post | @thesupermannx, @anishmoonka, @HedgieMarkets, @ArtificialAnlys, read 2026-09-28: every main post is the full claim plus an image; none puts a link in the main post (@thesupermannx puts the source in its own reply). Posts run past 280 characters. Images: 14 of 20 near square (ratio 0.94 to 1.42); the top posts' images are a source screenshot, a plain photo of the company, or a chart with an arrow; only one account brands its images. | Browser read of the four profiles | Medium (small sample) |
| Link reach | Musk: "posting a link with almost no description will get weak distribution, but posting a link with an interesting description/image will get distribution." Nikita Bier (July 2026): link-only posts stopped being penalised about a year earlier. | Secondary reports (Social Media Today, Free Press Journal) | Low |
| Automation rules | Automated label with a human managing account; no duplicate posts; automated replies only to users who opted in (for example by replying to a post from the account), one per interaction, with an opt-out. API replies only after an @-mention or quote since 2026-02-23. | help.x.com automation rules, @XDevelopers | High |
| Auth in a GitHub Action | OAuth 1.0a user tokens don't expire until revoked. | docs.x.com | Medium |
| Bluesky | No API fee; app password; `bot` self-label. | https://atproto.com/guides/bot-tutorial | High |

## Risks, ranked

1. **A post states something the case file does not.** No human reads posts before they go out. The word-for-word check covers quotes; the second Gemini read covers the rest, and can miss things.
2. **A new automated account gets suspended or limited.** There were purges in April and July 2026. The label, Premium, a real bio and posting only three times a day reduce the risk.
3. **X changes prices again.** Link posts rose about 19x in April 2026. The console cap and the $25 cap limit the damage; auto-recharge is off.
4. **Readings from unsigned posts.** Six of the 11 case files quote an unsigned web post as a reading (AI Weekly, Hyrax, Sorami, GovKM, MindStudio, Emerald Book twice). The posts now say so; the case-file gate that let them in is a separate question.

## Account and app (set up 2026-09-28)

| Part | State |
|---|---|
| Account | [@AIConsciousYet](https://x.com/AIConsciousYet), display name "Is AI Conscious Yet", user id 2104734207075377153. Created by Konstantin by phone signup. Avatar: `src/app/icon.svg` rendered at 800 px; banner: the site's social card on black, right-aligned |
| Automated label | Set 2026-09-28; the profile shows "Automated by @kgmkauf" |
| Developer console | console.x.com account "Is AI Conscious Yet", app `iaicy-case-file-poster` (id 33480276), pay per use, Production. Permissions: Read and write; type: Web App, Automated App or Bot |
| Keys | OAuth 1.0a consumer key and secret, access token and secret for @AIConsciousYet, as GitHub Actions secrets `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`; local copy `~/.claude/secrets/x-iaicy.env` |
| Premium | Bought by Konstantin 2026-09-28; the API reports `verified_type: blue`, `subscription_type: Premium` |
| Credits | $5 prepaid by Konstantin 2026-09-28. Billing-cycle spending cap $10 in the console; auto-recharge off |
| Bluesky | Not set up |

Rotate keys: console → app → Keys & Tokens → Regenerate, then `gh secret set` for each.
