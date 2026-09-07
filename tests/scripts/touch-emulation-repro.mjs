// Shows that Chromium drops a context's touch emulation (`hasTouch`) after any
// screenshot Playwright captures beyond the viewport, and that Playwright never
// re-arms it. This is why `tests/src/utils/restoreTouchEmulation.ts` exists.
// Reported as https://github.com/microsoft/playwright/issues/42607.
//
// Usage: node tests/scripts/touch-emulation-repro.mjs
// Expected on a fixed Playwright or Chromium: every line ends "1 -> 1".
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const pnpmDir = path.join(root, "node_modules/.pnpm");
const pwDir = readdirSync(pnpmDir).find((d) =>
  d.startsWith("playwright-core@"),
);
const { chromium } = createRequire(import.meta.url)(
  path.join(pnpmDir, pwDir, "node_modules/playwright-core"),
);

const browser = await chromium.launch();
console.log("chromium", browser.version());

const scenarios = [
  ["page.screenshot() (viewport only)", (page) => page.screenshot()],
  [
    "page.screenshot({ fullPage: true })",
    (page) => page.screenshot({ fullPage: true }),
  ],
  [
    "locator.screenshot() of a small element",
    (page) => page.locator("#small").screenshot(),
  ],
  [
    "locator.screenshot() of a tall element",
    (page) => page.locator("#tall").screenshot(),
  ],
];
for (const [label, action] of scenarios) {
  for (const isMobile of [true, false]) {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile,
      viewport: { width: 393, height: 727 },
    });
    const page = await context.newPage();
    await page.setContent(
      `<div id="small" style="height:100px">small</div><div id="tall" style="height:3000px">tall</div>`,
    );
    const before = await page.evaluate(() => navigator.maxTouchPoints);
    await action(page);
    const after = await page.evaluate(() => navigator.maxTouchPoints);
    console.log(
      `${label.padEnd(42)} isMobile=${String(isMobile).padEnd(5)} maxTouchPoints ${before} -> ${after}${after === 0 ? "   DROPPED" : ""}`,
    );
    await context.close();
  }
}

// The same over raw CDP, without Playwright's screenshot code: the flag alone does it.
for (const captureBeyondViewport of [false, true]) {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 393, height: 727 },
  });
  const page = await context.newPage();
  await page.setContent(`<div style="height:100px">x</div>`);
  const cdp = await context.newCDPSession(page);
  const before = await page.evaluate(() => navigator.maxTouchPoints);
  await cdp.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 100, height: 50, scale: 1 },
    captureBeyondViewport,
  });
  const after = await page.evaluate(() => navigator.maxTouchPoints);
  console.log(
    `raw CDP Page.captureScreenshot captureBeyondViewport=${String(captureBeyondViewport).padEnd(5)} maxTouchPoints ${before} -> ${after}${after === 0 ? "   DROPPED" : ""}`,
  );
  if (after === 0) {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
    console.log(
      `   re-sending Emulation.setTouchEmulationEnabled: maxTouchPoints ${await page.evaluate(() => navigator.maxTouchPoints)}`,
    );
  }
  await context.close();
}
await browser.close();
