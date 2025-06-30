import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { prettify } from "htmlfy";
import { expect } from "vitest";

import { addIdsToBlocks } from "../../formatConversionTestUtil.js";
import { ExportTestCase } from "../exportTestCase.js";

export const testExportHTML = async <
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
    prettify(await editor.blocksToHTMLLossy(testCase.content), {
      tag_wrap: true,
    }),
  ).toMatchFileSnapshot(`./__snapshots__/html/${testCase.name}.html`);
};
