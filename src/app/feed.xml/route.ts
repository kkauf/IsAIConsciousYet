import { allCases, SITE_URL } from "@/lib/cases/load";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Atom feed of case files, newest check first.
export function GET() {
  const cases = allCases().sort((a, b) => b.provenance.checkedAt.localeCompare(a.provenance.checkedAt));
  const entries = cases.map((c) => {
    const url = `${SITE_URL}/cases/${c.slug}`;
    return [
      "  <entry>",
      `    <title>${esc(c.title)}</title>`,
      `    <link href="${url}"/>`,
      `    <id>${url}</id>`,
      `    <updated>${c.provenance.checkedAt}</updated>`,
      `    <summary>${esc(c.event.unaskedBehaviour)}</summary>`,
      "  </entry>",
    ].join("\n");
  });
  const body = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    "  <title>Is AI Conscious Yet?</title>",
    "  <subtitle>Case files on what AI systems did, with named readings quoted word for word.</subtitle>",
    `  <link href="${SITE_URL}/"/>`,
    `  <link rel="self" href="${SITE_URL}/feed.xml"/>`,
    `  <id>${SITE_URL}/</id>`,
    `  <updated>${cases[0]?.provenance.checkedAt ?? new Date().toISOString()}</updated>`,
    "  <author><name>Is AI Conscious Yet?</name></author>",
    ...entries,
    "</feed>",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "application/atom+xml; charset=utf-8" } });
}
