import App from "@examples/09-ai/01-minimal/src/App";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import {
  EDITOR_SELECTOR,
  PARAGRAPH_SELECTOR,
  SLASH_MENU_SELECTOR,
} from "../../utils/const.js";
import { expectElement, waitForSelector } from "../../utils/editor.js";

beforeEach(async () => {
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
});

describe("AI menu appearance", () => {
  // Every AI menu item is `size: "small"`. A `min-height` meant for full-size
  // items used to clamp them to the full row height, stretching the whole menu
  // (#2909) - these baselines are what catches that.
  test("renders compact items while prompting and after an error", async ({
    onTestFinished,
  }) => {
    // Work from the first block, so the menu opens near the top of the tester
    // iframe rather than below its fold.
    await userEvent.click(
      await waitForSelector(`${EDITOR_SELECTOR} ${PARAGRAPH_SELECTOR}`),
    );
    await userEvent.keyboard("{End}/");
    await userEvent.keyboard("ai");
    await expect
      .poll(
        () =>
          document.querySelector(
            `${SLASH_MENU_SELECTOR} [aria-selected="true"]`,
          )?.textContent,
      )
      .toContain("Ask AI");
    await userEvent.keyboard("{Enter}");

    const aiMenu = await waitForSelector(".bn-combobox");
    const input = await waitForSelector('input[name="ai-prompt"]');
    await expect.poll(() => document.activeElement).toBe(input);
    await document.fonts.ready;
    await expectElement(aiMenu).toMatchScreenshot("ai-menu-prompt-items");

    // Exercise the real prompt submission, but fail the request rather than
    // depending on the time it takes an unavailable AI backend to respond.
    const fetch = globalThis.fetch;
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (...args) => {
        const [resource] = args;
        const url =
          resource instanceof Request ? resource.url : String(resource);
        if (url.endsWith("/regular/streamText")) {
          return new Response("AI backend unavailable", { status: 503 });
        }
        return fetch(...args);
      });
    onTestFinished(() => {
      request.mockRestore();
    });
    await userEvent.keyboard("Write a poem{Enter}");
    await waitForSelector(".bn-combobox-error");
    await expect.poll(() => aiMenu.textContent).toContain("Retry");
    await expectElement(aiMenu).toMatchScreenshot("ai-menu-error-items");
  });
});
