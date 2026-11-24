import App from "@examples/01-basic/testing/src/App";
import { describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import {
  DRAG_HANDLE_SELECTOR,
  EDITOR_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import { expectElement, waitForSelector } from "../../utils/editor.js";
import { moveMouseOverElement } from "../../utils/mouse.js";

describe("Basic placeholder functionality", () => {
  test("should show placeholder on load", async () => {
    await render(<App />);
    const paragraph = await waitForSelector(
      `${EDITOR_SELECTOR} ${PARAGRAPH_SELECTOR}`,
    );

    await expect
      .poll(() => getComputedStyle(paragraph, "::after").content)
      .toContain("Enter text or type '/' for commands");
    // The baseline includes the side menu revealed by hovering the block.
    await moveMouseOverElement(paragraph);
    await expectElement(
      await waitForSelector(DRAG_HANDLE_SELECTOR),
    ).toBeVisible();
    await document.fonts.ready;
    await expectElement(document.body).toMatchScreenshot("initial-placeholder");
  });
});
