import { useVote } from "../hooks/useVote";
import VoteButton from "./VoteButton";
import ResultsDisplay from "./ResultsDisplay";
import { trackVote } from "../lib/analytics";


export default function VoteSection() {
  // You can parameterize this if you have multiple questions
  const itemId = "question123";
  const { votes, hasVoted, userVote, vote, loading, error } = useVote(itemId);

  const handleVote = (v: "yes" | "no") => {
    vote(v);
    trackVote(v);
  };

  const handleBackToVote = () => {
    // Optionally allow revoting for demo, but normally keep disabled to enforce 1 vote/user
    // window.location.reload(); // or do nothing
  };

  if (hasVoted && votes) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
        <ResultsDisplay
          data={votes}
          userVote={userVote}
          onBackToVote={handleBackToVote}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-row gap-4 items-center justify-center mt-8">
      <VoteButton type="yes" onVote={handleVote} className="animate-slide-up delay-100" disabled={hasVoted || loading} />
      <VoteButton type="no" onVote={handleVote} className="animate-slide-up delay-200" disabled={hasVoted || loading} />
      {error && <div className="text-red-500 ml-4">{error}</div>}
    </div>
  );
}
