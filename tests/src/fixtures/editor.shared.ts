/* eslint-disable no-empty-pattern -- Vitest requires destructured fixture dependencies. */
import { test as base, type TestAPI } from "vite-plus/test";
import type * as nodeCommands from "../commands/node/index.js";
import type { SetupEditor } from "../commands/node/setupEditor.js";

/** Baseline fixtures used in both Node and Browser Mode. */
export type SharedContext = { setupEditor: SetupEditor } & typeof nodeCommands;

// Browser setup also registers these fixtures. Load the editor only when a
// fixture runs so each suite can mock editor modules before their first import.
const baseTest: TestAPI<Omit<SharedContext, "testResolveFileUrl">> =
  base.extend<Omit<SharedContext, "testResolveFileUrl">>({
    compareDocuments: async ({}, use) => {
      const { compareDocuments } =
        await import("../commands/node/compareDocuments.js");
      await use(compareDocuments);
    },
    selectText: async ({}, use) => {
      const { selectText } = await import("../commands/node/selectText.js");
      await use(selectText);
    },
    addIdsToBlocks: async ({}, use) => {
      const { addIdsToBlocks } =
        await import("../commands/node/formatConversion.js");
      await use(addIdsToBlocks);
    },
    partialBlockToBlockForTesting: async ({}, use) => {
      const { partialBlockToBlockForTesting } =
        await import("../commands/node/formatConversion.js");
      await use(partialBlockToBlockForTesting);
    },
    partialBlocksToBlocksForTesting: async ({}, use) => {
      const { partialBlocksToBlocksForTesting } =
        await import("../commands/node/formatConversion.js");
      await use(partialBlocksToBlocksForTesting);
    },
    isPdf: async ({}, use) => {
      const { isPdf } = await import("../commands/node/isPdf.js");
      await use(isPdf);
    },
    testODTDocumentAgainstSnapshot: async ({}, use) => {
      const { testODTDocumentAgainstSnapshot } =
        await import("../commands/node/testODTDocumentAgainstSnapshot.js");
      await use(testODTDocumentAgainstSnapshot);
    },
    setupEditor: async ({ onTestFinished }, use) => {
      const { createSetupEditor } =
        await import("../commands/node/setupEditor.js");
      await use(createSetupEditor(onTestFinished));
    },
  });

export const sharedTest = baseTest.extend(
  "testResolveFileUrl",
  { scope: "file" },
  async () => {
    const { testResolveFileUrl } =
      await import("../commands/node/testResolveFileUrl.js");
    return testResolveFileUrl;
  },
);
