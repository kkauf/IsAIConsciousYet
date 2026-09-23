import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The homepage renders per request and reads the latest case file from disk.
  outputFileTracingIncludes: { "/": ["./content/cases/**"] },
};

export default nextConfig;
