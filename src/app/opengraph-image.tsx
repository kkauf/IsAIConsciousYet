import { ImageResponse } from "next/og";
import { OG_SIZE, ogFonts, Seam, BONE, ASH } from "@/lib/og";

export const alt = "Is AI Conscious Yet? Case files on what AI systems did and how named people read it.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#000", color: BONE, display: "flex", flexDirection: "column", padding: "72px 80px", fontFamily: "Public Sans" }}>
        <div style={{ fontFamily: "Newsreader", fontSize: 128, lineHeight: 0.95, letterSpacing: "-0.02em" }}>Is AI Conscious Yet?</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto", borderTop: "1px solid #2c2a27", paddingTop: 28 }}>
          <div style={{ flex: 1, fontFamily: "Newsreader", fontSize: 40, lineHeight: 1.2 }}>What AI systems did</div>
          <Seam height={110} />
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", textAlign: "right", fontFamily: "Newsreader", fontSize: 40, lineHeight: 1.2 }}>How named people read it</div>
        </div>
        <div style={{ marginTop: 22, fontSize: 26, color: ASH }}>isaiconsciousyet.com</div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
