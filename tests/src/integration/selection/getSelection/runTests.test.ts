import { describe } from "vite-plus/test";
import type {} from "../../../../vitestSetup.node-fixtures.js";

import { testSchema } from "../../support/testSchema.js";
import {
  getSelectionTestInstancesRegular,
  getSelectionTestInstancesCutblocks,
} from "./getSelectionTestInstances.js";

const options = {
  schema: testSchema,
  trailingBlock: false,
  tables: {
    splitCells: true,
    cellBackgroundColor: true,
    cellTextColor: true,
    headers: true,
  },
};

// Tests for getting the BlockNote selection from a given Prosemirror
// selection.
describe("Get selection tests (regular)", () => {
  for (const { testCase, executeTest } of getSelectionTestInstancesRegular) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      await executeTest(editor, testCase);
    });
  }
});

describe("Get selection tests (cut blocks)", () => {
  for (const { testCase, executeTest } of getSelectionTestInstancesCutblocks) {
    it(`${testCase.name}`, async ({ setupEditor }) => {
      const { editor } = await setupEditor(options);
      await executeTest(editor, testCase);
    });
  }
});
