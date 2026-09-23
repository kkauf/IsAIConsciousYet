import type { NextConfig } from "next";

// Pin the project root: a stray lockfile higher up in the home directory would otherwise be picked as the workspace root.
const nextConfig: NextConfig = { turbopack: { root: import.meta.dirname } };

export default nextConfig;
