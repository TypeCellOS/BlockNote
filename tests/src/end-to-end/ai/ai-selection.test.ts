import { expect } from "@playwright/test";
import { test } from "../../setup/setupScript.js";
import { AI_URL } from "../../utils/const.js";
import { focusOnEditor } from "../../utils/editor.js";

const AI_BUTTON_SELECTOR = `[data-test="editwithAI"]`;

test.beforeEach(async ({ page }) => {
  await page.goto(AI_URL);
});

test.describe("AI toolbar button should preserve selection (issue #2525)", () => {
  test("Editor selection must be preserved after clicking the AI toolbar button", async ({
    page,
  }) => {
    await focusOnEditor(page);

    // Select text in the first paragraph
    await page.keyboard.press("Home");
    await page.keyboard.press("Shift+End");
    await page.waitForTimeout(500);

    // Record the PM selection before clicking
    const selBefore = await page.evaluate(() => {
      const pm = (window as any).ProseMirror;
      return { from: pm.state.selection.from, to: pm.state.selection.to };
    });
    expect(selBefore.to - selBefore.from).toBeGreaterThan(0);

    // Click the AI button using page.mouse to trigger real browser
    // focus-shift behavior (Playwright's locator.click() bypasses it)
    const aiButton = page.locator(AI_BUTTON_SELECTOR);
    await expect(aiButton).toBeVisible();
    const box = (await aiButton.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Wait for AI menu to appear
    await page
      .locator(".bn-combobox-input input, .bn-combobox input")
      .waitFor({ state: "visible", timeout: 3000 });

    // The PM selection must match what we had before clicking.
    // Without skipping refs.setReference for in-editor references while
    // FloatingFocusManager is active, floating-ui inserts a focus-return
    // element into the PM contenteditable, triggering its MutationObserver
    // and resetting the selection.
    const selAfter = await page.evaluate(() => {
      const pm = (window as any).ProseMirror;
      return { from: pm.state.selection.from, to: pm.state.selection.to };
    });
    expect(selAfter.from).toBe(selBefore.from);
    expect(selAfter.to).toBe(selBefore.to);
  });
});
