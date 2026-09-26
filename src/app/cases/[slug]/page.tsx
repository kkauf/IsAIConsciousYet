import { Fragment } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { allCases, getCase, dateRange, shortDate, isIsoDate, SITE_URL, type Reading, type Source } from "@/lib/cases/load";
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
    alternates: { canonical: url, types: { "application/json": `${url}.json`, "application/atom+xml": "/feed.xml" } },
    openGraph: { type: "article", url, title: c.title, description, publishedTime: c.provenance.checkedAt },
    twitter: { card: "summary_large_image", title: c.title, description },
  };
}

const ROLE: Record<string, string> = {
  operator: "ran the system", affected: "was affected", evaluator: "investigated it",
  scientist: "scientist", commentator: "commentator",
};
const REPO = "https://github.com/kkauf/IsAIConsciousYet";
const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");

// Set by the weekly re-check (pipeline/recheck.mjs) when the page is readable but no longer holds the quote.
function ChangedLine({ archivedUrl, label }: { archivedUrl?: string; label?: string }) {
  return (
    <span className="block text-sm text-dim mt-1">
      {label && <>{label}: </>}The source page changed after this quote was checked.
      {archivedUrl && (
        <> <a href={archivedUrl} className="underline decoration-rule underline-offset-2 hover:text-bone">archived copy</a></>
      )}
    </span>
  );
}

