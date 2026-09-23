import { ImageResponse } from "next/og";
import { allCases, getCase, dateRange } from "@/lib/cases/load";
import { OG_SIZE, ogFonts, Seam, BONE, ASH } from "@/lib/og";

export const alt = "Case file: an AI event and two named readings of it, divided by a line.";
export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = () => allCases().map((c) => ({ slug: c.slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCase((await params).slug)!;
  const pair = c.readings.filter((r) => r.aboutNature).slice(0, 2);
  const names = pair.length === 2 ? pair.map((r) => r.partyName) : [`${c.readings.length} named readings`, "quoted word for word"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#000", color: BONE, display: "flex", flexDirection: "column", padding: "64px 80px", fontFamily: "Public Sans" }}>
        <div style={{ fontSize: 26, color: ASH }}>{`Case file, ${dateRange(c.event.dateStart, c.event.dateEnd)}`}</div>
        <div style={{ fontFamily: "Newsreader", fontSize: c.title.length > 60 ? 64 : 76, lineHeight: 1.02, letterSpacing: "-0.015em", marginTop: 22 }}>{c.title}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto", borderTop: "1px solid #2c2a27", paddingTop: 26 }}>
          <div style={{ flex: 1, fontFamily: "Newsreader", fontSize: 44 }}>{names[0]}</div>
          <Seam height={90} />
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", fontFamily: "Newsreader", fontSize: 44 }}>{names[1]}</div>
        </div>
        <div style={{ marginTop: 20, fontSize: 24, color: ASH }}>isaiconsciousyet.com</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
