import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/cases/load";

// Answer engines are welcome: the case files exist to be quoted with their sources.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
