import SeamEye from "@/components/eye/SeamEye";
import TimelinePreview from "@/components/TimelinePreview";
import { dateRange, shortDate } from "@/lib/cases/load";
import { articleId, monthName, type Month } from "@/lib/coverage";

// One column per month. Above the line, one square per article in the press; below it, one dot per
// case file (amber: honorable mention). Behind each year, a band as high as its average month, so the
// years compare at a glance. The current month is drawn in bone. Each month links to its entry in the
// list on /timeline; with script, each square and dot previews itself and leads to its own row
// (TimelinePreview). Styles: .tl-* in src/app/globals.css.
const P = 12; // column pitch
const S = 10; // square
const CASE_TOP = 16, CASE_STEP = 12;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Months with something in them link to the list; empty months are drawn without a link.
function Col({ href, now, label, children }: { href?: string; now: boolean; label: string; children: React.ReactNode }) {
  const className = `tl-col${now ? " tl-now" : ""}`;
  return href ? <a href={href} className={className} aria-label={label}>{children}</a> : <g className={className}>{children}</g>;
}

// The longest stretch of months with nothing in them, before the current month.
function quietest(ms: Month[]) {
  let best = { start: 0, len: 0 }, start = 0;
  ms.slice(0, -1).forEach((m, i) => {
    if (m.articles.length || m.cases.length) start = i + 1;
    else if (i + 1 - start > best.len) best = { start, len: i + 1 - start };
  });
  return best;
}

export default function Timeline({ ms, linkBase = "" }: { ms: Month[]; linkBase?: string }) {
  const n = ms.length;
  const rows = Math.max(8, ...ms.map((m) => m.articles.length));
  const caseRows = Math.max(1, ...ms.map((m) => m.cases.length));
  const base = rows * P + 4;
  const height = base + CASE_TOP + caseRows * CASE_STEP;
  const width = n * P;
  const years = ms.flatMap((m, i) => (m.key.endsWith("-01") || i === 0 ? [{ year: m.key.slice(0, 4), i }] : []));
  const bands = years.map((y) => {
    const inYear = ms.filter((m) => m.key.startsWith(y.year));
    const total = inYear.reduce((t, m) => t + m.articles.length, 0);
    return { ...y, months: inYear.length, total, avg: total / inYear.length };
  });
  const now = ms[n - 1];
  // The busiest month gets a label at the top of its column, so the peak reads without hovering.
  const peak = ms.reduce((b, m, i) => (m.articles.length > ms[b].articles.length ? i : b), 0);
  const peakMonth = ms[peak];
  const quiet = quietest(ms);

  return (
    <figure className="tl-chart">
      <div className="flex items-baseline justify-end text-sm text-ash">
        {now && <span>Now: {monthName(now.key)}, {plural(now.articles.length, "article", "articles")} so far</span>}
      </div>
      <TimelinePreview className="relative mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={`Articles per month in the press about whether AI could be conscious, and case files, ${monthName(ms[0]?.key ?? "")} to ${monthName(now?.key ?? "")}`}
        >
          {bands.map((b) => b.total > 0 && (
            <g key={b.year} className="tl-band">
              <rect x={b.i * P} y={base - b.avg * P} width={b.months * P} height={b.avg * P} />
              <line x1={b.i * P} x2={(b.i + b.months) * P} y1={base - b.avg * P} y2={base - b.avg * P} />
            </g>
          ))}
          {years.filter((y) => y.i > 0).map((y) => (
            <line key={y.year} className="tl-year" x1={y.i * P} x2={y.i * P} y1={0} y2={height} />
          ))}
          <line className="tl-base" x1={0} x2={width} y1={base} y2={base} />
          {ms.map((m, i) => {
            const label = `${monthName(m.key)}: ${plural(m.articles.length, "article", "articles")}${m.cases.length ? `, ${plural(m.cases.length, "case file", "case files")}` : ""}`;
            return (
              <Col key={m.key} href={m.articles.length || m.cases.length ? `${linkBase}#m-${m.key}` : undefined} now={i === n - 1} label={label}>
                <rect className="tl-hit" x={i * P} y={0} width={P} height={height} />
                {m.articles.map((a, k) => (
                  <rect
                    key={a.url}
                    className="tl-sq"
                    x={i * P + 1}
                    y={base - (k + 1) * P + 1}
                    width={S}
                    height={S}
                    data-id={articleId(a.url)}
                    data-href={`${linkBase}#${articleId(a.url)}`}
                    data-type="article"
                    data-t={a.headline}
                    data-m={`${a.publication}, ${shortDate(a.date)}`}
                  />
                ))}
                {m.cases.length > 0 && (
                  <line className="tl-stem" x1={i * P + P / 2} x2={i * P + P / 2} y1={base} y2={base + CASE_TOP + (m.cases.length - 1) * CASE_STEP} />
                )}
                {m.cases.map((c, j) => (
                  <circle
                    key={c.slug}
                    className={c.tier === "mention" ? "tl-mention" : "tl-case"}
                    cx={i * P + P / 2}
                    cy={base + CASE_TOP + j * CASE_STEP}
                    r={4.5}
                    data-id={`c-${c.slug}`}
                    data-href={`${linkBase}#c-${c.slug}`}
                    data-type="case"
                    data-t={c.title}
                    data-m={`${c.tier === "mention" ? "Honorable mention" : "Case file"}, ${dateRange(c.event.dateStart, c.event.dateEnd)}`}
                  />
                ))}
              </Col>
            );
          })}
        </svg>
        {quiet.len >= 6 && (
          <SeamEye
            size="chart"
            orientation="horizontal"
            line={false}
            className="pointer-events-none absolute h-px scale-[0.6] sm:scale-100"
            style={{ left: `${(quiet.start / n) * 100}%`, width: `${(quiet.len / n) * 100}%`, top: `${(base / height) * 100}%` }}
          />
        )}
        {peakMonth && peakMonth.articles.length > 1 && peak !== n - 1 && (
          <span
            className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap pl-2 text-sm text-ash"
            style={{ left: `${((peak + 1) / n) * 100}%`, top: `${((base - (peakMonth.articles.length - 0.5) * P) / height) * 100}%` }}
          >
            {monthName(peakMonth.key)}, {plural(peakMonth.articles.length, "article", "articles")}
          </span>
        )}
      </TimelinePreview>
      <div className="relative mt-3 h-14">
        {bands.map((b) => (
          <div key={b.year} className="absolute top-0 pl-1.5" style={{ left: `${(b.i / n) * 100}%` }}>
            <span className="block text-sm text-dim tabular-nums">{b.year}</span>
            <span className="block font-serif text-xl md:text-2xl leading-tight tabular-nums">{b.total}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
