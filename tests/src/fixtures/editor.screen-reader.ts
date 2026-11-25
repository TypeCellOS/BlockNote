import type { TestAPI } from "vite-plus/test";
import { test as base, type BrowserContext } from "./editor.js";
import {
  createSetupScreenReader,
  type SetupScreenReader,
} from "../commands/screen-reader/setupScreenReader.js";

/** Native-reader sessions are available only to this browser-fixture extension. */
export type ScreenReaderContext = BrowserContext & {
  setupScreenReader: SetupScreenReader;
};

export const test: TestAPI<ScreenReaderContext> = base.extend<{
  setupScreenReader: SetupScreenReader;
}>({
  setupScreenReader: async ({ onTestFinished }, use) => {
    await use(createSetupScreenReader(onTestFinished));
  },
});
