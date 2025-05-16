import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../../setupTestEnv.js";
import { removeAndInsertBlocks } from "./replaceBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockIdentifier } from "../../../../schema/index.js";

const getEditor = setupTestEnv();

function replaceBlocks(
  editor: BlockNoteEditor,
  blocksToRemove: BlockIdentifier[],
  blocksToInsert: PartialBlock<any, any, any>[],
) {
  return editor.transact((tr) =>
    removeAndInsertBlocks(tr, blocksToRemove, blocksToInsert),
  );
}

describe("Test replaceBlocks", () => {
  it("Remove single block", () => {
    replaceBlocks(getEditor(), ["paragraph-0"], []);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove multiple consecutive blocks", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "paragraph-1", "paragraph-with-children"],
      [],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Remove multiple non-consecutive blocks", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "table-0", "heading-with-everything"],
      [],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace single block with single basic", () => {
    replaceBlocks(getEditor(), ["paragraph-0"], [{ type: "paragraph" }]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace multiple consecutive blocks with single basic", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "paragraph-1", "paragraph-with-children"],
      [{ type: "paragraph" }],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace multiple non-consecutive blocks with single basic", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "table-0", "heading-with-everything"],
      [{ type: "paragraph" }],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace single block with multiple", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0"],
      [
        { type: "paragraph", content: "Inserted paragraph 1" },
        { type: "paragraph", content: "Inserted paragraph 2" },
        { type: "paragraph", content: "Inserted paragraph 3" },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace multiple consecutive blocks with multiple", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "paragraph-1", "paragraph-with-children"],
      [
        { type: "paragraph", content: "Inserted paragraph 1" },
        { type: "paragraph", content: "Inserted paragraph 2" },
        { type: "paragraph", content: "Inserted paragraph 3" },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace multiple non-consecutive blocks with multiple", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "table-0", "heading-with-everything"],
      [
        { type: "paragraph", content: "Inserted paragraph 1" },
        { type: "paragraph", content: "Inserted paragraph 2" },
        { type: "paragraph", content: "Inserted paragraph 3" },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace single block with single complex", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0"],
      [
        {
          id: "inserted-heading-with-everything",
          type: "heading",
          props: {
            backgroundColor: "red",
            level: 2,
            textAlignment: "center",
            textColor: "red",
          },
          content: [
            { type: "text", text: "Heading", styles: { bold: true } },
            { type: "text", text: " with styled ", styles: {} },
            { type: "text", text: "content", styles: { italic: true } },
          ],
          children: [
            {
              id: "inserted-nested-paragraph-2",
              type: "paragraph",
              content: "Nested Paragraph 2",
              children: [
                {
                  id: "inserted-double-nested-paragraph-2",
                  type: "paragraph",
                  content: "Double Nested Paragraph 2",
                },
              ],
            },
          ],
        },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace multiple consecutive blocks with single complex", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "paragraph-1", "paragraph-with-children"],
      [
        {
          id: "inserted-heading-with-everything",
          type: "heading",
          props: {
            backgroundColor: "red",
            level: 2,
            textAlignment: "center",
            textColor: "red",
          },
          content: [
            { type: "text", text: "Heading", styles: { bold: true } },
            { type: "text", text: " with styled ", styles: {} },
            { type: "text", text: "content", styles: { italic: true } },
          ],
          children: [
            {
              id: "inserted-nested-paragraph-2",
              type: "paragraph",
              content: "Nested Paragraph 2",
              children: [
                {
                  id: "inserted-double-nested-paragraph-2",
                  type: "paragraph",
                  content: "Double Nested Paragraph 2",
                },
              ],
            },
          ],
        },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Replace multiple non-consecutive blocks with single complex", () => {
    replaceBlocks(
      getEditor(),
      ["paragraph-0", "table-0", "heading-with-everything"],
      [
        {
          id: "inserted-heading-with-everything",
          type: "heading",
          props: {
            backgroundColor: "red",
            level: 2,
            textAlignment: "center",
            textColor: "red",
          },
          content: [
            { type: "text", text: "Heading", styles: { bold: true } },
            { type: "text", text: " with styled ", styles: {} },
            { type: "text", text: "content", styles: { italic: true } },
          ],
          children: [
            {
              id: "inserted-nested-paragraph-2",
              type: "paragraph",
              content: "Nested Paragraph 2",
              children: [
                {
                  id: "inserted-double-nested-paragraph-2",
                  type: "paragraph",
                  content: "Double Nested Paragraph 2",
                },
              ],
            },
          ],
        },
      ],
    );

    expect(getEditor().document).toMatchSnapshot();
  });
});
