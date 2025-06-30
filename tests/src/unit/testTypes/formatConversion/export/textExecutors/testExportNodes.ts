import {
  BlockNoteEditor,
  BlockSchema,
  blockToNode,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { expect } from "vitest";

import { addIdsToBlocks } from "../../formatConversionTestUtil.js";
import { ExportTestCase } from "../exportTestCase.js";

export const testExportNodes = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ExportTestCase<B, I, S>,
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;

  addIdsToBlocks(testCase.content);

  await expect(
    testCase.content.map((block) =>
      blockToNode(block, editor.pmSchema, editor.schema.styleSchema),
    ),
  ).toMatchFileSnapshot(`./__snapshots__/nodes/${testCase.name}.json`);
};
