/* eslint-disable no-empty-pattern -- Vitest requires destructured fixture dependencies. */
import { test as base, type TestAPI } from "vite-plus/test";
import type * as nodeCommands from "../commands/node/index.js";
import type { SetupEditor } from "../commands/node/setupEditor.js";

/** Node fixtures: headless core editors, without a DOM, React, or skin styles. */
export type NodeContext = { setupEditor: SetupEditor } & typeof nodeCommands;

// Browser setup also registers these fixtures. Load the editor only when a
// fixture runs so each suite can mock editor modules before their first import.
export const test: TestAPI<NodeContext> = base.extend<NodeContext>({
  compareDocuments: async ({}, use) => {
    const { compareDocuments } =
      await import("../commands/node/compareDocuments.js");
    await use(compareDocuments);
  },
  selectText: async ({}, use) => {
    const { selectText } = await import("../commands/node/selectText.js");
    await use(selectText);
  },
  setupEditor: async ({ onTestFinished }, use) => {
    const { createSetupEditor } =
      await import("../commands/node/setupEditor.js");
    await use(createSetupEditor(onTestFinished));
  },
});
