import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "../../setupTestEnv.js";
import { updateBlock } from "../updateBlock/updateBlock.js";
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

// `removeAndInsertBlocks` walks the document while mutating it, so the
// positions it reads go stale as it goes. It corrects for that with
// `tr.mapping.slice(stepsBefore)`, where `stepsBefore` is the step count on
// entry. The slice is what makes the function safe to call on a transaction
// that already carries steps: an unsliced `tr.mapping` would re-apply the
// caller's earlier steps to positions that already account for them, and the
// resulting delete ranges would land on the wrong nodes.
describe("Test replaceBlocks on a transaction that already has steps", () => {
  it("Removes the right blocks across two calls in one transaction", () => {
    const editor = getEditor();
    const before = editor.document;

    editor.transact((tr) => {
      removeAndInsertBlocks(tr, ["paragraph-0"], []);
      removeAndInsertBlocks(tr, ["paragraph-2"], []);
    });

    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    expect(editor.document).toEqual(
      before.filter(
        (block) => block.id !== "paragraph-0" && block.id !== "paragraph-2",
      ),
    );
  });

  it("Removes the right block after the caller has already updated one", () => {
    const editor = getEditor();
    const before = editor.document;

    editor.transact((tr) => {
      // Changes the size of a block that sits before the one removed below,
      // so the removal's positions are only correct if the earlier step is
      // accounted for exactly once.
      updateBlock(tr, "paragraph-0", {
        type: "heading",
        content: "Updated heading",
      });
      const inserted: PartialBlock<any, any, any>[] = [
        { id: "inserted-paragraph", type: "paragraph", content: "Inserted" },
      ];
      removeAndInsertBlocks(tr, ["paragraph-2"], inserted);
    });

    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();

    const updated = editor.getBlock("paragraph-0")!;
    expect(updated.type).toBe("heading");
    expect(updated.content).toEqual([
      { type: "text", text: "Updated heading", styles: {} },
    ]);

    expect(editor.document.map((block) => block.id)).toEqual(
      before.map((block) =>
        block.id === "paragraph-2" ? "inserted-paragraph" : block.id,
      ),
    );
    // Every block the two operations didn't target is left exactly as it was.
    expect(
      editor.document.filter(
        (block) =>
          block.id !== "paragraph-0" && block.id !== "inserted-paragraph",
      ),
    ).toEqual(
      before.filter(
        (block) => block.id !== "paragraph-0" && block.id !== "paragraph-2",
      ),
    );
  });
});
