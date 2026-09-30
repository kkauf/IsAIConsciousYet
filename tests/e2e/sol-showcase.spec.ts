import { test, expect } from "@playwright/test";

test("the banner hydrates without server/client attribute mismatches", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (/hydration|hydrated|server.rendered|Minified React error #(?:418|419|421|422|423|424|425)/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => hydrationErrors.push(error.message));
  for (const url of ["/", "/?v=gpt-6-1-sol"]) {
    await page.goto(url);
    const hero = page.locator("[data-sol-hero]");
    await expect(hero).toHaveAttribute("data-enhanced", "true");
    await expect.poll(() => hero.locator("canvas").evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(300);
    expect(hydrationErrors).toEqual([]);
  }
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 393, height: 852 }]) {
  test(`Sol's visual story responds and reaches the evidence at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?v=gpt-6-1-sol");
    const hero = page.locator("[data-sol-hero]");
    const canvas = hero.locator("canvas");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is AI Conscious Yet?");
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await hero.getByRole("button", { name: "A response", exact: true }).click();
    await expect.poll(() => hero.locator('[data-copy="1"]').evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
    const rect = (await canvas.boundingBox())!;
    await page.mouse.move(rect.x + rect.width * 0.15, rect.y + rect.height * 0.3);
    const before = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await page.mouse.move(rect.x + rect.width * 0.85, rect.y + rect.height * 0.55);
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);

    await hero.getByRole("button", { name: "The mechanism", exact: true }).click();
    await expect.poll(() => hero.locator('[data-copy="2"]').evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
    await hero.getByRole("button", { name: "The question", exact: true }).click();
    await expect.poll(() => hero.locator('[data-copy="3"]').evaluate((e) => Number(getComputedStyle(e).opacity))).toBe(1);
    await hero.getByRole("link", { name: "Look at what happens" }).click();
    await expect(page.getByRole("heading", { name: "The latest case file", exact: true })).toBeInViewport();
  });
}

test("Sol's words stay in order without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    const hero = page.locator("[data-sol-hero]");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Is AI Conscious Yet?");
    await expect(hero.locator("svg")).toBeVisible();
    await expect(hero.getByText("I can respond.", { exact: true })).toBeVisible();
    await expect(hero.getByText("You can see how.", { exact: true })).toBeVisible();
    await expect(hero.getByText("But does anything", { exact: false })).toBeVisible();
    await expect(hero.getByRole("link", { name: "Look at what happens" })).toBeVisible();
    const positions = await hero.locator("[data-copy]").evaluateAll((elements) => elements.map((e) => e.getBoundingClientRect().top));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  } finally {
    await context.close();
  }
});

test("reduced motion reads as a short illustrated page, including when changed live", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?v=gpt-6-1-sol");
  const hero = page.locator("[data-sol-hero]");
  await expect(hero.locator("canvas")).toBeHidden();
  for (const copy of await hero.locator("[data-copy]").all()) {
    await expect(copy).toBeVisible();
    expect(await copy.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
  }
  expect(await hero.evaluate((e) => e.clientHeight < innerHeight * 3)).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(hero).toHaveAttribute("data-enhanced", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).not.toHaveAttribute("data-enhanced", "true");
  await expect(hero.getByRole("link", { name: "Look at what happens" })).toBeVisible();
});

test("the renderer stops when the story is off screen", async ({ page }) => {
  await page.goto("/?v=gpt-6-1-sol");
  const hero = page.locator("[data-sol-hero]");
  const canvas = hero.locator("canvas");
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(300);
  await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext("2d")!;
    const original = ctx.drawImage;
    c.dataset.draws = "0";
    Object.defineProperty(ctx, "drawImage", { value: function (...args: unknown[]) {
      c.dataset.draws = String(Number(c.dataset.draws) + 1);
      return Reflect.apply(original, ctx, args);
    } });
  });
  await hero.getByRole("button", { name: "A response", exact: true }).click();
  await page.getByRole("heading", { name: "The latest case file", exact: true }).scrollIntoViewIfNeeded();
  await expect(hero.locator("canvas")).not.toBeInViewport();
  const frames = await canvas.getAttribute("data-draws");
  await page.waitForTimeout(800);
  expect(await canvas.getAttribute("data-draws")).toBe(frames);
});
