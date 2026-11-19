/* eslint-disable no-empty-pattern -- Vitest requires destructured fixture dependencies. */
import { test as base, type TestAPI } from "vite-plus/test";
import * as nodeCommands from "../commands/node/index.js";
import {
  createSetupEditor,
  type SetupEditor,
} from "../commands/node/setupEditor.js";

/** Node fixtures: headless core editors, without a DOM, React, or skin styles. */
export type NodeContext = { setupEditor: SetupEditor } & typeof nodeCommands;

export const test: TestAPI<NodeContext> = base.extend<NodeContext>({
  compareDocuments: async ({}, use) => {
    await use(nodeCommands.compareDocuments);
  },
  selectText: async ({}, use) => {
    await use(nodeCommands.selectText);
  },
  setupEditor: async ({ onTestFinished }, use) => {
    await use(createSetupEditor(onTestFinished));
  },
});
