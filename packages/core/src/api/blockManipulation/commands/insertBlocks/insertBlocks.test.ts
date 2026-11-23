import { describe, expect } from "vite-plus/test";

import { testDocument } from "../../setupTestEnv.js";
import { insertBlocks as insertBlocksTr } from "./insertBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockIdentifier } from "../../../../schema/index.js";

const it = globalThis.it.extend<{ editor: BlockNoteEditor }>({
  editor: async ({ setupEditor }, use) => {
    const { editor } = await setupEditor({ initialContent: testDocument });
    await use(editor);
  },
});

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
  it("Insert single basic block before (without type)", ({ editor }) => {
    expect(
      insertBlocks(editor, [{ content: "test" }], "paragraph-0", "before"),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert single basic block before", ({ editor }) => {
    expect(
      insertBlocks(editor, [{ type: "paragraph" }], "paragraph-0", "before"),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert single basic block after", ({ editor }) => {
    expect(
      insertBlocks(editor, [{ type: "paragraph" }], "paragraph-0", "after"),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert multiple blocks before", ({ editor }) => {
    expect(
      insertBlocks(
        editor,
        [
          { type: "paragraph", content: "Inserted paragraph 1" },
          { type: "paragraph", content: "Inserted paragraph 2" },
          { type: "paragraph", content: "Inserted paragraph 3" },
        ],
        "paragraph-0",
        "before",
      ),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert multiple blocks after", ({ editor }) => {
    expect(
      insertBlocks(
        editor,
        [
          { type: "paragraph", content: "Inserted paragraph 1" },
          { type: "paragraph", content: "Inserted paragraph 2" },
          { type: "paragraph", content: "Inserted paragraph 3" },
        ],
        "paragraph-0",
        "after",
      ),
    ).toMatchSnapshot();

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert single complex block before", ({ editor }) => {
    expect(
      insertBlocks(
        editor,
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

    expect(editor.document).toMatchSnapshot();
  });

  it("Insert single complex block after", ({ editor }) => {
    expect(
      insertBlocks(
        editor,
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

    expect(editor.document).toMatchSnapshot();
  });
});
