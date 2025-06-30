import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import {
  exportTestInstancesDocX,
  exportTestInstancesDocXOptions,
} from "./exportTestInstances.js";

describe("Export tests (DocX)", () => {
  const getEditor = createTestEditor();

  for (const { testCase, executeTest } of exportTestInstancesDocX) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Export tests (DocX with options)", () => {
  const getEditor = createTestEditor();

  for (const { testCase, executeTest } of exportTestInstancesDocXOptions) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
