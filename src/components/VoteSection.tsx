"use client";

import { useEffect, useState } from "react";
import { useVote } from "@/lib/votes";
import { trackVote } from "@/lib/analytics";

const SIDES = ["yes", "no"] as const;
const LABEL = { yes: "Yes", no: "No" };

// Before you vote, the seam sits in the middle and each half is a button.
// After you vote, the seam slides to where everyone else stands.
export default function VoteSection() {
  const { votes, hasVoted, userVote, vote, loading, error } = useVote("main-consciousness-question");
  const results = hasVoted && votes ? votes : null;
  const yes = results && results.totalVotes > 0 ? Math.round((results.yes / results.totalVotes) * 100) : 50;
  const pct = { yes, no: 100 - yes };

  const [moved, setMoved] = useState(false);
  useEffect(() => {
    if (!results) return;
    const t = setTimeout(() => setMoved(true), 60);
    return () => clearTimeout(t);
  }, [results]);
  const seamAt = results && moved ? yes : 50;

  const cast = (v: "yes" | "no") => {
    vote(v);
    trackVote(v);
  };

  return (
    <div className="w-full">
      <p className="font-serif text-2xl md:text-3xl leading-tight">{results ? "What everyone who voted believes" : "What do you believe?"}</p>

      <div className="relative mt-6 grid grid-cols-2 border-y border-rule">
        {/* Share of yes votes, as area */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-bone/[0.07] transition-[width] duration-[1400ms] ease-[cubic-bezier(.2,.8,.1,1)] motion-reduce:transition-none"
          style={{ width: results ? `${seamAt}%` : 0 }}
        />
        {SIDES.map((side) => {
          const align = side === "yes" ? "text-left pl-1" : "text-right pr-1";
          const word = <span className="block font-serif font-light text-4xl md:text-5xl leading-none">{LABEL[side]}</span>;
          return results ? (
            <div key={side} className={`relative py-5 md:py-6 ${align}`}>
              {word}
              <span className="mt-2 block tabular-nums text-ash">
                <span className="text-bone text-xl">{pct[side]}%</span>
                {userVote === side && <span className="ml-3">your vote</span>}
              </span>
            </div>
          ) : (
            <button
              key={side}
              onClick={() => cast(side)}
              disabled={loading}
              className={`relative py-5 md:py-6 ${align} text-bone/85 hover:text-bone hover:bg-bone/[0.04] transition-colors disabled:cursor-wait disabled:text-bone/40 focus-visible:outline-offset-[-2px]`}
            >
              {word}
            </button>
          );
        })}
        <span
          aria-hidden
          className="seam absolute inset-y-0 transition-[left] duration-[1400ms] ease-[cubic-bezier(.2,.8,.1,1)] motion-reduce:transition-none"
          style={{ left: `${seamAt}%` }}
        />
      </div>

      <p className="mt-4 text-sm text-dim" aria-live="polite">
        {results
          ? `${results.totalVotes.toLocaleString("en")} ${results.totalVotes === 1 ? "vote" : "votes"} recorded. You are part of this record now.`
          : "Anonymous. One vote per device, and it cannot be changed."}
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
