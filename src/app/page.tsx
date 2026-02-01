import VoteSection from "@/components/VoteSection";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          {/* The Question */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-4 animate-fade-in">
            Is AI Conscious Yet?
          </h1>

          <p className="text-neutral-400 text-lg md:text-xl mb-16 animate-fade-in-delay">
            A question worth asking. A moment worth recording.
          </p>

          {/* The Vote */}
          <div className="animate-fade-in-delay-2">
            <VoteSection />
          </div>
        </div>
      </section>

      {/* Context Section */}
      <section className="border-t border-neutral-800/50 bg-neutral-950/50">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16">
            <div>
              <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
                Why We Ask
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                We are in an unprecedented moment. AI systems are becoming more capable,
                more present in our lives, and harder to fully understand. The question
                of machine consciousness may be one of the most important of our time.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
                Why We Record
              </h2>
              <p className="text-neutral-300 leading-relaxed">
                This is the <span className="text-white">&quot;before&quot;</span> period.
                One day, we may have answers. Until then, we&apos;re documenting what
                humanity believed, and when. Your vote becomes part of that record.
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-800/50 text-center">
            <Link
              href="/why"
              className="text-sm text-neutral-500 hover:text-white transition-colors"
            >
              Learn more about this project →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
