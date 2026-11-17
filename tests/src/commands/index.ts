/* eslint-disable no-empty-pattern -- Vitest requires destructured fixture dependencies. */
import type { TestAPI } from "vite-plus/test";
import * as browserCommands from "./browser/index.js";
import { createSetupEditor, type SetupEditor } from "./browser/setupEditor.js";
import { commands as nodeCommands, page } from "./transport.js";

export type CommandContext = Pick<
  typeof nodeCommands,
  keyof typeof import("../screen-reader/commands.js")
> &
  typeof browserCommands & {
    page: typeof page;
    setupEditor: SetupEditor;
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
  startReader: async ({}, use) => {
    await use(nodeCommands.startReader);
  },
  readTranscript: async ({}, use) => {
    await use(nodeCommands.readTranscript);
  },
  stopReader: async ({}, use) => {
    await use(nodeCommands.stopReader);
  },
  focusUntil: async ({}, use) => {
    await use(browserCommands.focusUntil);
  },
  readFocusOutline: async ({}, use) => {
    await use(browserCommands.readFocusOutline);
  },
  readAriaSnapshot: async ({}, use) => {
    await use(browserCommands.readAriaSnapshot);
  },
  assertFocusOutline: async ({}, use) => {
    await use(browserCommands.assertFocusOutline);
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