function SourceLine({ r }: { r: Reading }) {
  return (
    <>
      <p className="text-sm text-dim mt-3">
        <a href={r.url} className="underline decoration-rule underline-offset-2 hover:text-bone">{host(r.url)}</a>
        {isIsoDate(r.date) && <>, {shortDate(r.date)}</>}
        {r.archivedUrl && (
          <>, <a href={r.archivedUrl} className="underline decoration-rule underline-offset-2 hover:text-bone">archived copy</a></>
        )}
      </p>
      {r.sourceChanged && <ChangedLine archivedUrl={r.archivedUrl} />}
    </>
  );
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug);
  if (!c) notFound();

  const nature = c.readings.filter((r) => r.aboutNature);
  const others = c.readings.filter((r) => !r.aboutNature);
  const question = rows[c.bearsOn[0]];
  const faceOff = nature.length === 2;
  const report = `${REPO}/issues/new?${new URLSearchParams({
    title: `Correction: ${c.title}`,
    body: `Case file: ${SITE_URL}/cases/${c.slug}\n\nWhich quote or attribution is wrong?\n\n\nLink showing the correct version:\n`,
  })}`;
  const publishers = [...c.event.primarySources.reduce((m, s) => m.set(s.publisher, [...(m.get(s.publisher) ?? []), s]), new Map<string, Source[]>())];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.event.unaskedBehaviour,
    datePublished: c.provenance.checkedAt,
    url: `${SITE_URL}/cases/${c.slug}`,
    publisher: { "@type": "Organization", name: "Is AI Conscious Yet?", url: SITE_URL },
    license: "https://creativecommons.org/licenses/by/4.0/",
    about: [{ "@type": "Event", name: c.title, startDate: c.event.dateStart, endDate: c.event.dateEnd, organizer: { "@type": "Organization", name: c.event.operator } }],
    isBasedOn: c.event.primarySources.map((s) => s.url),
    citation: c.readings.map((r) => ({ "@type": "CreativeWork", url: r.url, author: { "@type": "Thing", name: r.partyName }, text: r.quote })),
  };

  return (
    <article className="w-full max-w-6xl mx-auto px-6 pt-12 md:pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* The event */}
      <header className="max-w-3xl">
        <p className="text-ash">
          <Link href="/cases" className="underline decoration-rule underline-offset-4 hover:text-bone">{c.tier === "mention" ? "Honorable mention" : "Case file"}</Link>
          <span className="text-dim"> / </span>
          {dateRange(c.event.dateStart, c.event.dateEnd)}, {c.event.operator}
        </p>
        <h1 className="font-serif font-light text-5xl md:text-7xl leading-[1] tracking-tight mt-5">
          {c.title}
        </h1>
        <p className="font-serif text-2xl md:text-3xl leading-snug text-bone/80 mt-8">
          {c.event.unaskedBehaviour}
        </p>
        {c.tier === "mention" && c.missingCriterion && (
          <p className="mt-6 border-l-2 border-mention pl-4 text-mention">
            Honorable mention, not a full case file. {c.missingCriterion}
          </p>
        )}
      </header>

      {/* The disagreement: readings that say what the system is */}
      {nature.length > 0 && (
        <section aria-labelledby="question" className="mt-20 md:mt-28 border-t border-rule pt-6">
          <h2 id="question" className="max-w-3xl text-ash">
            The open question this bears on
            <span className="block font-serif text-bone text-3xl md:text-4xl leading-tight mt-8">{question}</span>
          </h2>
          <div className={`mt-14 grid gap-12 ${faceOff ? "md:grid-cols-[1fr_1px_1fr] md:gap-12" : "md:grid-cols-2"}`}>
            {nature.map((r, i) => (
              <Fragment key={r.partyName}>
                {faceOff && i === 1 && <><div aria-hidden className="h-px bg-rule md:hidden" /><div aria-hidden className="seam hidden md:block" /></>}
                <figure className="flex flex-col">
                  <p className="mb-4 text-ash first-letter:uppercase">{r.stanceLabel}</p>
                  <blockquote className="font-serif text-2xl md:text-[1.875rem] leading-[1.35]">
                    “{r.quote}”
                  </blockquote>
                  <figcaption className="mt-5">
                    <span className="text-bone">{r.partyName}</span>
                    <span className="text-ash">, {ROLE[r.partyType] ?? r.partyType}</span>
                    <SourceLine r={r} />
                  </figcaption>
                </figure>
              </Fragment>
            ))}
          </div>
          <p className="mt-10 text-sm text-dim max-w-3xl">
            These readings make claims about the system itself. A model scored every reading for that, and code picked the ones above its cutoff. The site takes no position.
          </p>
        </section>
      )}

      {/* What happened */}
      <section aria-labelledby="happened" className="mt-24 border-t border-rule pt-6 grid gap-10 md:grid-cols-[2fr_1fr] md:gap-16">
        <div className="max-w-2xl">
          <h2 id="happened" className="text-ash">What happened</h2>
          <p className="mt-6 font-serif text-xl leading-relaxed text-bone/85">{c.event.summary}</p>
        </div>
        <div>
          <h2 className="text-ash">First-hand sources</h2>
          <ul className="mt-6 space-y-4">
            {publishers.map(([publisher, docs]) => (
              <li key={publisher}>
                <span className="text-bone">{publisher}</span>
                <span className="block text-dim">
                  {docs.map((s, i) => (
                    <Fragment key={s.url}>
                      {i > 0 && ", "}
                      <a href={s.url} className="underline decoration-rule underline-offset-2 hover:text-bone">
                        {isIsoDate(s.published) ? shortDate(s.published) : host(s.url)}
                      </a>
                    </Fragment>
                  ))}
                </span>
                {docs.filter((s) => s.sourceChanged).map((s) => (
                  <ChangedLine key={s.url} archivedUrl={s.archivedUrl} label={docs.length > 1 ? (s.published ? shortDate(s.published) : host(s.url)) : undefined} />
                ))}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Other readings */}
      {others.length > 0 && (
        <section aria-labelledby="record" className="mt-24 border-t border-rule pt-6">
          <h2 id="record" className="text-ash">
            {nature.length ? "Also on the record" : `${others.length} readings of this event`}
          </h2>
          <p className="mt-6 font-serif text-xl leading-relaxed text-bone/85 max-w-2xl">
            {nature.length ? "These readings describe what happened or judge the danger. " : ""}
            Each quote was found word for word on the linked page.
          </p>
          <ul className="mt-8 divide-y divide-rule border-t border-rule">
            {others.map((r) => (
              <li key={r.partyName} className="grid gap-2 py-6 md:grid-cols-[14rem_1fr] md:gap-8">
                <p>
                  <span className="text-bone">{r.partyName}</span>
                  <span className="block text-ash">{ROLE[r.partyType] ?? r.partyType}</span>
                </p>
                <div className="max-w-3xl">
                  <blockquote className="font-serif text-lg leading-relaxed text-bone/90">“{r.quote}”</blockquote>
                  <SourceLine r={r} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What would settle it */}
      <section aria-labelledby="settle" className="mt-24 border-t border-rule pt-6 grid gap-10 md:grid-cols-[2fr_1fr] md:gap-16">
        <div className="max-w-2xl">
          <h2 id="settle" className="text-ash">What would settle it</h2>
          <ul className="mt-6 space-y-5 font-serif text-xl leading-relaxed text-bone/85 list-disc pl-5 marker:text-dim">
            {c.whatWouldSettleIt.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
        <div className="space-y-8 text-bone/75 leading-relaxed">
          <div>
            <h2 className="text-ash">About agency</h2>
            <p className="mt-2">{c.agencyNote}</p>
          </div>
          <div>
            <h2 className="text-ash">About consciousness</h2>
            <p className="mt-2">{c.consciousnessNote}</p>
          </div>
        </div>
      </section>

      <footer className="mt-24 pt-6 border-t border-rule text-sm text-dim">
        Drafted by {c.provenance.draftedBy}. Every quote was checked against its source on {shortDate(c.provenance.checkedAt.slice(0, 10))}.{" "}
        {c.provenance.humanReviewed ? "" : "No human reviewed this page before publication. "}
        <Link href="/cases" className="underline decoration-rule underline-offset-2 hover:text-bone">How case files are made</Link>
        {". "}
        <a href={report} className="underline decoration-rule underline-offset-2 hover:text-bone">Report an error</a>
      </footer>
    </article>
  );
}
