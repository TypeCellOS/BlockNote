import App from "@examples/09-ai/01-minimal/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { resizeViewportForTest } from "../../commands/browser/screenshotFull.js";
import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import { expectElement, waitForSelector } from "../../utils/editor.js";

beforeEach(async () => {
  // Use a small viewport so the editor content requires scrolling.
  await resizeViewportForTest(800, 400);
  await render(<App />);
  await waitForSelector(EDITOR_SELECTOR);
  await document.fonts.ready;
});

describe("AI Menu Scroll Regression", () => {
  test("opening the AI menu should not scroll the page to the top", async () => {
    // Click on the last paragraph so the cursor is near the bottom of the content
    const paragraphs = document.querySelectorAll(
      "[data-content-type='paragraph']",
    );
    const lastParagraph = paragraphs[paragraphs.length - 1] as HTMLElement;
    await userEvent.click(lastParagraph);

    // Ensure the page is scrolled down (editor puts cursor near bottom of content)
    // We scroll down explicitly to make sure we're not at the top
    window.scrollTo(0, document.body.scrollHeight);
    await expect.poll(() => window.scrollY).toBeGreaterThan(0);

    // Record the scroll position before opening the AI menu
    const scrollYBefore = window.scrollY;

    // Sanity check: we should actually be scrolled down
    expect(scrollYBefore).toBeGreaterThan(0);

    // Open the AI menu via the slash command
    // First, focus back on the editor at the last paragraph
    await userEvent.click(lastParagraph);
    await window.__blockNoteWaitForEditorFocus();

    // Type /ai to open the slash menu and select the AI option
    await userEvent.keyboard("/ai");

    // Click the AI suggestion menu item to open the AI menu
    await page.getByRole("option", { name: /^Ask AI\b/ }).click();

    const aiMenuInput = await waitForSelector('input[name="ai-prompt"]:focus');
    // The old scroll regression happened on autofocus. Let that paint before
    // measuring, but capture the screenshot only after checking scroll and focus.
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    // Check that the scroll position has not jumped to the top
    const scrollYAfter = window.scrollY;
    expect(scrollYAfter).toBeGreaterThan(0);
    expect(scrollYAfter).toBeGreaterThanOrEqual(scrollYBefore * 0.2);

    // Verify the AI menu input is actually focused
    expect(document.activeElement).toBe(aiMenuInput);

    await expectElement(document.body).toMatchScreenshot(
      "ai_menu_scroll_position",
    );
  });
});
