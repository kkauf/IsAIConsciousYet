import { useState } from "react";
import VoteButton from "./VoteButton";
import ResultsDisplay from "./ResultsDisplay";
import { MOCK_VOTING_DATA } from "../data/voting-data";
import { trackVote } from "../lib/analytics";

export default function VoteSection() {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(null);
  const [votingData, setVotingData] = useState(MOCK_VOTING_DATA);

  const handleVote = (vote: "yes" | "no") => {
    setUserVote(vote);
    setHasVoted(true);

    // Track vote event with Google Analytics
    trackVote(vote);

    // Update the voting data
    setVotingData((prev) => {
      const newVotingData = { ...prev };
      if (vote === "yes") {
        newVotingData.yes += 1;
      } else {
        newVotingData.no += 1;
      }
      newVotingData.totalVotes += 1;

      // Add to recent votes
      newVotingData.recentVotes = [
        { vote, timestamp: new Date().toISOString() },
        ...prev.recentVotes.slice(0, 9), // Keep only the 10 most recent
      ];

      return newVotingData;
    });
  };

  const handleBackToVote = () => {
    setHasVoted(false);
  };

  if (hasVoted) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
        <ResultsDisplay
          data={votingData}
          userVote={userVote}
          onBackToVote={handleBackToVote}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-row gap-4 items-center justify-center mt-8">
      <VoteButton type="yes" onVote={handleVote} className="animate-slide-up delay-100" />
      <VoteButton type="no" onVote={handleVote} className="animate-slide-up delay-200" />
    </div>
  );
}
