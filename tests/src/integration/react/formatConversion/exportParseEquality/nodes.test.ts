import { describe } from "vite-plus/test";
import type {} from "../../../../../vitestSetup.node-fixtures.js";

import { testSchema } from "../../testSchema.js";
import { testExportParseEqualityNodes } from "../../../shared/formatConversion/exportParseEquality/exportParseEqualityTestExecutors.js";
import { exportCases } from "../export/exportTestInstances.js";

// Node round-tripping uses the schema without rendering a React view or
// dispatching changes to the editor.
const it = globalThis.it.extend(
  "roundTripEditor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../../commands/node/setupEditor.js");
    const setupEditor = createSetupEditor(onCleanup);
    const { editor } = await setupEditor({
      schema: testSchema,
      trailingBlock: false,
    });
    return editor;
  },
);

describe("Export/parse equality tests (TipTap nodes)", () => {
  for (const testCase of exportCases) {
    it(`${testCase.name}`, ({ roundTripEditor }) => {
      testExportParseEqualityNodes(roundTripEditor, testCase);
    });
  }
});
