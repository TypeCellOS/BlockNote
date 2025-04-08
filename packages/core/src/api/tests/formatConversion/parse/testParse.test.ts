import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../../schema/index.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import { testSchema } from "../../testSchema.js";
import { getParseTestCases, ParseTestCase } from "./getParseTestCases.js";

// Test for verifying that importing blocks from other formats works as
// expected. Used for specific cases for when content from outside the editor is
// imported as blocks. This includes content from other editors, as well as
// content from the web that has produced bugs in the past.
export const testParse = async <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<B, I, S>,
  testCase: ParseTestCase
) => {
  (window as any).__TEST_OPTIONS.mockID = 0;
  if (testCase.conversionType === "html") {
    await expect(
      await editor.tryParseHTMLToBlocks(testCase.content)
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.json`
    );
  } else if (testCase.conversionType === "markdown") {
    await expect(
      await editor.tryParseMarkdownToBlocks(testCase.content)
    ).toMatchFileSnapshot(
      `./__snapshots__/${testCase.conversionType}/${testCase.name}.json`
    );
  } else {
    throw new UnreachableCaseError(testCase.conversionType);
  }
};

describe("Export tests", () => {
  const getEditor = setupTestEditor(testSchema);

  for (const testCase of getParseTestCases()) {
    it(`${testCase.name}`, async () => {
      await testParse(getEditor(), testCase);
    });
  }
});
