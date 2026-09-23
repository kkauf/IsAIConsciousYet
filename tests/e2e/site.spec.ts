import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";

// Never clicks the vote: that would write a real vote to the production counter.
const cases = readdirSync("content/cases")
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(`content/cases/${f}`, "utf8")))
  .filter((c) => c.status === "published");

test("homepage leads with the latest case file and ends with the vote", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is AI Conscious Yet?");
  await expect(page.getByRole("heading", { name: "The latest case file" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();
});

for (const c of cases) {
  test(`case file ${c.slug} shows its readings and sources`, async ({ page }) => {
    await page.goto(`/cases/${c.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(c.title);
    await expect(page.locator("blockquote")).toHaveCount(c.readings.length);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  });
}

test("machine-readable routes list every case file", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const llms = await (await request.get("/llms.txt")).text();
  for (const c of cases) {
    expect(sitemap).toContain(`/cases/${c.slug}`);
    expect(llms).toContain(`/cases/${c.slug}`);
  }
  expect((await request.get("/robots.txt")).ok()).toBe(true);
  expect((await request.get("/opengraph-image")).headers()["content-type"]).toContain("image/png");
});
