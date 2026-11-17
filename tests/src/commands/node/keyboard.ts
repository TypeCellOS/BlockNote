import type { BrowserCommand } from "vite-plus/test/node";

// eslint-disable-next-line no-unused-vars -- Type-only import for the JSDoc link.
import type { userEvent } from "../transport.js";
// eslint-disable-next-line no-unused-vars -- Type-only import for the JSDoc link.
import type { selectText } from "../browser/selectText.js";

declare global {
  interface Window {
    __blockNoteWaitForEditorFocus(): Promise<void>;
  }
}

/**
 * Sends one real Playwright key press to the currently focused element after
 * pending ProseMirror focus/selection reconciliation has settled. Use for keyboard
 * navigation, shortcuts, and activation; use {@link userEvent.keyboard} for typing
 * plain text, and {@link selectText} for selection setup unrelated to keyboard behavior.
 *
 * Accepts Playwright key names/chords, such as "Tab", "Shift+Tab", or "Control+k".
 * Does not choose a target: establish focus first. Requires the shared browser
 * setup's reconciliation hook. In the native screen-reader configuration the same
 * fixture also captures speech; callers do not need a separate keyboard helper.
 *
 * @example
 * await page.getByRole("textbox").click();
 * await pressKey("Tab");
 * await expect.element(boldButton).toHaveFocus();
 * await pressKey("Enter");
 */
export const pressKey: BrowserCommand<[key: string]> = async (context, key) => {
  const frame = await context.frame();
  await frame.evaluate(() => window.__blockNoteWaitForEditorFocus());
  await context.page.keyboard.press(key);
};
