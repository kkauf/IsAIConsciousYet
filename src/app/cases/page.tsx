import type { Metadata } from "next";
import Link from "next/link";
import { allCases, dateRange, SITE_URL } from "@/lib/cases/load";

const description =
  "Events where AI systems did something that does not fit the story of a machine doing the work we ask, with competing readings by named people, quoted word for word.";

export const metadata: Metadata = {
  title: "Case files | Is AI Conscious Yet?",
  description,
  alternates: { canonical: `${SITE_URL}/cases` },
  openGraph: { url: `${SITE_URL}/cases`, title: "Case files", description },
};

export default function CasesIndex() {
  const cases = allCases().sort((a, b) => b.event.dateStart.localeCompare(a.event.dateStart));
  return (
    <div className="w-full max-w-6xl mx-auto px-6 pt-12 md:pt-24">
      <h1 className="font-serif font-light text-5xl md:text-7xl leading-[1] tracking-tight">Case files</h1>
      <div className="mt-8 max-w-3xl space-y-5">
        <p className="font-serif text-2xl md:text-3xl leading-snug text-bone/80">
          Each case file starts from an event where an AI system did something that does not fit the story of a machine doing the work we
          ask. Then it shows how named people read that event, in their own words, and what evidence would settle the question.
        </p>
        <p className="max-w-2xl text-lg leading-relaxed text-ash">
          The site takes no position. Every quote is checked word for word against the page it came from, and a case is only published if
          the operator or the affected party has described the event first-hand. Honorable mentions miss one of those criteria and say
          which. Case files are drafted and checked by software and published without human review.
        </p>
      </div>
      <ul className="mt-20 border-t border-rule">
        {cases.map((c) => (
          <li key={c.slug} className="border-b border-rule">
            <Link href={`/cases/${c.slug}`} className="group grid gap-2 py-8 md:grid-cols-[14rem_1fr] md:gap-8">
              <span className="text-dim">
                {dateRange(c.event.dateStart, c.event.dateEnd)}
                {c.tier === "mention" && <span className="block text-mention">Honorable mention</span>}
              </span>
              <span>
                <span className="font-serif text-3xl md:text-4xl leading-tight group-hover:underline decoration-rule decoration-1 underline-offset-[6px]">
                  {c.title}
                </span>
                <span className="block mt-3 max-w-3xl font-serif text-xl leading-snug text-bone/80">{c.event.unaskedBehaviour}</span>
                <span className="block mt-3 text-dim">{c.readings.length} readings, quoted word for word</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
