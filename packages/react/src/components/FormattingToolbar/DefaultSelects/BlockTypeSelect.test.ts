/**
 * @vitest-environment node
 */
import {
  type BlockNoteEditor,
  BlockNoteSchema,
  createHeadingBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { describe, expect, it } from "vite-plus/test";

import { blockTypeSelectItems } from "./BlockTypeSelect.js";

function schemaWith(heading = createHeadingBlockSpec()) {
  return BlockNoteSchema.create({
    blockSpecs: { ...defaultBlockSpecs, heading },
  });
}

describe("blockTypeSelectItems", () => {
  it("lists the default items in the same order as before", () => {
    // Only the schema and the dictionary are read.
    const editor = {
      schema: schemaWith(),
      dictionary: en,
    } as unknown as BlockNoteEditor<any, any, any>;
    expect(blockTypeSelectItems(editor).map((item) => item.name)).toEqual([
      "Paragraph",
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Heading 4",
      "Heading 5",
      "Heading 6",
      "Toggle Heading 1",
      "Toggle Heading 2",
      "Toggle Heading 3",
      "Quote",
      "Toggle List",
      "Bullet List",
      "Numbered List",
      "Check List",
    ]);
  });
});
