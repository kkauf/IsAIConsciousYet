import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";


import type { VoteResult } from '../api/votes';

interface ResultsDisplayProps {
  data: VoteResult;
  userVote: "yes" | "no" | null;
  onBackToVote: () => void;
}

export default function ResultsDisplay({
  data,
  userVote,
  onBackToVote,
}: ResultsDisplayProps) {
  const [yesProgress, setYesProgress] = useState(0);
  const [noProgress, setNoProgress] = useState(0);

  const yesPercentage = data.totalVotes > 0 ? Math.round((data.yes / data.totalVotes) * 100) : 0;
  const noPercentage = data.totalVotes > 0 ? Math.round((data.no / data.totalVotes) * 100) : 0;

  useEffect(() => {
    // Animate progress bars
    const timer = setTimeout(() => {
      setYesProgress(yesPercentage);
      setNoProgress(noPercentage);
    }, 300);

    return () => clearTimeout(timer);
  }, [yesPercentage, noPercentage]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-neutral-900/80 border border-neutral-800/70 backdrop-blur-xl rounded-2xl shadow-2xl text-neutral-100 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <Button
          variant="ghost"
          onClick={onBackToVote}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700/90 border border-neutral-700 text-neutral-200 hover:text-white shadow transition-all duration-200"
        >
          <ArrowLeftIcon size={16} />
          Vote Again
        </Button>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total votes:{" "}
            <span className="font-semibold">
              {data.totalVotes.toLocaleString()}
            </span>
          </p>
          {userVote && (
            <p className="text-sm">
              You voted:{" "}
              <span
                className={`font-bold ${userVote === "yes" ? "text-emerald-500" : "text-rose-500"}`}
              >
                {userVote.toUpperCase()}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-emerald-400 tracking-tight">YES</h3>
            <span className="text-lg font-semibold text-neutral-100">{yesPercentage}%</span>
          </div>
          <Progress
            value={yesProgress}
            className="h-4 bg-neutral-800/70 animate-slide-up delay-100"
          />
          <p className="text-sm text-neutral-400">
            {data.totalVotes === 0
              ? "No one has voted yet"
              : `${data.yes.toLocaleString()} person${data.yes !== 1 ? "s" : ""} believe AI is conscious`}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-rose-400 tracking-tight">NO</h3>
            <span className="text-lg font-semibold text-neutral-100">{noPercentage}%</span>
          </div>
          <Progress
            value={noProgress}
            className="h-4 bg-neutral-800/70 animate-slide-up delay-200"
          />
          <p className="text-sm text-neutral-400">
            {data.no.toLocaleString()} people believe AI is not conscious
          </p>
        </div>
      </div>

      {/* <div className="mt-12">
        <h4 className="text-lg font-semibold mb-3">Recent Votes</h4>
        <div className="space-y-2">
          {data.recentVotes.slice(0, 5).map((vote, index) => {
            const voteTime = new Date(vote.timestamp);
            const timeAgo = getTimeAgo(voteTime);

          })}
        </div>
      </div> */}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  let diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) {
    // Timestamp is in the future
    return "just now";
  }

  if (diffInSeconds < 5) {
    return "just now";
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
}
