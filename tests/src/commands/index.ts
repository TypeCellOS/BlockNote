/* eslint-disable no-empty-pattern -- Vitest requires destructured fixture dependencies. */
import type { TestAPI } from "vite-plus/test";
import * as browserCommands from "./browser/index.js";
import { createSetupEditor, type SetupEditor } from "./browser/setupEditor.js";
import {
  createSetupScreenReader,
  type SetupScreenReader,
} from "./browser/setupScreenReader.js";
import { commands as nodeCommands, page } from "./transport.js";

export type CommandContext = Pick<
  typeof nodeCommands,
  keyof typeof import("./node/index.js")
> &
  typeof browserCommands & {
    page: typeof page;
    setupEditor: SetupEditor;
    setupScreenReader: SetupScreenReader;
  };

/** Top-level test fixtures; pass this collection to test.extend unchanged. */
export const commands: Required<
  Parameters<TestAPI<CommandContext>["scoped"]>[0]
> = {
  page,
  pressKey: async ({}, use) => {
    await use(nodeCommands.pressKey);
  },
  positionalMouse: async ({}, use) => {
    await use(nodeCommands.positionalMouse);
  },
  imeComposition: async ({}, use) => {
    await use(nodeCommands.imeComposition);
  },
  restoreTouchEmulation: async ({}, use) => {
    await use(nodeCommands.restoreTouchEmulation);
  },
  setupScreenReader: async ({ onTestFinished }, use) => {
    await use(createSetupScreenReader(onTestFinished));
  },
  focusUntil: async ({}, use) => {
    await use(browserCommands.focusUntil);
  },
  captureFocusOutline: async ({}, use) => {
    await use(browserCommands.captureFocusOutline);
  },
  readAriaSnapshot: async ({}, use) => {
    await use(browserCommands.readAriaSnapshot);
  },
  selectText: async ({}, use) => {
    await use(browserCommands.selectText);
  },
  setupEditor: async ({ onTestFinished }, use) => {
    await use(createSetupEditor(onTestFinished));
  },
  runAxe: async ({ annotate }, use) => {
    await use(async (scope) => {
      const results = await browserCommands.runAxe(scope);
      for (const result of results.incomplete) {
        for (const node of result.nodes) {
          await annotate(
            `axe manual review: ${result.id} — ${result.help}\nTarget: ${JSON.stringify(node.target)}\n${node.failureSummary ?? ""}\n${result.helpUrl}`,
            "warning",
          );
        }
      }
      return results;
    });
  },
};
