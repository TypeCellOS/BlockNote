import { describe, expect, it } from "vitest";

import { setupTestEnv } from "../../setupTestEnv.js";
import { insertBlocks as insertBlocksTr } from "./insertBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockIdentifier } from "../../../../schema/index.js";

const getEditor = setupTestEnv();

function insertBlocks(
  editor: BlockNoteEditor,
  blocksToInsert: PartialBlock<any, any, any>[],
  referenceBlock: BlockIdentifier,
  placement: "before" | "after" = "before",
) {
  return editor.transact((tr) =>
    insertBlocksTr(tr, blocksToInsert, referenceBlock, placement),
  );
}

describe("Test insertBlocks", () => {
  it("Insert single basic block before (without type)", () => {
    expect(
      insertBlocks(getEditor(), [{ content: "test" }], "paragraph-0", "before"),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single basic block before", () => {
    expect(
      insertBlocks(
        getEditor(),
        [{ type: "paragraph" }],
        "paragraph-0",
        "before",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single basic block after", () => {
    expect(
      insertBlocks(
        getEditor(),
        [{ type: "paragraph" }],
        "paragraph-0",
        "after",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert multiple blocks before", () => {
    expect(
      insertBlocks(
        getEditor(),
        [
          { type: "paragraph", content: "Inserted paragraph 1" },
          { type: "paragraph", content: "Inserted paragraph 2" },
          { type: "paragraph", content: "Inserted paragraph 3" },
        ],
        "paragraph-0",
        "before",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert multiple blocks after", () => {
    expect(
      insertBlocks(
        getEditor(),
        [
          { type: "paragraph", content: "Inserted paragraph 1" },
          { type: "paragraph", content: "Inserted paragraph 2" },
          { type: "paragraph", content: "Inserted paragraph 3" },
        ],
        "paragraph-0",
        "after",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single complex block before", () => {
    expect(
      insertBlocks(
        getEditor(),
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
        "paragraph-0",
        "before",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Insert single complex block after", () => {
    expect(
      insertBlocks(
        getEditor(),
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
        "paragraph-0",
        "after",
      ),
    ).toMatchSnapshot();

    expect(getEditor().document).toMatchSnapshot();
  });
});
