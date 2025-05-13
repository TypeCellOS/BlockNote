import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { copyTestInstancesHTML } from "./copyTestInstances.js";

// Tests for verifying content that gets put on the clipboard when copying
// within the editor. Used for as many cases as possible to ensure each block or
// set of blocks is correctly converted into different types of clipboard data.
describe("Copy tests (HTML)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const { testCase, executeTest } of copyTestInstancesHTML) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
