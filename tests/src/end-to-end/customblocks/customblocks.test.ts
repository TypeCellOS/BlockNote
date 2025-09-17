import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import {
  CUSTOM_BLOCKS_REACT_URL,
  CUSTOM_BLOCKS_VANILLA_URL,
} from "../../utils/const.js";
import { compareDocToSnapshot } from "../../utils/editor.js";

test.describe("Check custom block functionality", () => {
  test("Should be able to interactively update vanilla custom blocks", async ({
    page,
  }) => {
    await page.goto(CUSTOM_BLOCKS_VANILLA_URL);

    await page.locator("select").selectOption("info");
    await page.waitForTimeout(500);

    await compareDocToSnapshot(page, "vanillaInteractivity");
    expect(await page.screenshot()).toMatchSnapshot(
      "vanilla-interactivity.png",
    );
  });

  test("Should be able to interactively update React custom blocks", async ({
    page,
  }) => {
    await page.goto(CUSTOM_BLOCKS_REACT_URL);

    await page.locator("select").selectOption("info");
    await page.waitForTimeout(500);

    await compareDocToSnapshot(page, "reactInteractivity");
    expect(await page.screenshot()).toMatchSnapshot("react-interactivity.png");
  });
});
