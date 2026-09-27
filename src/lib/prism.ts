// The prism. One number, --spectrum in [0, 1], set on <html>. It grows with the reader's own time on
// the site and lives in this browser only (localStorage "prism"); nothing is sent anywhere. At 0 the site
// is monochrome, as it was built. As it grows, the seams disperse into a spectrum, the eye's iris takes
// colour, the site's headings tint and the black ground gets a faint wash (src/app/globals.css, "The prism").
// The showcase heroes are not tinted: each is kept as its model made it.

const KEY = "prism";
const TICK = 4; // seconds between ticks; the CSS transition runs the same length, so the change is continuous
const NEW_VISIT_AFTER = 6 * 3600_000;

type Store = { seconds: number; cases: string[]; voted: boolean; visits: number; lastSeen: number };

let store: Store | null = null;
function load(): Store {
  if (store) return store;
  const empty: Store = { seconds: 0, cases: [], voted: false, visits: 0, lastSeen: 0 };
  let read: Store;
  try {
    read = { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    read = empty;
  }
  store = read;
  return read;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage refused (private mode, full): the value lives for this page only
  }
}

// Saturating. A first minute of reading shows; ten minutes, two case files and a vote are close to the end.
export function spectrum(s = load()): number {
  const x = s.seconds / 300 + Math.min(s.cases.length, 5) * 0.25 + (s.voted ? 0.3 : 0) + Math.min(s.visits, 3) * 0.2;
  return Math.min(1, 1 - Math.exp(-x));
}

let shown = -1;
function show(seconds: number) {
  const v = Math.round(spectrum() * 1000) / 1000;
  if (v === shown) return;
  shown = v;
  const root = document.documentElement.style;
  root.setProperty("--spectrum-time", `${seconds}s`);
  root.setProperty("--spectrum", String(v));
}

export function record(what: "vote" | { case: string }) {
  const s = load();
  if (what === "vote") s.voted = true;
  else if (!s.cases.includes(what.case)) s.cases.push(what.case);
  save();
  show(2);
}

// Once per page load: counts a return visit, shows what the reader has decoded so far, then adds their
// time while the tab is visible. Returns the stop function.
export function start() {
  const s = load();
  const now = Date.now();
  if (s.lastSeen && now - s.lastSeen > NEW_VISIT_AFTER) s.visits += 1;
  s.lastSeen = now;
  save();
  show(3);
  const id = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    s.seconds += TICK;
    s.lastSeen = Date.now();
    save();
    show(TICK);
  }, TICK * 1000);
  return () => clearInterval(id);
}
