import { Fragment, Suspense } from "react";
import Link from "next/link";
import VoteSection from "@/components/VoteSection";
import TestimonyFeed from "@/components/testimony/TestimonyFeed";
import TestimonyForm from "@/components/testimony/TestimonyForm";
import type { Metadata } from "next";
import { allCases, dateRange, SITE_URL } from "@/lib/cases/load";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: SITE_URL }, openGraph: { url: SITE_URL } };

const link = "underline decoration-rule underline-offset-4 hover:text-bone hover:decoration-ash";

export default function Home() {
  const latest = allCases().sort((a, b) => b.event.dateStart.localeCompare(a.event.dateStart))[0];
  const pair = latest?.readings.filter((r) => r.aboutNature).slice(0, 2) ?? [];

  return (
    <div className="w-full max-w-6xl mx-auto px-6">
      {/* The question, and your answer to it */}
      <section className="pt-12 md:pt-24">
        <h1 className="font-serif font-light text-[clamp(3.25rem,10.5vw,9rem)] leading-[0.92] tracking-[-0.02em]">
          Is AI Conscious Yet?
        </h1>
        <p className="mt-8 max-w-2xl font-serif text-xl md:text-2xl leading-snug text-bone/80">
          Nobody can answer this yet. This site records what people believe, and what AI systems do that the usual story does not
          explain.
        </p>
        <div className="mt-14 md:mt-20 max-w-4xl">
          <VoteSection />
        </div>
      </section>

      {/* The latest case file */}
      {latest && (
        <section aria-labelledby="latest" className="mt-28 md:mt-40">
          <div className="flex items-baseline justify-between gap-6 border-t border-rule pt-6">
            <h2 id="latest" className="text-ash">The latest case file</h2>
            <Link href="/cases" className={`text-ash ${link}`}>All case files</Link>
          </div>
          <Link href={`/cases/${latest.slug}`} className="group mt-8 block max-w-4xl">
            <p className="text-dim">{dateRange(latest.event.dateStart, latest.event.dateEnd)}, {latest.event.operator}</p>
            <h3 className="mt-3 font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight group-hover:underline decoration-rule underline-offset-[6px] decoration-1">
              {latest.title}
            </h3>
            <p className="mt-5 max-w-3xl font-serif text-xl leading-snug text-bone/80">{latest.event.unaskedBehaviour}</p>
          </Link>
          {pair.length === 2 && (
            <div className="mt-12 grid gap-10 md:grid-cols-[1fr_1px_1fr] md:gap-12">
              {pair.map((r, i) => (
                <Fragment key={r.partyName}>
                  {i === 1 && <><div aria-hidden className="h-px bg-rule md:hidden" /><div aria-hidden className="seam hidden md:block" /></>}
                  <figure>
                    <blockquote className="font-serif text-2xl leading-[1.35]">“{r.quote}”</blockquote>
                    <figcaption className="mt-4 text-ash">{r.partyName}</figcaption>
                  </figure>
                </Fragment>
              ))}
            </div>
          )}
          <p className="mt-10">
            <Link href={`/cases/${latest.slug}`} className={link}>
              Read the case file, with {latest.readings.length} readings and what would settle it
            </Link>
          </p>
        </section>
      )}

      {/* What people notice */}
      <section aria-labelledby="noticing" className="mt-28 md:mt-40 border-t border-rule pt-6 grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div className="md:sticky md:top-24 md:self-start">
          <h2 id="noticing" className="text-ash">What people are noticing</h2>
          <p className="mt-8 font-serif text-3xl leading-tight">Moments with AI that people did not know what to make of, in their own words.</p>
          <div className="mt-10">
            <TestimonyForm />
          </div>
        </div>
        <Suspense fallback={<p className="py-7 text-dim">Loading what people wrote.</p>}>
          <TestimonyFeed limit={12} />
        </Suspense>
      </section>

      {/* Why */}
      <section aria-labelledby="why" className="mt-28 md:mt-40 border-t border-rule pt-6">
        <h2 id="why" className="text-ash">Why this exists</h2>
        <p className="mt-8 max-w-3xl font-serif text-3xl md:text-4xl leading-tight">
          We are in the before period: the signs are present but easy to dismiss. One day there will be answers, and a record of what we
          believed while we waited.
        </p>
        <p className="mt-8">
          <Link href="/why" className={link}>Read why this site exists</Link>
        </p>
      </section>
    </div>
  );
}
