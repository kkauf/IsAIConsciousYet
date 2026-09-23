import { ImageResponse } from "next/og";
import { OG_SIZE, ogFonts, Seam, BONE, ASH } from "@/lib/og";

export const alt = "Is AI Conscious Yet? Yes or no, divided by a line.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#000", color: BONE, display: "flex", flexDirection: "column", padding: "72px 80px", fontFamily: "Public Sans" }}>
        <div style={{ fontFamily: "Newsreader", fontSize: 128, lineHeight: 0.95, letterSpacing: "-0.02em" }}>Is AI Conscious Yet?</div>
        <div style={{ display: "flex", alignItems: "stretch", marginTop: "auto", borderTop: "1px solid #2c2a27", borderBottom: "1px solid #2c2a27" }}>
          <div style={{ flex: 1, fontFamily: "Newsreader", fontSize: 96, padding: "28px 0" }}>Yes</div>
          <Seam height={170} />
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", fontFamily: "Newsreader", fontSize: 96, padding: "28px 0" }}>No</div>
        </div>
        <div style={{ marginTop: 22, fontSize: 26, color: ASH }}>isaiconsciousyet.com</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
