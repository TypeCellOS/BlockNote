import type { BrowserCommand } from "vite-plus/test/node";
import type { Page, Frame } from "@playwright/test";

declare module "vite-plus/test/node" {
  interface BrowserCommandContext {
    page: Page;
    frame(): Promise<Frame>;
  }
}

// Import only on native runs: GuidePup cannot initialize on Linux.
async function reader() {
  return (await import("@guidepup/guidepup")).screenReader;
}

export const startReader: BrowserCommand<[]> = async (context) => {
  const guidepup = await import("@guidepup/guidepup");
  await guidepup.screenReader.start();
  if (process.platform === "darwin") {
    await guidepup.macOSActivate("Playwright");
  } else {
    await guidepup.windowsActivate("chrome.exe", "Google Chrome for Testing");
  }
  await context.page.bringToFront();
  const frame = await context.frame();
  await frame
    .getByRole("button", { name: "Before editor", exact: true })
    .focus();
  if (process.platform === "darwin") {
    await guidepup.voiceOver.perform(
      guidepup.voiceOver.keyboardCommands.moveCursorToKeyboardFocus,
    );
  }
  await guidepup.screenReader.clearSpokenPhraseLog();
};

export const pressKey: BrowserCommand<[key: string]> = async (
  { page },
  key,
) => {
  if (process.env.BLOCKNOTE_SCREEN_READER) {
    return (await (await reader()).capture(() => page.keyboard.press(key)))
      .spokenPhrase;
  }
  await page.keyboard.press(key);
};

export const readTranscript: BrowserCommand<[]> = async () =>
  (await reader()).spokenPhraseLog();
export const stopReader: BrowserCommand<[]> = async () =>
  (await reader()).stop();
