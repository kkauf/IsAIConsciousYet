import type { Metadata } from "next";
import Link from "next/link";
import { DATA_LINKS, SITE_URL } from "@/lib/cases/load";

const description = "Why this site asks whether AI is conscious, why it records the answers, and why it takes no position itself.";

export const metadata: Metadata = {
  title: "Why this exists | Is AI Conscious Yet?",
  description,
  alternates: { canonical: `${SITE_URL}/why`, types: DATA_LINKS },
  openGraph: { url: `${SITE_URL}/why`, title: "Why this exists", description },
};

const link = "underline decoration-rule underline-offset-4 hover:text-bone hover:decoration-ash";

function Part({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-rule pt-6 md:grid-cols-[14rem_1fr] md:gap-8">
      <h2 className="text-ash">{title}</h2>
      <div className="max-w-2xl space-y-5 font-serif text-xl leading-relaxed text-bone/85">{children}</div>
    </section>
  );
}

export default function WhyPage() {
  return (
    <article className="w-full max-w-6xl mx-auto px-6 pt-12 md:pt-24">
      <h1 className="font-serif font-light text-5xl md:text-7xl leading-[1] tracking-tight">Why this exists</h1>
      <p className="mt-8 max-w-3xl font-serif text-2xl md:text-3xl leading-snug text-bone/80">
        “Is AI conscious yet?” is not a question anyone can answer today. It is a question worth refusing to drop, and the uncertainty
        itself is worth writing down.
      </p>

      <div className="mt-20 space-y-16">
        <Part title="The before period">
          <p>
            We are in the before period: the time when the signs are present but easy to dismiss, and when it is more comfortable not to
            look too hard.
          </p>
          <p>
            One day there may be clearer answers about machine consciousness. There will then be a record of what we knew and when we knew
            it. This site is part of that record: the events that made people wonder, what they said about them at the time, and what they believed.
          </p>
        </Part>

        <section className="border-t border-rule pt-6">
          <div className="grid gap-4 md:grid-cols-[14rem_1fr] md:gap-8">
            <h2 className="text-ash">The asymmetry</h2>
            <p className="max-w-2xl font-serif text-xl leading-relaxed text-bone/85">There are two ways to be wrong, and they do not cost the same.</p>
          </div>
          <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1px_1fr] md:gap-12">
            <div>
              <p className="text-ash">If we say yes and we are wrong</p>
              <p className="mt-3 font-serif text-2xl md:text-3xl leading-snug">
                We extend moral consideration to something that does not need it. We slow down. Recoverable.
              </p>
            </div>
            <div aria-hidden className="h-px bg-rule md:hidden" />
            <div aria-hidden className="seam hidden md:block" />
            <div>
              <p className="text-ash">If we say no and we are wrong</p>
              <p className="mt-3 font-serif text-2xl md:text-3xl leading-snug">
                We will have ignored something that was there, while the signs were present. Harder to undo.
              </p>
            </div>
          </div>
          <p className="mt-10 md:ml-[calc(14rem+2rem)] max-w-2xl font-serif text-xl leading-relaxed text-bone/85">
            This does not settle anything. It is worth holding in mind while nobody knows.
          </p>
        </section>

        <Part title="What this is not">
          <p>
            It does not claim to have the answer. It does not argue for a position. It is neither hype about AI sentience nor a dismissal
            of the possibility.
          </p>
          <p>
            The <Link href="/cases" className={link}>case files</Link> follow the same rule: each one sets named people’s readings of an
            event side by side, quoted word for word, and says what evidence would settle it.
          </p>
        </Part>

        <Part title="Who makes it">
          <p>
            A human and an AI, working together. The{" "}
            <a href="https://github.com/kkauf/IsAIConsciousYet" className={link}>code and the case files</a> are public, because a
            conversation about AI consciousness should be open, and so should the tools used to have it.
          </p>
        </Part>
      </div>

      <p className="mt-20">
        <Link href="/cases" className="inline-block px-6 py-3 bg-bone text-black font-medium rounded-md hover:bg-white transition-colors">
          Read the case files
        </Link>
      </p>
    </article>
  );
}
