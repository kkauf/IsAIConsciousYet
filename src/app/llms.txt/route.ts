import { allCases, dateRange, SITE_URL } from "@/lib/cases/load";

export const dynamic = "force-static";

// https://llmstxt.org: a plain index for language models and answer engines.
export function GET() {
  const cases = allCases().sort((a, b) => b.event.dateStart.localeCompare(a.event.dateStart));
  const body = [
    "# Is AI Conscious Yet?",
    "",
    "> Case files on events where AI systems did something that does not fit the story of a machine doing the work we ask. Each case file gives the event from first-hand sources, competing readings by named people quoted word for word with links, and what evidence would settle the question. The site takes no position on whether AI is conscious.",
    "",
    "## Case files",
    "",
    ...cases.map((c) => `- [${c.title}](${SITE_URL}/cases/${c.slug}): ${dateRange(c.event.dateStart, c.event.dateEnd)}. ${c.event.unaskedBehaviour}`),
    "",
    "## Data",
    "",
    `- [All case files as JSON](${SITE_URL}/cases.json)`,
    `- One case file as JSON: ${SITE_URL}/cases/<slug>.json`,
    `- [Atom feed of new case files](${SITE_URL}/feed.xml)`,
    `- [Timeline](${SITE_URL}/timeline): articles in 24 major publications about whether AI could be conscious, month by month since 2020, with the case files. Data: ${"https://github.com/kkauf/IsAIConsciousYet/blob/main/content/coverage.json"}`,
    "",
    "## About",
    "",
    `- [Why this site exists](${SITE_URL}/why)`,
    `- [How case files are made](${SITE_URL}/cases)`,
    "- Licence: case files and site text CC BY 4.0 (quotes remain their authors'); code MIT. Source: https://github.com/kkauf/IsAIConsciousYet",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
