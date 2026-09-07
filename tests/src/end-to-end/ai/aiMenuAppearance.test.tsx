import App from "@examples/09-ai/01-minimal/src/App";
import { beforeEach, describe, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  EDITOR_SELECTOR,
  PARAGRAPH_SELECTOR,
  SLASH_MENU_SELECTOR,
} from "../../utils/const.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("AI menu appearance", () => {
  // Every AI menu item is `size: "small"`. A `min-height` meant for full-size
  // items used to clamp them to the full row height, stretching the whole menu
  // (#2909) - these baselines are what catches that.
  test("renders compact items while prompting and after an error", async () => {
    // Work from the first block, so the menu opens near the top of the tester
    // iframe rather than below its fold.
    await userEvent.click(
      await waitForSelector(`${EDITOR_SELECTOR} ${PARAGRAPH_SELECTOR}`),
    );
    await userEvent.keyboard("{End}/");
    await waitForSelector(SLASH_MENU_SELECTOR);
    await userEvent.keyboard("ai{Enter}");

    const aiMenu = await waitForSelector(".bn-combobox");
    await sleep(500); // The menu's open transition.
    await expectElement(aiMenu).toMatchScreenshot("ai-menu-prompt-items");

    // The example points at a local AI backend that isn't running in the test
    // container, so any prompt fails into the error state (Retry / Cancel).
    await userEvent.keyboard("Write a poem{Enter}");
    await waitForSelector(".bn-combobox-error", { timeout: 15000 });
    await sleep(500);
    await expectElement(aiMenu).toMatchScreenshot("ai-menu-error-items");
  });
});
