import { monthName, type Month } from "@/lib/coverage";

// One column per month. Above the line, one square per article in the press; below it, one dot per
// case file (amber: honorable mention). The current month is drawn in bone. Each column links to its
// month in the list on /timeline. Styles: .tl-* in src/app/globals.css.
const P = 12; // column pitch
const S = 10; // square
const CASE_TOP = 16, CASE_STEP = 12;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Months with something in them link to the list; empty months are drawn without a link.
function Col({ href, now, label, children }: { href?: string; now: boolean; label: string; children: React.ReactNode }) {
  const className = `tl-col${now ? " tl-now" : ""}`;
  return href ? <a href={href} className={className} aria-label={label}>{children}</a> : <g className={className}>{children}</g>;
}

export default function Timeline({ ms, linkBase = "" }: { ms: Month[]; linkBase?: string }) {
  const n = ms.length;
  const rows = Math.max(8, ...ms.map((m) => m.articles.length));
  const caseRows = Math.max(1, ...ms.map((m) => m.cases.length));
  const base = rows * P + 4;
  const height = base + CASE_TOP + caseRows * CASE_STEP;
  const width = n * P;
  const years = ms.flatMap((m, i) => (m.key.endsWith("-01") || i === 0 ? [{ year: m.key.slice(0, 4), i }] : []));
  const perYear = (y: string) => ms.filter((m) => m.key.startsWith(y)).reduce((t, m) => t + m.articles.length, 0);
  const now = ms[n - 1];
  // The busiest month gets a label at the top of its column, so the peak reads without hovering.
  const peak = ms.reduce((b, m, i) => (m.articles.length > ms[b].articles.length ? i : b), 0);
  const peakMonth = ms[peak];

  return (
    <figure className="tl-chart">
      <div className="flex items-baseline justify-end text-sm text-ash">
        {now && <span>Now: {monthName(now.key)}, {plural(now.articles.length, "article", "articles")} so far</span>}
      </div>
      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={`Articles per month in the press about whether AI could be conscious, and case files, ${monthName(ms[0]?.key ?? "")} to ${monthName(now?.key ?? "")}`}
        >
          {years.filter((y) => y.i > 0).map((y) => (
            <line key={y.year} className="tl-year" x1={y.i * P} x2={y.i * P} y1={0} y2={height} />
          ))}
          <line className="tl-base" x1={0} x2={width} y1={base} y2={base} />
          {ms.map((m, i) => {
            const label = `${monthName(m.key)}: ${plural(m.articles.length, "article", "articles")}${m.cases.length ? `, ${plural(m.cases.length, "case file", "case files")}` : ""}`;
            return (
              <Col key={m.key} href={m.articles.length || m.cases.length ? `${linkBase}#m-${m.key}` : undefined} now={i === n - 1} label={label}>
                <title>{label}</title>
                <rect className="tl-hit" x={i * P} y={0} width={P} height={height} />
                {m.articles.map((a, k) => (
                  <rect key={a.url} className="tl-sq" x={i * P + 1} y={base - (k + 1) * P + 1} width={S} height={S} />
                ))}
                {m.cases.length > 0 && (
                  <line className="tl-stem" x1={i * P + P / 2} x2={i * P + P / 2} y1={base} y2={base + CASE_TOP + (m.cases.length - 1) * CASE_STEP} />
                )}
                {m.cases.map((c, j) => (
                  <circle key={c.slug} className={c.tier === "mention" ? "tl-mention" : "tl-case"} cx={i * P + P / 2} cy={base + CASE_TOP + j * CASE_STEP} r={4.5} />
                ))}
              </Col>
            );
          })}
        </svg>
        {peakMonth && peakMonth.articles.length > 1 && peak !== n - 1 && (
          <span
            className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap pl-2 text-sm text-ash"
            style={{ left: `${((peak + 1) / n) * 100}%`, top: `${((base - (peakMonth.articles.length - 0.5) * P) / height) * 100}%` }}
          >
            {monthName(peakMonth.key)}, {plural(peakMonth.articles.length, "article", "articles")}
          </span>
        )}
      </div>
      <div className="relative mt-3 h-14">
        {years.map((y) => (
          <div key={y.year} className="absolute top-0 pl-1.5" style={{ left: `${(y.i / n) * 100}%` }}>
            <span className="block text-sm text-dim tabular-nums">{y.year}</span>
            <span className="block font-serif text-xl md:text-2xl leading-tight tabular-nums">{perYear(y.year)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
