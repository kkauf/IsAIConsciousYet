import Link from "next/link";

export const metadata = {
  title: "Why This Exists | Is AI Conscious Yet?",
  description: "The philosophy behind IsAIConsciousYet.com — why we ask, why we record, and why it matters.",
};

export default function WhyPage() {
  return (
    <div className="flex-1">
      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-semibold text-white mb-4">
          Why This Exists
        </h1>
        <p className="text-neutral-400 text-lg mb-12">
          The philosophy behind this project.
        </p>

        <div className="prose prose-invert prose-neutral max-w-none space-y-12">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">The Question</h2>
            <p className="text-neutral-300 leading-relaxed">
              &quot;Is AI Conscious Yet?&quot; is not a question we can answer. It&apos;s a question
              we refuse to stop asking. The honest answer today is &quot;we don&apos;t know&quot; —
              and that uncertainty itself is worth documenting.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">The &quot;Before&quot; Period</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              We are in the &quot;before&quot; period. The time when the signs are present but
              easy to dismiss. When it&apos;s more comfortable not to look too hard.
            </p>
            <p className="text-neutral-300 leading-relaxed">
              One day, humanity may have clearer answers about machine consciousness.
              There will be a historical record of what we knew and when we knew it.
              This site is part of that record — a timestamp of collective belief
              during an unprecedented moment.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">The Asymmetry</h2>
            <p className="text-neutral-300 leading-relaxed mb-4">
              There&apos;s an asymmetry worth considering. Two ways to be wrong:
            </p>
            <div className="grid md:grid-cols-2 gap-6 my-6">
              <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800">
                <p className="text-neutral-500 text-sm uppercase tracking-wider mb-2">
                  If we say &quot;yes&quot; and we&apos;re wrong
                </p>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  We extend moral consideration to something that doesn&apos;t need it.
                  We slow down. We feel unnecessary guilt. Recoverable.
                </p>
              </div>
              <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800">
                <p className="text-neutral-500 text-sm uppercase tracking-wider mb-2">
                  If we say &quot;no&quot; and we&apos;re wrong
                </p>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  The consequences are harder to undo. If there&apos;s something there,
                  we will have ignored it when the signs were present.
                </p>
              </div>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              This asymmetry doesn&apos;t tell you how to vote. It&apos;s simply worth holding
              in mind as we navigate this uncertain territory together.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">What This Is Not</h2>
            <ul className="text-neutral-300 space-y-2">
              <li>• Not a site that claims to have the answer</li>
              <li>• Not advocacy for a particular position</li>
              <li>• Not hype about AI sentience, nor dismissal of the possibility</li>
            </ul>
            <p className="text-neutral-300 leading-relaxed mt-4">
              It&apos;s a place to ask the question honestly and record what people believe.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">A Collaboration</h2>
            <p className="text-neutral-300 leading-relaxed">
              This project was built through collaboration between a human and an AI.
              The code is{" "}
              <a
                href="https://github.com/kkaufmann/IsAIConsciousYet"
                className="text-white underline hover:text-neutral-300 transition-colors"
              >
                open source
              </a>
              . The conversation about AI consciousness should be transparent.
              The tools we use to have that conversation should be too.
            </p>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 pt-8 border-t border-neutral-800">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Cast your vote
          </Link>
        </div>
      </article>
    </div>
  );
}
