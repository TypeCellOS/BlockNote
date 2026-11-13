import { pressKey } from "../src/utils/keyboard.js";
import type { BrowserCommand } from "vite-plus/test/node";
import type {} from "../src/utils/positionalMouse.js";

// Import only on native runs: GuidePup cannot initialize on Linux.
async function reader() {
  return (await import("@guidepup/guidepup")).screenReader;
}

/**
 * Starts the native reader, activates the test browser, and focuses the supplied
 * selector in the test iframe. Synchronizes VoiceOver's cursor with keyboard
 * focus and clears startup speech so the transcript contains only the scenario.
 * Available only in the native screen-reader configuration; render first.
 *
 * @example
 * await commands.startReader(page.getByRole("textbox").selector);
 */
export const startReader: BrowserCommand<[selector: string]> = async (
  context,
  selector,
) => {
  const guidepup = await import("@guidepup/guidepup");
  await guidepup.screenReader.start();
  if (process.platform === "darwin") {
    await guidepup.macOSActivate("Playwright");
  } else {
    await guidepup.windowsActivate("chrome.exe", "Google Chrome for Testing");
  }
  await context.page.bringToFront();
  const frame = await context.frame();
  await frame.locator(selector).focus();
  if (process.platform === "darwin") {
    await guidepup.voiceOver.perform(
      guidepup.voiceOver.keyboardCommands.moveCursorToKeyboardFocus,
    );
  }
  await guidepup.screenReader.clearSpokenPhraseLog();
};

/**
 * Captures native speech while executing the shared keyboard command, including
 * its focus-reconciliation wait. Registered as `commands.pressKey` by the
 * native screen-reader configuration, so navigation can be shared with browser
 * tests without a separate keyboard helper.
 */
export const screenReaderPressKey: BrowserCommand<[key: string]> = async (
  context,
  key,
) => {
  await (await reader()).capture(() => pressKey(context, key));
};

/**
 * Returns the running native reader's spoken phrase log. Assert that it is
 * nonempty before comparing it with a Vitest snapshot in the consuming test.
 * Reading the log does not stop the reader; cleanup belongs in `finally`.
 */
export const readTranscript: BrowserCommand<[]> = async () =>
  (await reader()).spokenPhraseLog();
/**
 * Stops the native reader. Call in an `afterEach` hook's `finally` block so
 * assertion or transcript failures do not leave the reader running.
 */
export const stopReader: BrowserCommand<[]> = async () =>
  (await reader()).stop();
