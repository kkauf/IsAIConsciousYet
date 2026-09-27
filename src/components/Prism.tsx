"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { record, start } from "@/lib/prism";

// Mounted once, in the layout. Renders nothing: the colour lives in CSS (globals.css, "The prism") and
// the number behind it in src/lib/prism.ts. Opening a case file counts, so does time with the tab visible.
export default function Prism() {
  const pathname = usePathname();
  useEffect(() => start(), []);
  useEffect(() => {
    const m = pathname.match(/^\/cases\/([^/]+)$/);
    if (m) record({ case: m[1] });
  }, [pathname]);
  return null;
}
