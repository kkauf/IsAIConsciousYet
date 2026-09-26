// Case files are JSON in content/cases/, written by pipeline/ (contract: pipeline/contract.mjs).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type Reading = {
  partyName: string; partyType: string; stanceLabel: string; quote: string;
  url: string; archivedUrl?: string; date?: string; aboutNature?: boolean;
  sourceChanged?: string; // set by pipeline/recheck.mjs when the page no longer holds the quote
};
export type Source = { url: string; archivedUrl?: string; publisher: string; published?: string; quote: string; sourceChanged?: string };
export type CaseFile = {
  slug: string; title: string; status: "published" | "parked" | "withdrawn";
  tier: "case-file" | "mention"; missingCriterion?: string;
  event: { dateStart: string; dateEnd?: string; operator: string; affectedParties: string[]; summary: string; unaskedBehaviour: string; primarySources: Source[] };
  bearsOn: string[]; agencyNote: string; consciousnessNote: string;
  readings: Reading[]; whatWouldSettleIt: string[];
  provenance: { draftedBy: string; pipelineVersion: string; checkedAt: string; humanReviewed: boolean };
};

const DIR = path.join(process.cwd(), "content", "cases");

export function allCases(): CaseFile[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as CaseFile)
    .filter((c) => c.status === "published");
}

export const getCase = (slug: string) => allCases().find((c) => c.slug === slug);

export const SITE_URL = "https://isaiconsciousyet.com";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const parts = (d: string) => { const [y, m, day] = d.split("-").map(Number); return { y, m: MONTHS[m - 1], day }; };

// "8 to 13 July 2026", "30 June to 2 July 2026", "8 July 2026"
export function dateRange(start: string, end?: string) {
  const a = parts(start);
  if (!end || end === start) return `${a.day} ${a.m} ${a.y}`;
  const b = parts(end);
  if (a.y !== b.y) return `${a.day} ${a.m} ${a.y} to ${b.day} ${b.m} ${b.y}`;
  if (a.m !== b.m) return `${a.day} ${a.m} to ${b.day} ${b.m} ${b.y}`;
  return `${a.day} to ${b.day} ${b.m} ${b.y}`;
}
export const shortDate = (d: string) => { const a = parts(d); return `${a.day} ${a.m.slice(0, 3)} ${a.y}`; };
