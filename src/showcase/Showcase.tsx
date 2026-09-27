import { PROMPT, SHOWCASE } from "./index";
import type { RecordEvent } from "./types";

const long = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// The homepage opening: one model's hero, with a frame that says what it is. The frame is the site's;
// everything between the label and the note is the model's.
export default function Showcase({ events, since, now }: { events: RecordEvent[]; since: string; now: string }) {
  const entry = SHOWCASE[0];
  const { Hero } = entry;
  return (
    <div className="relative">
      <p className="absolute inset-x-0 top-4 z-10 mx-auto w-full max-w-6xl px-6 text-sm text-ash">
        <a href="#showcase" className="hover:text-bone">
          Showcase: {entry.model}’s answer to one prompt, {long(entry.date)}
        </a>
      </p>
      <Hero events={events} since={since} now={now} model={entry.model} date={entry.date} />
      <aside id="showcase" aria-labelledby="showcase-title" className="mx-auto mt-10 w-full max-w-6xl px-6">
        <div className="grid gap-4 border-t border-rule pt-6 md:grid-cols-[14rem_1fr] md:gap-8">
          <h2 id="showcase-title" className="text-ash">About this opening</h2>
          <div className="max-w-2xl space-y-4 text-ash">
            <p>
              The opening of this page is a showcase. Each version is one AI model’s answer to the same prompt, written and animated in code by
              the model and kept as it made it. The one above is by {entry.model}, {long(entry.date)}. When a new model arrives, it gets the
              same prompt and makes its own.
            </p>
            <details className="group">
              <summary className="cursor-pointer text-bone/85 hover:text-bone">The prompt</summary>
              <blockquote className="mt-3 border-l border-rule pl-4 font-serif text-lg text-bone/85">“{PROMPT}”</blockquote>
            </details>
          </div>
        </div>
      </aside>
    </div>
  );
}
