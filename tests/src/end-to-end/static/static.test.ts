import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import {
  BASIC_BLOCKS_STATIC_URL,
  BASIC_BLOCKS_URL,
  STATIC_URL,
} from "../../utils/const.js";

test.describe("Check static rendering", () => {
  test("Check static rendering", async ({ page }) => {
    await page.goto(STATIC_URL);
    await page.waitForTimeout(500);
    expect(await page.screenshot()).toMatchSnapshot("static-rendering.png");
  });

  test("Check static rendering visually matches live editor", async ({
    page,
  }) => {
    await page.goto(BASIC_BLOCKS_URL);
    await page.waitForLoadState("networkidle");
    expect(
      await page.screenshot({
        fullPage: true,
        mask: [
          // Mask video and audio elements as these will look different as they
          // load, causing test failures as the amount loaded isn't consistent
          // across test runs.
          await page.locator("video"),
          await page.locator("audio"),
          // Mask elements which we expect to be different between the live
          // editor and static screenshots.
          await page.locator('input[type="checkbox"]'),
          await page.locator(".bn-toggle-button"),
        ],
        scale: "css",
      }),
    ).toMatchSnapshot("static-rendering-equality.png");

    await page.goto(BASIC_BLOCKS_STATIC_URL);
    await page.waitForLoadState("networkidle");
    expect(
      await page.screenshot({
        fullPage: true,
        mask: [
          await page.locator("video"),
          await page.locator("audio"),
          await page.locator('input[type="checkbox"]'),
          await page.locator(".bn-toggle-button"),
        ],
        scale: "css",
      }),
    ).toMatchSnapshot("static-rendering-equality.png", {
      // Tiny allowance for variations. This is needed because of a strange
      // issue where a single hyphen in the image block's caption is different
      // between the live and static screenshots. This issue is even consistent
      // across browser.
      maxDiffPixels: 10,
    });
  });
});
