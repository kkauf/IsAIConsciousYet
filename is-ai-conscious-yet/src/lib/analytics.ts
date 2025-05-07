// Google Analytics gtag helper for event tracking
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-90WP8XVMQE';

export function pageview(url: string) {
  if (window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

export function trackVote(vote: 'yes' | 'no') {
  if (window.gtag) {
    window.gtag('event', 'vote_cast', {
      event_category: 'engagement',
      event_label: vote,
      value: 1,
    });
  }
}

// Optionally, add more event helpers as needed
