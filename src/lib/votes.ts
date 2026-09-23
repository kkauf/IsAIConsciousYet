// The site-wide yes/no vote. Counts live in a Cloudflare Worker (docs/votes-worker.md),
// reached through the /api/votes proxy. One vote per device, remembered in localStorage.
import { useCallback, useEffect, useState } from "react";

export type VoteResult = { yes: number; no: number; totalVotes: number };
type Vote = "yes" | "no";

async function call(path: string, init?: RequestInit): Promise<VoteResult> {
  const res = await fetch(path, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "The vote service did not respond.");
  return data;
}

function deviceId() {
  let id = localStorage.getItem("userId");
  if (!id) localStorage.setItem("userId", (id = crypto.randomUUID()));
  return id;
}

const storedVote = (itemId: string): Vote | null => {
  const v = localStorage.getItem(`voted:${itemId}`);
  return v === "yes" || v === "no" ? v : null;
};

export function useVote(itemId: string) {
  const [votes, setVotes] = useState<VoteResult | null>(null);
  const [userVote, setUserVote] = useState<Vote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // localStorage is read after mount, together with the counts, so server and client render the same markup.
  useEffect(() => {
    let live = true;
    call(`/api/votes/${encodeURIComponent(itemId)}`)
      .then((data) => live && setVotes(data))
      .catch((e: Error) => live && setError(e.message))
      .finally(() => {
        if (!live) return;
        setUserVote(storedVote(itemId));
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [itemId]);

  const vote = useCallback(
    async (v: Vote) => {
      if (userVote) return;
      setLoading(true);
      setError(null);
      try {
        const data = await call("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, userId: deviceId(), vote: v }),
        });
        localStorage.setItem(`voted:${itemId}`, v);
        setVotes(data);
        setUserVote(v);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [itemId, userVote],
  );

  return { votes, hasVoted: userVote !== null, userVote, vote, loading, error };
}
