import { describe, expect, it } from "vitest";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import { setupTestEditor } from "../../setupTestEditor.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";
import { getParseTestCases, ParseTestCase } from "./getParseTestCases.js";

// Test for verifying that importing blocks from other formats works as
// expected. Used for specific cases for when content from outside the editor is
// imported as blocks. This includes content from other editors, as well as
// content from the web that has produced bugs in the past.
const testParseTest = async (
  editor: BlockNoteEditor<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >,
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
  const getEditor = setupTestEditor();

  for (const testCase of getParseTestCases()) {
    it(`${testCase.name}`, async () => {
      await testParseTest(getEditor(), testCase);
    });
  }
});
