import { ImageResponse } from "next/og";
import { OG_SIZE, ogFonts, BONE, ASH } from "@/lib/og";
import { allCases } from "@/lib/cases/load";
import { loadCoverage, months } from "@/lib/coverage";

export const alt = "Articles in major publications about whether AI could be conscious, month by month since 2020.";
export const size = OG_SIZE;
export const contentType = "image/png";

// The timeline's upper band as bars: one column per month, the current month in bone.
export default async function Image() {
  const coverage = loadCoverage();
  const ms = months(coverage, allCases());
  const max = Math.max(1, ...ms.map((m) => m.articles.length));
  const col = 1040 / Math.max(1, ms.length);
  const last12 = ms.slice(-12).reduce((n, m) => n + m.articles.length, 0);
  const firstYear = ms[0]?.key.slice(0, 4);
  const inFirst = ms.filter((m) => m.key.startsWith(firstYear ?? "")).reduce((n, m) => n + m.articles.length, 0);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#000", color: BONE, display: "flex", flexDirection: "column", padding: "64px 80px", fontFamily: "Public Sans" }}>
        <div style={{ fontFamily: "Newsreader", fontSize: 76, lineHeight: 1, letterSpacing: "-0.02em" }}>The question, over time</div>
        <div style={{ marginTop: 18, fontSize: 26, color: ASH }}>
          {`Articles about whether AI could be conscious: ${last12} in the last twelve months, ${inFirst} in ${firstYear}`}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: "auto", height: 280, borderBottom: "1px solid #5f5c57" }}>
          {ms.map((m, i) => (
            <div key={m.key} style={{ width: col, display: "flex", justifyContent: "center" }}>
              <div style={{ width: Math.max(2, col - 3), height: Math.round((m.articles.length / max) * 270), background: i === ms.length - 1 ? BONE : ASH, opacity: i === ms.length - 1 ? 1 : 0.75 }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 22, color: ASH }}>
          <div style={{ flex: 1 }}>{firstYear}</div>
          <div>Now, isaiconsciousyet.com/timeline</div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
