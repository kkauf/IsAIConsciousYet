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
    <div className="w-full max-w-6xl mx-auto px-6 pt-10 pb-20 md:pt-16">
      <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-6xl leading-[1.05] tracking-tight text-white">Case files</h1>
      <div className="mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-neutral-300">
        <p>
          Each case file starts from an event where an AI system did something that does not fit the story of a machine doing the work we
          ask. Then it shows how named people read that event, in their own words, and what evidence would settle the question.
        </p>
        <p className="text-neutral-400">
          The site takes no position. Every quote is checked word for word against the page it came from, and a case is only published if
          the operator or the affected party has described the event first-hand. Honorable mentions miss one of those criteria and say
          which. Case files are drafted and checked by software and published without human review.
        </p>
      </div>
      <ul className="mt-14 border-t border-neutral-800">
        {cases.map((c) => (
          <li key={c.slug} className="border-b border-neutral-800">
            <Link href={`/cases/${c.slug}`} className="group grid gap-2 py-8 md:grid-cols-[14rem_1fr] md:gap-8">
              <span className="text-neutral-500">
                {dateRange(c.event.dateStart, c.event.dateEnd)}
                {c.tier === "mention" && <span className="block text-amber-300">Honorable mention</span>}
              </span>
              <span>
                <span className="font-[family-name:var(--font-serif)] text-2xl md:text-3xl text-white group-hover:underline decoration-neutral-600 underline-offset-4">
                  {c.title}
                </span>
                <span className="block mt-2 max-w-3xl text-neutral-400 leading-relaxed">{c.event.unaskedBehaviour}</span>
                <span className="block mt-2 text-neutral-500">{c.readings.length} readings</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
