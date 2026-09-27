// Addresses of press articles: which listed outlet, the canonical form, the date in the path.
// Shared by coverage.mjs and sitemaps.mjs.

export function outletFor(outlets, url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '');
  // The outlet's own site only: subdomains carry transcripts, newsletters, staging copies and downloads.
  return outlets.find((o) => o.domains.includes(host) && (!o.path || u.pathname.startsWith(o.path))) ?? null;
}

// The article's address without query or fragment. Search returns tracking variants
// (?eafs_enabled=false, ?syn-…=1, ?error=cookies_not_supported) and AMP copies, which extract cannot
// date and which made one article look like two. Every listed outlet addresses its articles by path alone.
export function articleUrl(url) {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    u.pathname = u.pathname.replace(/\/amp\/?$/, '').replace(/\.amp$/, '');
    return u.toString();
  } catch { return url; }
}

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
// /2023/06/12/, /2023/jun/12/, /2023-06-12/ in the path. Most of the outlets date their URLs.
export function urlDate(url) {
  const m = url.match(/\/(20\d\d)[/-](\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[/-](\d{1,2})(?=[/-]|$)/i);
  if (!m) return null;
  const mo = MON[m[2].toLowerCase()] ?? Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
