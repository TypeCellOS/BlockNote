import App from "@examples/09-ai/01-minimal/src/App";
import { beforeEach, describe, expect, test } from "vite-plus/test";
import { page, userEvent } from "../../utils/context.js";
import { expectElement, sleep, waitForSelector } from "../../utils/editor.js";
import { renderEditor } from "../../utils/render.js";

beforeEach(async () => {
  // Use a small viewport so the editor content requires scrolling.
  await page.viewport(800, 400);
  await renderEditor(<App />);
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
    await sleep(200);

    // Record the scroll position before opening the AI menu
    const scrollYBefore = window.scrollY;

    // Sanity check: we should actually be scrolled down
    expect(scrollYBefore).toBeGreaterThan(0);

    // Open the AI menu via the slash command
    // First, focus back on the editor at the last paragraph
    await userEvent.click(lastParagraph);
    await sleep(100);

    // Type /ai to open the slash menu and select the AI option
    await userEvent.keyboard("/ai");
    await sleep(300);

    // Wait for the suggestion menu to appear
    await waitForSelector(".bn-suggestion-menu");

    // Click the AI suggestion menu item to open the AI menu
    const aiMenuItem = await waitForSelector(
      ".bn-suggestion-menu .bn-suggestion-menu-item",
    );
    await userEvent.click(aiMenuItem);

    // Wait for the AI menu (combobox input) to appear
    const aiMenuInput = await waitForSelector(
      ".bn-combobox-input input, .bn-combobox input",
    );

    // Brief wait for any scroll side effects to take place
    await sleep(300);

    // Screenshot after opening AI menu
    await expectElement(document.body).toMatchScreenshot(
      "ai_menu_scroll_position",
    );

    // Check that the scroll position has not jumped to the top
    const scrollYAfter = window.scrollY;
    expect(scrollYAfter).toBeGreaterThan(0);
    expect(scrollYAfter).toBeGreaterThanOrEqual(scrollYBefore * 0.2);

    // Verify the AI menu input is actually focused
    expect(document.activeElement).toBe(aiMenuInput);
  });
});
