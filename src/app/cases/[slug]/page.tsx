import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allCases, getCase, dateRange, shortDate, SITE_URL, type Reading, type Source } from "@/lib/cases/load";
import { QUESTIONS } from "../../../../pipeline/contract.mjs";

export const dynamicParams = false;
export const generateStaticParams = () => allCases().map((c) => ({ slug: c.slug }));

const rows = QUESTIONS as Record<string, string>;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCase((await params).slug);
  if (!c) return { title: "Not found" };
  const description = `${c.event.unaskedBehaviour} ${c.readings.length} named readings, quoted word for word, and what would settle it.`;
  const url = `${SITE_URL}/cases/${c.slug}`;
  return {
    title: `${c.title} | Is AI Conscious Yet?`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: c.title, description, publishedTime: c.provenance.checkedAt },
    twitter: { card: "summary", title: c.title, description },
  };
}

const ROLE: Record<string, string> = {
  operator: "ran the system", affected: "was affected", evaluator: "investigated it",
  scientist: "scientist", commentator: "commentator", "site-owner": "site owner",
};
const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");

function SourceLine({ r }: { r: Reading }) {
  return (
    <p className="text-sm text-neutral-500 mt-3">
      <a href={r.url} className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200">{host(r.url)}</a>
      {r.date && <>, {shortDate(r.date)}</>}
      {r.archivedUrl && (
        <>, <a href={r.archivedUrl} className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200">archived copy</a></>
      )}
    </p>
  );
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug);
  if (!c) notFound();

  const nature = c.readings.filter((r) => r.aboutNature);
  const others = c.readings.filter((r) => !r.aboutNature);
  const question = rows[c.bearsOn[0]];
  const faceOff = nature.length === 2;
  const publishers = [...c.event.primarySources.reduce((m, s) => m.set(s.publisher, [...(m.get(s.publisher) ?? []), s]), new Map<string, Source[]>())];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.event.unaskedBehaviour,
    datePublished: c.provenance.checkedAt,
    url: `${SITE_URL}/cases/${c.slug}`,
    publisher: { "@type": "Organization", name: "Is AI Conscious Yet?", url: SITE_URL },
    about: [{ "@type": "Event", name: c.title, startDate: c.event.dateStart, endDate: c.event.dateEnd, organizer: { "@type": "Organization", name: c.event.operator } }],
    isBasedOn: c.event.primarySources.map((s) => s.url),
    citation: c.readings.map((r) => ({ "@type": "CreativeWork", url: r.url, author: { "@type": "Thing", name: r.partyName }, text: r.quote })),
  };

  return (
    <article className="w-full max-w-6xl mx-auto px-6 pt-10 pb-20 md:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* The event */}
      <header className="max-w-3xl">
        <p className="text-neutral-400">
          <Link href="/cases" className="hover:text-white">{c.tier === "mention" ? "Honorable mention" : "Case file"}</Link>
          <span className="text-neutral-600"> / </span>
          {dateRange(c.event.dateStart, c.event.dateEnd)}, {c.event.operator}
        </p>
        <h1 className="font-[family-name:var(--font-serif)] text-4xl md:text-6xl leading-[1.05] tracking-tight text-white mt-4">
          {c.title}
        </h1>
        <p className="font-[family-name:var(--font-serif)] text-xl md:text-2xl leading-snug text-neutral-300 mt-6">
          {c.event.unaskedBehaviour}
        </p>
        {c.tier === "mention" && c.missingCriterion && (
          <p className="mt-6 border-l-2 border-amber-500 pl-4 text-amber-200">
            Honorable mention, not a full case file. {c.missingCriterion}
          </p>
        )}
      </header>

      {/* The disagreement: readings that say what the system is */}
      {nature.length > 0 && (
        <section aria-labelledby="question" className="mt-16 md:mt-24">
          <h2 id="question" className="max-w-3xl text-lg text-neutral-400">
            The open question this bears on:
            <span className="block text-white text-2xl md:text-3xl leading-snug mt-2">{question}</span>
          </h2>
          <div className={`mt-10 grid gap-10 ${faceOff ? "md:grid-cols-[1fr_1px_1fr] md:gap-12" : "md:grid-cols-2"}`}>
            {nature.map((r, i) => (
              <Fragment key={r.partyName}>
                {faceOff && i === 1 && <div aria-hidden className="hidden md:block bg-neutral-700" />}
                <figure className="flex flex-col">
                  <blockquote className="font-[family-name:var(--font-serif)] text-2xl md:text-[1.75rem] leading-[1.35] text-white">
                    “{r.quote}”
                  </blockquote>
                  <figcaption className="mt-5">
                    <span className="text-white font-medium">{r.partyName}</span>
                    <span className="text-neutral-500">, {ROLE[r.partyType] ?? r.partyType}</span>
                    <SourceLine r={r} />
                  </figcaption>
                </figure>
              </Fragment>
            ))}
          </div>
          <p className="mt-8 text-sm text-neutral-500 max-w-3xl">
            These readings make claims about the system itself. A model scored every reading for that, and code picked the ones above its cutoff. The site takes no position.
          </p>
        </section>
      )}

      {/* What happened */}
      <section aria-labelledby="happened" className="mt-20 grid gap-10 md:grid-cols-[2fr_1fr]">
        <div className="max-w-2xl">
          <h2 id="happened" className="text-2xl text-white">What happened</h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-300">{c.event.summary}</p>
        </div>
        <div>
          <h2 className="text-neutral-400">First-hand sources</h2>
          <ul className="mt-4 space-y-3">
            {publishers.map(([publisher, docs]) => (
              <li key={publisher}>
                <span className="text-neutral-200">{publisher}</span>
                <span className="block text-neutral-500">
                  {docs.map((s, i) => (
                    <Fragment key={s.url}>
                      {i > 0 && ", "}
                      <a href={s.url} className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-200">
                        {s.published ? shortDate(s.published) : host(s.url)}
                      </a>
                    </Fragment>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Other readings */}
      {others.length > 0 && (
        <section aria-labelledby="record" className="mt-20">
          <h2 id="record" className="text-2xl text-white">
            {nature.length ? "Also on the record" : `${others.length} readings of this event`}
          </h2>
          <p className="mt-2 text-neutral-500 max-w-2xl">
            {nature.length ? "These readings describe what happened or judge the danger. " : ""}
            Each quote was found word for word on the linked page.
          </p>
          <ul className="mt-8 divide-y divide-neutral-800 border-y border-neutral-800">
            {others.map((r) => (
              <li key={r.partyName} className="grid gap-2 py-6 md:grid-cols-[14rem_1fr] md:gap-8">
                <p>
                  <span className="text-white font-medium">{r.partyName}</span>
                  <span className="block text-neutral-500">{ROLE[r.partyType] ?? r.partyType}</span>
                </p>
                <div className="max-w-3xl">
                  <blockquote className="font-[family-name:var(--font-serif)] text-lg leading-relaxed text-neutral-200">“{r.quote}”</blockquote>
                  <SourceLine r={r} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What would settle it */}
      <section aria-labelledby="settle" className="mt-20 grid gap-10 md:grid-cols-[2fr_1fr]">
        <div className="max-w-2xl">
          <h2 id="settle" className="text-2xl text-white">What would settle it</h2>
          <ul className="mt-4 space-y-4 text-lg leading-relaxed text-neutral-300 list-disc pl-5 marker:text-neutral-600">
            {c.whatWouldSettleIt.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
        <div className="space-y-8 text-neutral-400 leading-relaxed">
          <div>
            <h2 className="text-white">About agency</h2>
            <p className="mt-2">{c.agencyNote}</p>
          </div>
          <div>
            <h2 className="text-white">About consciousness</h2>
            <p className="mt-2">{c.consciousnessNote}</p>
          </div>
        </div>
      </section>

      <footer className="mt-20 pt-6 border-t border-neutral-800 text-sm text-neutral-500 max-w-3xl">
        Drafted by {c.provenance.draftedBy}. Every quote was checked against its source on {shortDate(c.provenance.checkedAt.slice(0, 10))}.{" "}
        {c.provenance.humanReviewed ? "" : "No human reviewed this page before publication. "}
        <Link href="/cases" className="underline decoration-neutral-700 underline-offset-2 hover:text-neutral-300">How case files are made</Link>
      </footer>
    </article>
  );
}
