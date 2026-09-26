import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import VoteSection from "@/components/VoteSection";
import SeamEye from "@/components/eye/SeamEye";
import Timeline from "@/components/Timeline";
import { allCases, dateRange, DATA_LINKS, SITE_URL } from "@/lib/cases/load";
import { loadCoverage, months, takeaway } from "@/lib/coverage";
import { QUESTIONS } from "../../pipeline/contract.mjs";

export const metadata: Metadata = { alternates: { canonical: SITE_URL, types: DATA_LINKS }, openGraph: { url: SITE_URL } };

const rows = QUESTIONS as Record<string, string>;
const link = "underline decoration-rule underline-offset-4 hover:text-bone hover:decoration-ash";

export default function Home() {
  const sorted = allCases().sort((a, b) => b.event.dateStart.localeCompare(a.event.dateStart));
  // The lead is the newest full case file with two readings about the system; honorable mentions never lead.
  const latest = sorted.find((c) => c.tier === "case-file" && c.readings.filter((r) => r.aboutNature).length >= 2) ?? sorted[0];
  const earlier = sorted.filter((c) => c !== latest);
  const pair = latest?.readings.filter((r) => r.aboutNature).slice(0, 2) ?? [];
  const coverage = loadCoverage();
  const ms = months(coverage, sorted);

  return (
    <div className="w-full max-w-6xl mx-auto px-6">
      <section className="relative pt-12 md:pt-24">
        {/* Where the eye starts; scrolling carries it into the header (src/components/Header.tsx). */}
        <div id="hero-eye" aria-hidden className="mb-6 size-[38vw] max-w-44 md:absolute md:right-0 md:top-[calc(6rem+min(7vw,6rem))] md:mb-0 md:size-[clamp(13rem,25vw,22rem)] md:max-w-none motion-reduce:hidden" />
        <h1 className="font-serif font-light text-[clamp(3.25rem,10.5vw,9rem)] leading-[0.92] tracking-[-0.02em]">
          Is AI Conscious Yet?
        </h1>
        <p className="mt-8 max-w-3xl font-serif text-xl md:text-2xl leading-snug text-bone/80">
          Nobody can answer that yet. But AI systems keep doing things that the story of a machine doing what we ask does not explain.
          Each case file takes one such event and sets out how named people read it, in their own words.
        </p>
      </section>

      {/* The latest case file, with the two readings that disagree about what the system is */}
      {latest && (
        <section aria-labelledby="latest" className="mt-20 md:mt-28">
          <div className="flex items-baseline justify-between gap-6 border-t border-rule pt-6">
            <h2 id="latest" className="text-ash">The latest case file</h2>
            <Link href="/cases" className={`text-ash ${link}`}>All case files</Link>
          </div>
          <Link href={`/cases/${latest.slug}`} className="group mt-8 block max-w-4xl">
            <p className="text-dim">{dateRange(latest.event.dateStart, latest.event.dateEnd)}, {latest.event.operator}</p>
            <h3 className="mt-3 font-serif text-4xl md:text-6xl leading-[1.02] tracking-tight group-hover:underline decoration-rule underline-offset-[6px] decoration-1">
              {latest.title}
            </h3>
            <p className="mt-6 max-w-3xl font-serif text-xl md:text-2xl leading-snug text-bone/80">{latest.event.unaskedBehaviour}</p>
          </Link>
          {pair.length === 2 && (
            <>
              <p className="mt-14 max-w-3xl text-ash">
                The open question it bears on
                <span className="block mt-3 font-serif text-2xl md:text-3xl leading-tight text-bone">{rows[latest.bearsOn[0]]}</span>
              </p>
              <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1px_1fr] md:gap-12">
                {pair.map((r, i) => (
                  <Fragment key={r.partyName}>
                    {i === 1 && (
                      <>
                        <SeamEye orientation="horizontal" className="relative h-px md:hidden" />
                        <SeamEye className="relative hidden w-px md:block" />
                      </>
                    )}
                    <figure>
                      <blockquote className="font-serif text-2xl leading-[1.35]">“{r.quote}”</blockquote>
                      <figcaption className="mt-4 text-ash">{r.partyName}</figcaption>
                    </figure>
                  </Fragment>
                ))}
              </div>
            </>
          )}
          <p className="mt-10">
            <Link href={`/cases/${latest.slug}`} className={link}>
              Read the case file: {latest.readings.length} readings, the first-hand sources, and what would settle it
            </Link>
          </p>
        </section>
      )}

      {coverage.articles.length > 0 && (
        <section aria-labelledby="over-time" className="mt-20 md:mt-28">
          <div className="flex items-baseline justify-between gap-6 border-t border-rule pt-6">
            <h2 id="over-time" className="text-ash">The question, over time</h2>
            <Link href="/timeline" className={`text-ash ${link}`}>The timeline</Link>
          </div>
          <p className="mt-8 max-w-4xl font-serif text-2xl md:text-3xl leading-snug">{takeaway(ms, coverage.outlets.length)}</p>
          <div className="mt-10">
            <Timeline ms={ms} linkBase="/timeline" />
          </div>
        </section>
      )}

      {earlier.length > 0 && (
        <section aria-labelledby="earlier" className="mt-20 md:mt-28 border-t border-rule pt-6">
          <h2 id="earlier" className="text-ash">More case files</h2>
          <ul className="mt-4 divide-y divide-rule">
            {earlier.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/cases/${c.slug}`} className="group grid gap-1 py-5 md:grid-cols-[14rem_1fr] md:gap-8">
                  <span className="text-dim">
                    {dateRange(c.event.dateStart, c.event.dateEnd)}
                    {c.tier === "mention" && <span className="block text-mention">Honorable mention</span>}
                  </span>
                  <span className="font-serif text-2xl leading-tight group-hover:underline decoration-rule decoration-1 underline-offset-[5px]">{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="how" className="mt-20 md:mt-28 border-t border-rule pt-6 grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
        <h2 id="how" className="text-ash">How this works</h2>
        <div className="max-w-2xl space-y-5 font-serif text-xl leading-relaxed text-bone/85">
          <p>
            The site takes no position. Every quote is checked word for word against the page it came from, and a case is published only
            when the company that ran the system, or the party it affected, has described the event first-hand.
          </p>
          <p>
            Case files are drafted and checked by software, and published without human review. Each page says so.{" "}
            <Link href="/why" className={link}>Why this site exists</Link>
          </p>
        </div>
      </section>

      <section aria-label="Vote" id="vote" className="mt-20 md:mt-28 border-t border-rule pt-6 grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
        <h2 className="text-ash">Your view</h2>
        <div className="max-w-2xl">
          <VoteSection />
        </div>
      </section>
    </div>
  );
}
