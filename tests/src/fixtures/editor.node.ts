import { test as base } from "vite-plus/test";
import {
  createSetupEditor,
  type SetupEditor,
} from "../commands/node/setupEditor.js";

/** Node fixtures: mounts the core editor in jsdom, without React or skin styles. */
export const test = base.extend<{ setupEditor: SetupEditor }>({
  setupEditor: async ({ onTestFinished }, use) => {
    await use(createSetupEditor(onTestFinished));
  },
});
