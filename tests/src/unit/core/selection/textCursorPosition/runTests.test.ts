import { describe, it } from "vitest";

import { createTestEditor } from "../../createTestEditor.js";
import { testSchema } from "../../testSchema.js";
import {
  getTextCursorPositionTestInstancesEnd,
  getTextCursorPositionTestInstancesGetAndSet,
  getTextCursorPositionTestInstancesStart,
} from "./textCursorPositionTestInstances.js";

// Tests for setting and getting the position of the text cursor.
describe("Text cursor position (set and get)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const {
    testCase,
    executeTest,
  } of getTextCursorPositionTestInstancesGetAndSet) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Text cursor position (start)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const {
    testCase,
    executeTest,
  } of getTextCursorPositionTestInstancesStart) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});

describe("Text cursor position (end)", () => {
  const getEditor = createTestEditor(testSchema);

  for (const {
    testCase,
    executeTest,
  } of getTextCursorPositionTestInstancesEnd) {
    it(`${testCase.name}`, async () => {
      await executeTest(getEditor(), testCase);
    });
  }
});
