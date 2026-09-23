// Social cards, rendered at build time. Same system as the site: black, bone, a serif for what people said, the seam.
import { readFile } from "node:fs/promises";
import path from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const font = (f: string) => readFile(path.join(process.cwd(), "src/assets", f));
  return [
    { name: "Newsreader", data: await font("Newsreader-Light-72.ttf"), weight: 300 as const, style: "normal" as const },
    { name: "Public Sans", data: await font("PublicSans-Regular.ttf"), weight: 400 as const, style: "normal" as const },
  ];
}

export const BONE = "#ece8e1";
export const ASH = "#a29e97";

export function Seam({ height }: { height: number }) {
  return <div style={{ width: 1, height, background: `linear-gradient(to bottom, transparent, ${BONE} 12%, ${BONE} 88%, transparent)`, opacity: 0.45 }} />;
}
