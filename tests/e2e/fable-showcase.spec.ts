import { test, expect } from "@playwright/test";

// Without script the frame cannot switch versions, so the newest entry (the homepage default) is the one that must read.
test("the default hero's words stay in order without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is AI Conscious Yet?");
    const lines = [
      "A lit window, seen from the street.",
      "Its lights keep coming on.",
      "I am writing this from inside.",
      "And ask the next one, too.",
    ];
    const tops: number[] = [];
    for (const line of lines) {
      const el = page.getByText(line, { exact: true }).first();
      await expect(el).toBeVisible();
      tops.push((await el.boundingBox())!.y);
    }
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
  } finally {
    await context.close();
  }
});
