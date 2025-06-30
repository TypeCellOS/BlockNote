import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { expect } from "vitest";

import { addIdsToBlocks } from "../../formatConversionTestUtil.js";
import { ExportTestCase } from "../exportTestCase.js";

export const testExportMarkdown = async <
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
    await editor.blocksToMarkdownLossy(testCase.content),
  ).toMatchFileSnapshot(`./__snapshots__/markdown/${testCase.name}.md`);
};
