/* eslint-disable no-empty-pattern -- Vitest requires destructured fixture dependencies. */
import type { TestAPI } from "vite-plus/test";
import * as browserCommands from "./browser/index.js";
import type { SetupEditor } from "./browser/setupEditor.js";
import { commands as nodeCommands, page, userEvent } from "./transport.js";

// Browser-only fixtures extend the baseline in fixtures/editor.node.ts.
export type CommandContext = Pick<
  typeof nodeCommands,
  keyof typeof import("./transport/index.js")
> &
  typeof browserCommands & {
    page: typeof page;
    userEvent: typeof userEvent;
    setupEditor: SetupEditor;
  };

/** Top-level test fixtures; pass this collection to test.extend unchanged. */
export const commands: Required<
  Parameters<TestAPI<CommandContext>["scoped"]>[0]
> = {
  page,
  userEvent,
  MOD: browserCommands.MOD,
  browserName: browserCommands.browserName,
  selectToLineEndKey: browserCommands.selectToLineEndKey,
  screenshotFull: async ({}, use) => {
    await use(browserCommands.screenshotFull);
  },
  pressKey: async ({}, use) => {
    await use(nodeCommands.pressKey);
  },
  positionalMouse: async ({}, use) => {
    await use(nodeCommands.positionalMouse);
  },
  imeComposition: async ({}, use) => {
    await use(nodeCommands.imeComposition);
  },
  mockCustomBlockImages: async ({}, use) => {
    await use(nodeCommands.mockCustomBlockImages);
  },
  restoreTouchEmulation: async ({}, use) => {
    await use(nodeCommands.restoreTouchEmulation);
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
  setupEditor: async ({ onTestFinished }, use) => {
    const { createSetupEditor } = await import("./browser/setupEditor.js");
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
