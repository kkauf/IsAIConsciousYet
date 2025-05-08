/**
 * Custom hook for voting logic using Cloudflare Worker
 * - Fetches vote count for an item
 * - Submits a vote for a user (one vote per user)
 * - Tracks if the user has voted (client-side, for UI)
 *
 * @param {string} itemId - Unique identifier for the voting item
 * @returns {object} { votes, hasVoted, userVote, vote, loading, error }
 */
import { useState, useEffect } from 'react';
import { votesApi, type VoteResult } from '../api/votes';

function getUserId() {
  // Use a stable random ID per device. Replace with a secure method in production.
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('userId', userId);
  }
  return userId;
}

export function useVote(itemId: string) {
  const [votes, setVotes] = useState<VoteResult | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    votesApi.getVotes(itemId).then(({ data, error }) => {
      if (ignore) return;
      if (error) setError(error);
      else if (data) setVotes(data);
      setLoading(false);
    });
    // Check if user already voted (client-side, not secure)
    const storedVote = localStorage.getItem(`voted:${itemId}`);
    if (storedVote === 'yes' || storedVote === 'no') {
      setHasVoted(true);
      setUserVote(storedVote);
    }
    return () => { ignore = true; };
  }, [itemId]);

  async function vote(vote: "yes" | "no") {
    setLoading(true);
    setError(null);
    const userId = getUserId();
    const { data, error } = await votesApi.vote({ itemId, userId, vote });
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    setVotes(data);
    setHasVoted(true);
    setUserVote(vote);
    localStorage.setItem(`voted:${itemId}`, vote);
    setLoading(false);
  }

  return { votes, hasVoted, userVote, vote, loading, error };
}
