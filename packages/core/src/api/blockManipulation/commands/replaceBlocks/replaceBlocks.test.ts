import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "../../setupTestEnv.js";
import { removeAndInsertBlocks } from "./replaceBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockIdentifier } from "../../../../schema/index.js";
import { docToBlocks } from "../../../nodeConversions/nodeToBlock.js";
import { YAttributionMarksExtension } from "../../../../y/extensions/YAttributionMarks.js";

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

/**
 * Builds a `blockContainer` holding a single paragraph with the given block
 * `id`. When `suggestedDelete` is true, the container carries a
 * `y-attributed-delete` mark, simulating a node that a suggestion / version
 * diff keeps in the document after it has been deleted — it shares its `id`
 * with the live node it was deleted from.
 */
function makeBlockContainer(
  schema: Schema,
  id: string,
  text: string,
  suggestedDelete: boolean,
) {
  const paragraph = schema.nodes["paragraph"].createChecked(
    {},
    schema.text(text),
  );
  const marks = suggestedDelete
    ? [schema.marks["y-attributed-delete"].create({ id: 1 })]
    : undefined;

  return schema.nodes["blockContainer"].createChecked({ id }, paragraph, marks);
}

describe("removeAndInsertBlocks with suggested deletions", () => {
  // A rendered diff (e.g. of a moved block) shows the same block `id` twice:
  // the live node and a suggested-deletion copy, which `docToBlocks` reports
  // under a disambiguated id ("0-1" = the second node with id "0"). Removing
  // the blocks `editor.document` reports must resolve that id even though, by
  // the time the walk reaches the deleted copy, the live node it was counted
  // against is already gone from the transaction's doc.
  it("removes a live block and its suggested deletion by the ids docToBlocks reports", () => {
    const editor = BlockNoteEditor.create({
      extensions: [YAttributionMarksExtension()],
    });
    const schema = editor.pmSchema;
    const doc = schema.nodes["doc"].createChecked(
      {},
      schema.nodes["blockGroup"].createChecked({}, [
        makeBlockContainer(schema, "0", "Live", false),
        makeBlockContainer(schema, "1", "Other", false),
        makeBlockContainer(schema, "0", "Deleted", true),
      ]),
    );
    const blocks = docToBlocks(doc);
    expect(blocks.map((block) => block.id)).toEqual(["0", "1", "0-1"]);

    const tr = EditorState.create({ doc }).tr;
    const { removedBlocks } = removeAndInsertBlocks(
      tr,
      blocks.filter((block) => block.id !== "1"),
      [],
    );

    expect(removedBlocks.map((block) => block.id)).toEqual(["0", "0-1"]);
    expect(docToBlocks(tr.doc).map((block) => block.id)).toEqual(["1"]);
  });
});
