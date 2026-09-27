"use client";

import { useEffect, useState } from "react";
import { PROMPT, SHOWCASE } from "./index";
import type { RecordEvent } from "./types";

const long = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// The homepage opening: one model's hero, with a frame that says what it is and lets the reader switch
// versions. The frame is the site's; everything between the label and the note is the model's.
// The newest model shows by default; ?v=<slug> picks another, so every version has its own link.
export default function Showcase({ events, since, now }: { events: RecordEvent[]; since: string; now: string }) {
  const [slug, setSlug] = useState(SHOWCASE[0].slug);
  const entry = SHOWCASE.find((e) => e.slug === slug) ?? SHOWCASE[0];
  const { Hero } = entry;

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("v");
    // Reading the address after hydration; the server always renders the default.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wanted && SHOWCASE.some((e) => e.slug === wanted)) setSlug(wanted);
  }, []);

  const pick = (next: string) => {
    if (next === entry.slug) return;
    const url = new URL(window.location.href);
    if (next === SHOWCASE[0].slug) url.searchParams.delete("v");
    else url.searchParams.set("v", next);
    window.history.replaceState(null, "", url);
    setSlug(next);
    window.scrollTo({ top: 0 });
  };

  const versions = (className: string) => (
    <ul className={className}>
      {SHOWCASE.map((e) => (
        <li key={e.slug}>
          <button
            type="button"
            onClick={() => pick(e.slug)}
            aria-pressed={e.slug === entry.slug}
            className={e.slug === entry.slug ? "text-bone underline decoration-ash underline-offset-4" : "text-ash hover:text-bone"}
          >
            {e.model}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative bg-black">
      <nav aria-label="Showcase versions" className="absolute inset-x-0 top-4 z-10 mx-auto flex w-full max-w-6xl flex-wrap items-baseline gap-x-3 gap-y-1 px-6 text-sm text-ash">
        <a href="#showcase" className="hover:text-bone">Showcase</a>
        {versions("flex flex-wrap gap-x-3 gap-y-1")}
      </nav>
      <Hero key={entry.slug} events={events} since={since} now={now} model={entry.model} date={entry.made} />
      <aside id="showcase" aria-labelledby="showcase-title" className="mx-auto mt-10 w-full max-w-6xl scroll-mt-24 px-6">
        <div className="grid gap-4 border-t border-rule pt-6 md:grid-cols-[14rem_1fr] md:gap-8">
          <h2 id="showcase-title" className="text-ash">About this opening</h2>
          <div className="max-w-2xl space-y-4 text-ash">
            <p>
              The opening of this page is a showcase. Each version is one AI model’s answer to the same prompt, written and animated in code by
              the model and kept as it made it. The one above is by {entry.model} ({entry.maker}), made on {long(entry.made)}. When a new
              model arrives, it gets the same prompt and makes its own.
            </p>
            {SHOWCASE.length > 1 && (
              <div>
                <p>Every version, newest model first:</p>
                <ul className="mt-2 divide-y divide-rule border-y border-rule">
                  {SHOWCASE.map((e) => (
                    <li key={e.slug}>
                      <button
                        type="button"
                        onClick={() => pick(e.slug)}
                        aria-pressed={e.slug === entry.slug}
                        className="grid w-full grid-cols-[1fr_auto] gap-4 py-2 text-left hover:text-bone"
                      >
                        <span className={e.slug === entry.slug ? "text-bone" : undefined}>
                          {e.model} <span className="text-dim">({e.maker})</span>
                        </span>
                        <span className="text-dim tabular-nums">model released {long(e.released)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <details>
              <summary className="cursor-pointer text-bone/85 hover:text-bone">The prompt</summary>
              <blockquote className="mt-3 border-l border-rule pl-4 font-serif text-lg text-bone/85">“{PROMPT}”</blockquote>
            </details>
          </div>
        </div>
      </aside>
    </div>
  );
}
