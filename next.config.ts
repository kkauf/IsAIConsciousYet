import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile higher up in the home directory would otherwise be picked as the workspace root.
  turbopack: { root: import.meta.dirname },
  // /cases/<slug>.json: a dynamic segment cannot carry a suffix, so the URL maps onto a static route handler.
  rewrites: async () => ({ beforeFiles: [{ source: "/cases/:slug.json", destination: "/cases-json/:slug" }] }),
};

export default nextConfig;
