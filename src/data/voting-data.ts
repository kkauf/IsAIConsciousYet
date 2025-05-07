export type VotingData = {
  yes: number;
  no: number;
  totalVotes: number;
  recentVotes: Array<{
    vote: "yes" | "no";
    timestamp: string;
  }>;
};

// Utility to generate recent votes dynamically
function generateRecentVotes(): VotingData["recentVotes"] {
  const votes: VotingData["recentVotes"] = [];
  const now = new Date();
  const days = 3;
  const minVotes = 3, maxVotes = 10;
  for (let d = 0; d < days; d++) {
    const votesToday = Math.floor(Math.random() * (maxVotes - minVotes + 1)) + minVotes;
    for (let v = 0; v < votesToday; v++) {
      let date = new Date(now);
      date.setUTCHours(0, 0, 0, 0); // start of day in UTC
      date.setUTCDate(date.getUTCDate() - d);
      // For today, only allow up to now
      if (d === 0) {
        // Minutes since start of today UTC to now
        const minutesIntoDay = Math.floor((now.getTime() - date.getTime()) / 60000);
        const randomMinutes = Math.floor(Math.random() * Math.max(1, minutesIntoDay));
        date.setUTCMinutes(randomMinutes);
        // Add a random number of seconds within the minute for more realism
        if (randomMinutes === minutesIntoDay - 1) {
          date.setUTCSeconds(Math.floor(Math.random() * (now.getUTCSeconds() + 1)));
        } else {
          date.setUTCSeconds(Math.floor(Math.random() * 60));
        }
        // Clamp to now if it somehow exceeds
        if (date > now) date = new Date(now);
      } else {
        // Previous days: any time in that day
        date.setUTCMinutes(Math.floor(Math.random() * 1440));
        date.setUTCSeconds(Math.floor(Math.random() * 60));
      }
      votes.push({
        vote: Math.random() > 0.5 ? "yes" : "no",
        timestamp: date.toISOString(),
      });
    }
  }
  // Sort descending (most recent first)
  votes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return votes;
}


// Mock data for the voting results
export const MOCK_VOTING_DATA: VotingData = {
  yes: 4289,
  no: 5731,
  totalVotes: 10020,
  recentVotes: generateRecentVotes(),
};
