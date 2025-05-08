/**
 * @endpoint /vote (POST), /votes/:itemId (GET)
 * @description API client for voting Cloudflare Worker
 * @example
 * const { data, error } = await votesApi.vote({ itemId, userId });
 * if (error) handleError(error);
 * return data;
 */

const VOTES_API_BASE = 'https://votes.kgm-839.workers.dev';

export type VoteResult = {
  yes: number;
  no: number;
  totalVotes: number;
};

/**
 * @param {string} itemId - Unique identifier for the voting item
 * @returns {Promise<{ data: VoteResult | null, error: string | null }>}
 */
export async function getVotes(itemId: string): Promise<{ data: VoteResult | null, error: string | null }> {
  try {
    const res = await fetch(`${VOTES_API_BASE}/votes/${encodeURIComponent(itemId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch votes');
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * @param {Object} params
 * @param {string} params.itemId
 * @param {string} params.userId
 * @param {("yes" | "no")} params.vote
 * @returns {Promise<{ data: VoteResult | null, error: string | null }>}
 */
export async function vote({ itemId, userId, vote }: { itemId: string; userId: string; vote: "yes" | "no" }): Promise<{ data: VoteResult | null, error: string | null }> {
  try {
    const res = await fetch(`${VOTES_API_BASE}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, userId, vote })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Voting failed');
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export const votesApi = { getVotes, vote };
