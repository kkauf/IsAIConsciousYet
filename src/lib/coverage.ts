// Press coverage: content/coverage.json, written by pipeline/coverage.mjs. Drawn with the case files on /timeline.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CaseFile } from "@/lib/cases/load";

export type Article = { date: string; publication: string; headline: string; url: string; foundAt: string };
export type Coverage = { since: string; updatedAt: string | null; outlets: string[]; articles: Article[] };

const FILE = path.join(process.cwd(), "content", "coverage.json");

export function loadCoverage(): Coverage {
  if (!existsSync(FILE)) return { since: "2020-01-01", updatedAt: null, outlets: [], articles: [] };
  return JSON.parse(readFileSync(FILE, "utf8")) as Coverage;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export type Month = { key: string; articles: Article[]; cases: CaseFile[] };

// Every month from `since` to the month of `now`, oldest first, with what happened in it.
export function months(coverage: Coverage, cases: CaseFile[], now = new Date()): Month[] {
  const out: Month[] = [];
  let y = Number(coverage.since.slice(0, 4)), m = Number(coverage.since.slice(5, 7));
  const endY = now.getUTCFullYear(), endM = now.getUTCMonth() + 1;
  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push({
      key,
      articles: coverage.articles.filter((a) => a.date.startsWith(key)),
      cases: cases.filter((c) => c.event.dateStart.startsWith(key)),
    });
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}

// The takeaway line: the last twelve months against the first year on record.
export function takeaway(ms: Month[], outlets: number) {
  const last12 = ms.slice(-12).reduce((n, m) => n + m.articles.length, 0);
  const firstYear = ms[0]?.key.slice(0, 4) ?? "";
  const inFirstYear = ms.filter((m) => m.key.startsWith(firstYear)).reduce((n, m) => n + m.articles.length, 0);
  return `Articles in ${outlets} major publications about whether AI could be conscious: ${last12} in the last twelve months, ${inFirstYear} in all of ${firstYear}.`;
}
