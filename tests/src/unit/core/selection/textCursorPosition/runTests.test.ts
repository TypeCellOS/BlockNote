import { describe } from "vite-plus/test";
import type {} from "../../../../../vitestSetup.node-fixtures.js";

import { testSchema } from "../../testSchema.js";
import {
  getTextCursorPositionTestInstancesEnd,
  getTextCursorPositionTestInstancesGetAndSet,
  getTextCursorPositionTestInstancesStart,
} from "./textCursorPositionTestInstances.js";

const options = { schema: testSchema, trailingBlock: false };

// Tests for setting and getting the position of the text cursor.
describe("Text cursor position (set and get)", () => {
  for (const {
    testCase,
    executeTest,
  } of getTextCursorPositionTestInstancesGetAndSet) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      await executeTest(editor, testCase);
    });
  }
});

describe("Text cursor position (start)", () => {
  for (const {
    testCase,
    executeTest,
  } of getTextCursorPositionTestInstancesStart) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      await executeTest(editor, testCase);
    });
  }
});

describe("Text cursor position (end)", () => {
  for (const {
    testCase,
    executeTest,
  } of getTextCursorPositionTestInstancesEnd) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      await executeTest(editor, testCase);
    });
  }
});
