import { allCases, SITE_URL } from "@/lib/cases/load";

export const dynamic = "force-static";

// Every published case file as data, in the shape pipeline/contract.mjs defines.
export function GET() {
  return Response.json({
    site: "Is AI Conscious Yet?",
    url: SITE_URL,
    generated: new Date().toISOString(),
    licence: "case files and site text CC BY 4.0, quotes remain their authors'; https://creativecommons.org/licenses/by/4.0/",
    contract: "https://github.com/kkauf/IsAIConsciousYet/blob/main/pipeline/contract.mjs",
    cases: allCases(),
  });
}
