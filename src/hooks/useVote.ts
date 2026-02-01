/**
 * Custom hook for voting logic using Cloudflare Worker
 * - Fetches vote count for an item
 * - Submits a vote for a user (one vote per user)
 * - Tracks if the user has voted (client-side, for UI)
 *
 * @param {string} itemId - Unique identifier for the voting item
 * @returns {object} { votes, hasVoted, userVote, vote, loading, error }
 */
import { useState, useEffect, useCallback } from 'react';
import { votesApi, type VoteResult } from '../api/votes';

function getUserId() {
  if (typeof window === 'undefined') return '';
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('userId', userId);
  }
  return userId;
}

function getStoredVote(itemId: string): "yes" | "no" | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(`voted:${itemId}`);
  if (stored === 'yes' || stored === 'no') return stored;
  return null;
}

export function useVote(itemId: string) {
  // Initialize from localStorage synchronously to prevent flash of enabled buttons
  const [votes, setVotes] = useState<VoteResult | null>(null);
  const [userVote, setUserVote] = useState<"yes" | "no" | null>(() => getStoredVote(itemId));
  const [hasVoted, setHasVoted] = useState(() => getStoredVote(itemId) !== null);
  const [loading, setLoading] = useState(true); // Start true to prevent flash
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    // Re-check localStorage in case of hydration mismatch
    const storedVote = getStoredVote(itemId);
    if (storedVote) {
      setHasVoted(true);
      setUserVote(storedVote);
    }

    // Fetch current vote counts
    votesApi.getVotes(itemId).then(({ data, error }) => {
      if (ignore) return;
      if (error) setError(error);
      else if (data) setVotes(data);
      setLoading(false);
    });

    return () => { ignore = true; };
  }, [itemId]);

  const vote = useCallback(async (voteValue: "yes" | "no") => {
    // Prevent double voting
    if (hasVoted) return;

    setLoading(true);
    setError(null);

    const userId = getUserId();
    const { data, error } = await votesApi.vote({ itemId, userId, vote: voteValue });

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    // Save vote to localStorage before updating state
    localStorage.setItem(`voted:${itemId}`, voteValue);

    setVotes(data);
    setHasVoted(true);
    setUserVote(voteValue);
    setLoading(false);
  }, [itemId, hasVoted]);

  return { votes, hasVoted, userVote, vote, loading, error };
}
