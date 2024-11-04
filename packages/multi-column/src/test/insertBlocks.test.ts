import { describe, expect, it } from "vitest";
import { setupTestEnv, testEditorSchema } from "./setupTestEnv.js";
import {
  BlockIdentifier,
  BlockNoteEditor,
  PartialBlock,
} from "@blocknote/core";

const getEditor = setupTestEnv();

function insertBlocks(
  editor: BlockNoteEditor<
    typeof testEditorSchema.blockSchema,
    typeof testEditorSchema.inlineContentSchema,
    typeof testEditorSchema.styleSchema
  >,
  blocksToInsert: PartialBlock<
    typeof testEditorSchema.blockSchema,
    typeof testEditorSchema.inlineContentSchema,
    typeof testEditorSchema.styleSchema
  >[],
  referenceBlock: BlockIdentifier,
  placement: "before" | "after" = "before"
) {
  return editor.insertBlocks(blocksToInsert, referenceBlock, placement);
}

describe("Test insertBlocks", () => {
  it("Insert empty column list", () => {
    insertBlocks(getEditor(), [{ type: "columnList" }], "paragraph-0", "after");

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column list with empty column", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "columnList",
          children: [
            {
              type: "column",
            },
          ],
        },
      ],
      "paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column list with paragraph", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [
                {
                  type: "paragraph",
                  content: "Inserted Column Paragraph",
                },
              ],
            },
          ],
        },
      ],
      "paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert empty column into column list", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "column",
        },
      ],
      "column-0",
      "before"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column with paragraph into column list", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "column",
          children: [
            {
              type: "paragraph",
              content: "Inserted Column Paragraph",
            },
          ],
        },
      ],
      "column-0",
      "before"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column list into paragraph", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [
                {
                  type: "paragraph",
                  content: "Inserted Column Paragraph",
                },
              ],
            },
          ],
        },
      ],
      "nested-paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert column into paragraph", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "column",
          children: [
            {
              type: "paragraph",
              content: "Inserted Column Paragraph",
            },
          ],
        },
      ],
      "nested-paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert paragraph into column list", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "paragraph",
          content: "Inserted Column List Paragraph",
        },
      ],
      "column-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert paragraph into column", () => {
    insertBlocks(
      getEditor(),
      [
        {
          type: "paragraph",
          content: "Inserted Column List Paragraph",
        },
      ],
      "column-paragraph-0",
      "after"
    );

    expect(getEditor().document).toMatchSnapshot();
  });
});
