import { pressKey } from "./keyboard.js";
import type { BrowserCommand } from "vite-plus/test/node";
import type {} from "./positionalMouse.js";

type ReaderRequest =
  | { action: "start"; selector?: string }
  | { action: "pressKey"; key: string }
  | { action: "getTranscript" }
  | { action: "stop" };

type ReaderResponse =
  | { type: "complete" }
  | { type: "transcript"; transcript: string[] };

type CommandContext = Parameters<BrowserCommand>[0];

const screenReader = {
  async start(context: CommandContext, selector?: string) {
    // GuidePup cannot initialize on Linux; load only for an actual native session.
    const guidepup = await import("@guidepup/guidepup");
    const reader = guidepup.screenReader;
    await reader.start();
    try {
      if (process.platform === "darwin") {
        await guidepup.macOSActivate("Playwright");
      } else {
        await guidepup.windowsActivate(
          "chrome.exe",
          "Google Chrome for Testing",
        );
      }
      await context.page.bringToFront();
      const frame = await context.frame();
      if (selector !== undefined) {
        await frame.locator(selector).focus();
      }
      if (process.platform === "darwin") {
        await guidepup.voiceOver.perform(
          guidepup.voiceOver.keyboardCommands.moveCursorToKeyboardFocus,
        );
      }
      await reader.clearSpokenPhraseLog();
    } catch (error) {
      await reader.stop();
      throw error;
    }
  },
  async stop() {
    await (await import("@guidepup/guidepup")).screenReader.stop();
  },
  async getTranscript() {
    return (await import("@guidepup/guidepup")).screenReader.spokenPhraseLog();
  },
  async pressKey(context: CommandContext, key: string) {
    await (
      await import("@guidepup/guidepup")
    ).screenReader.capture(() => pressKey(context, key));
  },
};

/** Internal RPC bridge; reader behavior and lifecycle live in the object above. */
export const screenReaderCommand: BrowserCommand<
  [ReaderRequest],
  ReaderResponse
> = async (context, request) => {
  switch (request.action) {
    case "start":
      await screenReader.start(context, request.selector);
      return { type: "complete" };
    case "pressKey":
      await screenReader.pressKey(context, request.key);
      return { type: "complete" };
    case "getTranscript":
      return {
        type: "transcript",
        transcript: await screenReader.getTranscript(),
      };
    case "stop":
      await screenReader.stop();
      return { type: "complete" };
  }
};
