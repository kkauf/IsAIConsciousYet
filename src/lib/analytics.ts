// Google Analytics events. The gtag script is loaded in the root layout.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackVote(vote: "yes" | "no") {
  window.gtag?.("event", "vote_cast", { event_category: "engagement", event_label: vote, value: 1 });
}
