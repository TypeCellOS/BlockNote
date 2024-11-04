import { describe, expect, it } from "vitest";
import { setupTestEnv, testEditorSchema } from "./setupTestEnv";
import {
  BlockIdentifier,
  BlockNoteEditor,
  PartialBlock,
} from "@blocknote/core";

const getEditor = setupTestEnv();

function updateBlock(
  editor: BlockNoteEditor<
    typeof testEditorSchema.blockSchema,
    typeof testEditorSchema.inlineContentSchema,
    typeof testEditorSchema.styleSchema
  >,
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<
    typeof testEditorSchema.blockSchema,
    typeof testEditorSchema.inlineContentSchema,
    typeof testEditorSchema.styleSchema
  >
) {
  return editor.updateBlock(blockToUpdate, update);
}

describe("Test updateBlock", () => {
  it("Update column list new children", () => {
    updateBlock(getEditor(), "column-list-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column list new empty children", () => {
    updateBlock(getEditor(), "column-list-0", {
      type: "columnList",
      children: [
        {
          type: "column",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column new children", () => {
    updateBlock(getEditor(), "column-0", {
      type: "column",
      children: [
        {
          type: "paragraph",
          content: "Inserted Column Paragraph",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update paragraph to column list", () => {
    updateBlock(getEditor(), "paragraph-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update nested paragraph to column list", () => {
    updateBlock(getEditor(), "nested-paragraph-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column to column list", () => {
    updateBlock(getEditor(), "column-0", {
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
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update paragraph to column", () => {
    updateBlock(getEditor(), "paragraph-0", {
      type: "column",
      children: [
        {
          type: "paragraph",
          content: "Inserted Column Paragraph",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update nested paragraph to column", () => {
    updateBlock(getEditor(), "nested-paragraph-0", {
      type: "column",
      children: [
        {
          type: "paragraph",
          content: "Inserted Column Paragraph",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column list to column", () => {
    updateBlock(getEditor(), "column-list-0", {
      type: "column",
      children: [
        {
          type: "paragraph",
          content: "Inserted Column Paragraph",
        },
      ],
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column list to paragraph", () => {
    updateBlock(getEditor(), "column-list-0", {
      type: "paragraph",
      content: "Inserted Column Paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Update column to paragraph", () => {
    updateBlock(getEditor(), "column-0", {
      type: "paragraph",
      content: "Inserted Column Paragraph",
    });

    expect(getEditor().document).toMatchSnapshot();
  });
});
