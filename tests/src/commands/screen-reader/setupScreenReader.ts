import type { TestContext } from "vite-plus/test";
import { commands, type Locator } from "vite-plus/test/browser";
import type { BrowserCommand } from "vite-plus/test/node";

type ReaderTransport = {
  [
    Name in keyof typeof import("./transport.js")
  ]: (typeof import("./transport.js"))[Name] extends BrowserCommand<
    infer Args,
    infer Result
  >
    ? (...args: Args) => Promise<Awaited<Result>>
    : never;
};

// Internal RPC command, not exported as a helper or fixture. Only the session
// below exposes reader interaction, and its lifecycle belongs to this fixture.
const reader = commands as typeof commands & ReaderTransport;

/** Binds native reader cleanup to the current test; consumed by its fixture. */
export function createSetupScreenReader(
  onFinished: TestContext["onTestFinished"],
) {
  /**
   * Starts the native screen reader and returns its speech-aware keyboard and
   * transcript interface. Cleanup is automatic, including when assertions fail.
   * Available only in the native screen-reader runner: this controls the user's
   * real desktop reader and foreground browser, not a simulated ARIA tree.
   *
   * Render first. Supply a locator to focus it during startup, or establish focus
   * beforehand and omit it. Use the returned `pressKey` for speech capture;
   * the ordinary keyboard fixture does not record announcements.
   *
   * @example
   * const { getTranscript, pressKey } = await setupScreenReader(textbox);
   * await pressKey("ArrowDown");
   * const transcript = await getTranscript();
   * expect(transcript.length).toBeGreaterThan(0);
   * expect(transcript).toMatchSnapshot();
   */
  async function setupScreenReader(target?: Locator) {
    await reader.screenReaderCommand({
      action: "start",
      selector: target?.selector,
    });
    onFinished(async () => {
      await reader.screenReaderCommand({ action: "stop" });
    });
    return {
      async getTranscript(this: void) {
        const result = await reader.screenReaderCommand({
          action: "getTranscript",
        });
        if (result.type !== "transcript") {
          throw new Error(
            "Screen reader transport did not return a transcript",
          );
        }
        return result.transcript;
      },
      async pressKey(this: void, key: string) {
        await reader.screenReaderCommand({ action: "pressKey", key });
      },
    };
  }
  return setupScreenReader;
}

export type SetupScreenReader = ReturnType<typeof createSetupScreenReader>;
