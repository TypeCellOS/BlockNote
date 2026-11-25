/* eslint-disable no-empty-pattern -- Vitest requires destructured fixture dependencies. */
import type { TestAPI } from "vite-plus/test";
import { browserName } from "./browser/environment.js";
import type * as browserCommands from "./browser/index.js";
import { MOD, selectToLineEndKey } from "./browser/keyboard.js";
import type { SetupEditor } from "./browser/setupEditor.js";
import { commands as nodeCommands, page, userEvent } from "./transport.js";

// Browser-only fixtures extend the baseline in fixtures/editor.shared.ts.
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
  MOD,
  browserName,
  selectToLineEndKey,
  screenshotFull: async ({}, use) => {
    const { screenshotFull } = await import("./browser/screenshotFull.js");
    await use(screenshotFull);
  },
  decodeAndSample: async ({}, use) => {
    const { decodeAndSample } = await import("./browser/decodeAndSample.js");
    await use(decodeAndSample);
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
  mockVersioningMedia: async ({}, use) => {
    await use(nodeCommands.mockVersioningMedia);
  },
  restoreTouchEmulation: async ({}, use) => {
    await use(nodeCommands.restoreTouchEmulation);
  },
  focusUntil: async ({}, use) => {
    const { focusUntil } = await import("./browser/focus.js");
    await use(focusUntil);
  },
  captureFocusOutline: async ({}, use) => {
    const { captureFocusOutline } = await import("./browser/outline.js");
    await use(captureFocusOutline);
  },
  readAriaSnapshot: async ({}, use) => {
    const { readAriaSnapshot } = await import("./browser/ariaSnapshot.js");
    await use(readAriaSnapshot);
  },
  setupEditor: async ({ onTestFinished }, use) => {
    const { createSetupEditor } = await import("./browser/setupEditor.js");
    await use(createSetupEditor(onTestFinished));
  },
  runAxe: async ({ annotate }, use) => {
    const { runAxe } = await import("./browser/axe.js");
    await use(async (scope) => {
      const results = await runAxe(scope);
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
