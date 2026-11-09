import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

// Case files merged into another case file (pipeline/merge-cases.mjs): { <retired slug>: <canonical slug> }.
// Each retired page, its data URL and its sub-routes (social card) redirect permanently to the canonical case file.
const retired: Record<string, string> = JSON.parse(readFileSync(path.join(import.meta.dirname, "content", "redirects.json"), "utf8"));

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile higher up in the home directory would otherwise be picked as the workspace root.
  turbopack: { root: import.meta.dirname },
  // /cases/<slug>.json: a dynamic segment cannot carry a suffix, so the URL maps onto a static route handler.
  rewrites: async () => ({ beforeFiles: [{ source: "/cases/:slug.json", destination: "/cases-json/:slug" }] }),
  redirects: async () =>
    Object.entries(retired).flatMap(([from, to]) => [
      { source: `/cases/${from}`, destination: `/cases/${to}`, permanent: true },
      { source: `/cases/${from}.json`, destination: `/cases/${to}.json`, permanent: true },
      { source: `/cases/${from}/:rest*`, destination: `/cases/${to}/:rest*`, permanent: true },
    ]),
};

export default nextConfig;
