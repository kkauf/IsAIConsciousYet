import type { Metadata } from "next";
import Link from "next/link";
import Timeline from "@/components/Timeline";
import { allCases, dateRange, shortDate, DATA_LINKS, SITE_URL } from "@/lib/cases/load";
import { loadCoverage, monthName, months, takeaway } from "@/lib/coverage";

const description =
  "Every article in 24 major publications about whether AI could be conscious, month by month since 2020, on one timeline with the case files.";

export const metadata: Metadata = {
  title: "The question, over time | Is AI Conscious Yet?",
  description,
  alternates: { canonical: `${SITE_URL}/timeline`, types: DATA_LINKS },
  openGraph: { url: `${SITE_URL}/timeline`, title: "The question, over time", description },
};

const REPO = "https://github.com/kkauf/IsAIConsciousYet";
const link = "underline decoration-rule underline-offset-4 hover:text-bone hover:decoration-ash";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const FILTERS = [
  { id: "show-all", label: "Everything", glyph: null },
  { id: "show-articles", label: "Articles in the press", glyph: <span aria-hidden className="inline-block size-2.5 bg-ash" /> },
  {
    id: "show-cases",
    label: "Case files",
    glyph: (
      <span aria-hidden className="inline-flex gap-0.5">
        <span className="inline-block size-2.5 rounded-full bg-bone" />
        <span className="inline-block size-2.5 rounded-full bg-mention" />
      </span>
    ),
  },
];

export default function TimelinePage() {
  const coverage = loadCoverage();
  const ms = months(coverage, allCases());
  const listed = [...ms].reverse().filter((m) => m.articles.length || m.cases.length);
  const missing = `${REPO}/issues/new?${new URLSearchParams({
    title: "Missing article for the timeline",
    body: "Link to the article:\n\n\nPublication (it needs to be one of the publications listed on /timeline):\n",
  })}`;

  return (
    <div className="tl-page w-full max-w-6xl mx-auto px-6 pt-12 md:pt-24">
      <h1 className="font-serif font-light text-5xl md:text-7xl leading-[1] tracking-tight">The question, over time</h1>
      <p className="mt-8 max-w-4xl font-serif text-2xl md:text-3xl leading-snug text-bone/80">{takeaway(ms, coverage.outlets.length)}</p>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ash">
        Each square is one of those articles. Each dot below the line is a case file: an event where an AI system did something that the
        story of a machine doing what we ask does not explain. Amber dots are honorable mentions.
      </p>

      <fieldset className="mt-16 flex flex-wrap gap-x-7 gap-y-3 border-t border-rule pt-6">
        <legend className="sr-only">Show</legend>
        {FILTERS.map((f, i) => (
          <label
            key={f.id}
            className="inline-flex cursor-pointer items-center gap-2 text-ash hover:text-bone has-[:checked]:text-bone has-[:checked]:underline decoration-ash underline-offset-[6px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-bone has-[:focus-visible]:outline-offset-4"
          >
            <input type="radio" name="show" id={f.id} defaultChecked={i === 0} className="sr-only" />
            {f.glyph}
            {f.label}
          </label>
        ))}
      </fieldset>

      <div className="mt-8">
        <Timeline ms={ms} />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8 text-dim">
        <h2 className="text-ash">How this is counted</h2>
        <div className="max-w-2xl space-y-3 leading-relaxed">
          <p>
            Articles come from the {coverage.outlets.length} publications listed below, searched back to {monthName(coverage.since.slice(0, 7))}.
            A model judged whether each article is mainly about whether AI systems are or could be conscious, sentient, have feelings, or
            deserve moral consideration, and code kept the ones above its cutoff. Headlines and dates are read from the article page or its
            address. Nothing is scored for or against. Search finds recent articles more easily than old ones, so earlier years are likely
            undercounted.
          </p>
          <p>
            {coverage.updatedAt && <>Searched weekly, last on {shortDate(coverage.updatedAt)}. </>}
            <a href={missing} className={link}>Report a missing article</a>
          </p>
          <details className="group">
            <summary className="cursor-pointer text-ash hover:text-bone">The {coverage.outlets.length} publications</summary>
            <p className="mt-2">{coverage.outlets.join(", ")}.</p>
          </details>
        </div>
      </div>

      <section aria-labelledby="by-month" className="mt-20 border-t border-rule pt-6">
        <h2 id="by-month" className="text-ash">Month by month</h2>
        <div className="mt-2 divide-y divide-rule">
          {listed.map((m) => (
            <section key={m.key} id={`m-${m.key}`} data-month className="grid gap-4 py-8 md:grid-cols-[14rem_1fr] md:gap-8 scroll-mt-24">
              <h3>
                <span className="block text-bone">{monthName(m.key)}</span>
                <span className="block text-sm text-dim">
                  {[m.articles.length && plural(m.articles.length, "article", "articles"), m.cases.length && plural(m.cases.length, "case file", "case files")].filter(Boolean).join(", ")}
                </span>
              </h3>
              <ul className="space-y-5">
                {m.cases.map((c) => (
                  <li key={c.slug} data-kind="case">
                    <Link href={`/cases/${c.slug}`} className="font-serif text-2xl md:text-3xl leading-tight hover:underline decoration-rule decoration-1 underline-offset-[5px]">
                      {c.title}
                    </Link>
                    <span className="block mt-1 text-sm text-dim">
                      {c.tier === "mention" ? <span className="text-mention">Honorable mention</span> : "Case file"}, {dateRange(c.event.dateStart, c.event.dateEnd)}
                    </span>
                  </li>
                ))}
                {m.articles.map((a) => (
                  <li key={a.url} data-kind="article" className="grid gap-x-6 gap-y-0.5 sm:grid-cols-[13rem_1fr]">
                    <span className="text-[0.9375rem] text-ash">
                      {a.publication}
                      <span className="whitespace-nowrap text-dim">, {shortDate(a.date).replace(/ \d{4}$/, "")}</span>
                    </span>
                    <a href={a.url} className="font-serif text-lg leading-snug text-bone/90 hover:underline decoration-rule underline-offset-4">
                      {a.headline}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
