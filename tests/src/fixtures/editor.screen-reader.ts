import { test as base } from "./editor.js";
import {
  createSetupScreenReader,
  type SetupScreenReader,
} from "../commands/screen-reader/setupScreenReader.js";

/** Native-reader sessions are available only to this browser-fixture extension. */
export const test = base.extend<{
  setupScreenReader: SetupScreenReader;
}>({
  setupScreenReader: async ({ onTestFinished }, use) => {
    await use(createSetupScreenReader(onTestFinished));
  },
});
