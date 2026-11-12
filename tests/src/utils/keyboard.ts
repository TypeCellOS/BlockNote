import type { BrowserCommand } from "vite-plus/test/node";

declare global {
  interface Window {
    __blockNoteWaitForEditorFocus(): Promise<void>;
  }
}

/**
 * Sends a Playwright key press after pending ProseMirror focus/selection
 * reconciliation in the test iframe has settled. Requires the shared browser
 * setup, which installs the reconciliation wait function.
 * Accepts Playwright key names and chords, such as "Tab" or "Shift+ArrowDown".
 * The native screen-reader configuration registers a speech-capturing version
 * under the same command name.
 *
 * @example
 * await commands.pressKey("ArrowDown");
 */
export const pressKey: BrowserCommand<[key: string]> = async (context, key) => {
  const frame = await context.frame();
  await frame.evaluate(() => window.__blockNoteWaitForEditorFocus());
  await context.page.keyboard.press(key);
};
