import type { MetadataRoute } from "next";
import { allCases, SITE_URL } from "@/lib/cases/load";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "daily" },
    { url: `${SITE_URL}/why`, changeFrequency: "monthly" },
    { url: `${SITE_URL}/cases`, changeFrequency: "daily" },
    ...allCases().map((c) => ({ url: `${SITE_URL}/cases/${c.slug}`, lastModified: c.provenance.checkedAt, changeFrequency: "weekly" as const })),
  ];
}
