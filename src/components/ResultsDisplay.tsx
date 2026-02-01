"use client";

import { useState, useEffect } from "react";
import type { VoteResult } from "../api/votes";

interface ResultsDisplayProps {
  data: VoteResult;
  userVote: "yes" | "no" | null;
}

export default function ResultsDisplay({ data, userVote }: ResultsDisplayProps) {
  const [animated, setAnimated] = useState(false);

  const yesPercentage =
    data.totalVotes > 0 ? Math.round((data.yes / data.totalVotes) * 100) : 0;
  const noPercentage =
    data.totalVotes > 0 ? Math.round((data.no / data.totalVotes) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Vote confirmation */}
      {userVote && (
        <div className="text-center mb-10">
          <p className="text-neutral-500 text-sm mb-1">Your vote</p>
          <p className="text-2xl font-semibold text-white">
            {userVote === "yes" ? "Yes" : "No"}
          </p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-6">
        {/* YES bar */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-neutral-400 text-sm font-medium">Yes</span>
            <span className="text-2xl font-semibold text-white tabular-nums">
              {yesPercentage}%
            </span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
              style={{ width: animated ? `${yesPercentage}%` : "0%" }}
            />
          </div>
        </div>

        {/* NO bar */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-neutral-400 text-sm font-medium">No</span>
            <span className="text-2xl font-semibold text-white tabular-nums">
              {noPercentage}%
            </span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: animated ? `${noPercentage}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="mt-8 pt-6 border-t border-neutral-800">
        <p className="text-center text-neutral-500 text-sm">
          <span className="text-white font-medium">{data.totalVotes.toLocaleString()}</span> {data.totalVotes === 1 ? 'vote' : 'votes'} recorded
        </p>
      </div>
    </div>
  );
}
