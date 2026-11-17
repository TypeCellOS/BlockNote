import { pressKey } from "../commands/node/keyboard.js";
import type { BrowserCommand } from "vite-plus/test/node";
import type {} from "../commands/node/positionalMouse.js";

// Import only on native runs: GuidePup cannot initialize on Linux.
async function reader() {
  return (await import("@guidepup/guidepup")).screenReader;
}

/**
 * Starts the native reader, activates the test browser, and focuses the supplied
 * selector in the test iframe. Synchronizes VoiceOver's cursor with keyboard
 * focus and clears startup speech so the transcript contains only the scenario.
 * Available only in the native screen-reader configuration; render first.
 * Use only to test actual spoken announcements that browser ARIA/keyboard tests
 * cannot prove. This controls the real desktop reader and foreground browser;
 * do not use in ordinary Docker browser tests. Register cleanup before starting.
 *
 * @example
 * onTestFinished(async () => { await stopReader(); });
 * await startReader(page.getByRole("textbox").selector);
 * await pressKey("ArrowDown");
 * expect((await readTranscript()).length).toBeGreaterThan(0);
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
 * its focus-reconciliation wait. Registered as the top-level {@link pressKey} by the
 * native screen-reader configuration, so navigation can be shared with browser
 * tests without a separate keyboard helper.
 * Use the public {@link pressKey} fixture after {@link startReader}, not this implementation
 * directly; use browser tests when no spoken output needs verification.
 *
 * @example
 * await startReader(page.getByRole("textbox").selector);
 * await pressKey("Tab");
 * expect((await readTranscript()).length).toBeGreaterThan(0);
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
 * Use for real announcement assertions after {@link startReader} and keyboard actions,
 * not as a replacement for browser accessibility-tree or focus assertions.
 *
 * @example
 * try {
 *   const transcript = await readTranscript();
 *   expect(transcript.length).toBeGreaterThan(0);
 *   expect(transcript).toMatchSnapshot();
 * } finally {
 *   await stopReader();
 * }
 */
export const readTranscript: BrowserCommand<[], string[]> = async () =>
  (await reader()).spokenPhraseLog();
/**
 * Stops the native reader after a test that started it. Always register cleanup
 * before calling {@link startReader}, so assertions failing early do not leave the real
 * desktop reader running. Available only in the native screen-reader runner.
 *
 * @example
 * onTestFinished(async () => {
 *   try {
 *     const transcript = await readTranscript();
 *     expect(transcript.length).toBeGreaterThan(0);
 *   } finally {
 *     await stopReader();
 *   }
 * });
 */
export const stopReader: BrowserCommand<[]> = async () =>
  (await reader()).stop();
