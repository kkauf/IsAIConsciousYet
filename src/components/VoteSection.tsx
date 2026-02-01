"use client";

import { useVote } from "../hooks/useVote";
import VoteButton from "./VoteButton";
import ResultsDisplay from "./ResultsDisplay";
import { trackVote } from "../lib/analytics";

export default function VoteSection() {
  const itemId = "main-consciousness-question";
  const { votes, hasVoted, userVote, vote, loading, error } = useVote(itemId);

  const handleVote = (v: "yes" | "no") => {
    vote(v);
    trackVote(v);
  };

  if (hasVoted && votes) {
    return <ResultsDisplay data={votes} userVote={userVote} />;
  }

  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-neutral-500 text-sm mb-8">
        What do you believe?
      </p>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-md justify-center">
        <VoteButton
          type="yes"
          onVote={handleVote}
          disabled={hasVoted || loading}
        />
        <VoteButton
          type="no"
          onVote={handleVote}
          disabled={hasVoted || loading}
        />
      </div>

      <p className="text-neutral-600 text-xs mt-6">
        Anonymous · One vote per device · Permanent
      </p>

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-neutral-400 text-sm">
          <div className="w-4 h-4 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
          Recording your vote...
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mt-6">{error}</p>
      )}
    </div>
  );
}
