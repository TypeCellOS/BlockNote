import { createChainableState } from "@tiptap/core";
import type { Command } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import {
  getBlockInfoFromSelection,
  getParentBlockInfo,
} from "../../../getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { getNodeById } from "../../../nodeUtil.js";
import { layoutSchema } from "../../layoutBlocks/layoutBlocks.fixture.js";
import { testDocument } from "../../setupTestEnv.js";
import { mergeBlocksCommand } from "./mergeBlocks.js";

function mergeAt(posBetweenBlocks: number): Command {
  return (state, dispatch) =>
    mergeBlocksCommand(posBetweenBlocks)({
      // Mirror Tiptap's command runner: all steps share one transaction.
      state: createChainableState({ state, transaction: state.tr }),
      dispatch,
    });
}

const mergeSelectedBlock: Command = (state, dispatch) =>
  mergeAt(getBlockInfoFromSelection(state).block.beforePos)(state, dispatch);

describe("Test mergeBlocks", () => {
  let editor: BlockNoteEditor;
  it.beforeEach(async ({ setupEditor }) => {
    ({ editor } = await setupEditor({ initialContent: testDocument }));
  });

  function getEditor() {
    return editor;
  }

  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("First block has children", () => {
    getEditor().setTextCursorPosition("paragraph-2");

    getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block has children", () => {
    getEditor().setTextCursorPosition("paragraph-with-children");

    getEditor().exec(mergeSelectedBlock);

    // The merged block's children are lifted into its place, not dropped
    // with it. The lift and the delete go through the one transaction tiptap
    // hands the command (its chainable state's `tr` getter returns the same
    // transaction every time), so the lift must survive the dispatch.
    expect(getEditor().getBlock("paragraph-with-children")).toBeUndefined();
    expect(getEditor().getBlock("paragraph-1")!.content).toEqual([
      { type: "text", text: "Paragraph 1Paragraph with children", styles: {} },
    ]);
    expect(getEditor().document.map((block) => block.id)).toContain(
      "nested-paragraph-0",
    );
    expect(
      getEditor()
        .getBlock("nested-paragraph-0")!
        .children.map((c) => c.id),
    ).toEqual(["double-nested-paragraph-0"]);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block is empty", () => {
    getEditor().setTextCursorPosition("empty-paragraph");

    getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Blocks have different types", () => {
    getEditor().setTextCursorPosition("paragraph-5");

    getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is updated", () => {
    getEditor().setTextCursorPosition("paragraph-0", "end");

    const firstBlockEndOffset = getEditor().transact(
      (tr) => tr.selection.$anchor.parentOffset,
    );

    getEditor().setTextCursorPosition("paragraph-1");

    getEditor().exec(mergeSelectedBlock);

    const anchorIsAtOldFirstBlockEndPos =
      getEditor().transact((tr) => tr.selection.$anchor.parentOffset) ===
      firstBlockEndOffset;

    expect(anchorIsAtOldFirstBlockEndPos).toBeTruthy();
  });

  it("getParentBlockInfo returns undefined for top-level block", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    const { beforePos, doc } = getEditor().transact((tr) => ({
      beforePos: getBlockInfoFromSelection(tr).block.beforePos,
      doc: tr.doc,
    }));
    const $pos = doc.resolve(beforePos);

    expect($pos.depth - 1).toBeLessThan(1);

    const result = getParentBlockInfo(doc, beforePos);

    expect(result).toBeUndefined();
  });

  it("First block is empty", () => {
    getEditor().setTextCursorPosition("paragraph-8");

    const originalDocument = getEditor().document;
    const ret = getEditor().exec(mergeSelectedBlock);

    // The empty paragraph above has the same type and props, so the block
    // moves up into its place, keeping its id (#550).
    expect(getEditor().document).toEqual(
      originalDocument.filter((block) => block.id !== "empty-paragraph"),
    );
    expect(ret).toBe(true);
  });

  it("Inline content & no content", () => {
    getEditor().setTextCursorPosition("image-0");

    const originalDocument = getEditor().document;
    const ret = getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Inline content & table content", () => {
    getEditor().setTextCursorPosition("table-0");

    const originalDocument = getEditor().document;
    const ret = getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("No content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-6");

    const originalDocument = getEditor().document;
    const ret = getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBe(false);
  });

  it("Table content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-7");

    const originalDocument = getEditor().document;
    const ret = getEditor().exec(mergeSelectedBlock);

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });
});

describe("Test mergeBlocks at layout block boundaries", () => {
  const editorOptions: {
    schema: typeof layoutSchema;
    initialContent: (typeof layoutSchema.PartialBlock)[];
  } = {
    schema: layoutSchema,
    initialContent: [
      {
        id: "before-callout",
        type: "paragraph",
        content: "Before callout",
      },
      {
        id: "callout-0",
        type: "callout",
        children: [
          {
            id: "callout-child-0",
            type: "paragraph",
            content: "Callout child 0",
          },
          {
            id: "callout-child-1",
            type: "paragraph",
            content: "Callout child 1",
          },
        ],
      },
      { id: "after-callout", type: "paragraph", content: "After callout" },
    ],
  };

  let layoutEditor: typeof layoutSchema.BlockNoteEditor;
  it.beforeEach(async ({ setupEditor }) => {
    ({ editor: layoutEditor } = await setupEditor(editorOptions));
  });

  function getLayoutEditor() {
    return layoutEditor;
  }

  function mergeBlock(id: string): Command {
    return (state, dispatch) => {
      const node = getNodeById(id, state.doc);
      if (!node) {
        throw new Error(`No block with id "${id}" in the test document`);
      }
      return mergeAt(node.posBeforeNode)(state, dispatch);
    };
  }

  // A layout block's first child has no previous sibling, so there is nothing to
  // merge it into. The block above it on screen sits outside the layout block.
  it("Does not merge a layout block's first child out of the layout block", () => {
    const originalDocument = getLayoutEditor().document;
    const ret = getLayoutEditor().exec(mergeBlock("callout-child-0"));

    expect(ret).toBeFalsy();
    expect(getLayoutEditor().document).toEqual(originalDocument);
  });

  // A layout block has no content of its own, so there is nothing to merge.
  it("Does not merge a layout block into the block above it", () => {
    const originalDocument = getLayoutEditor().document;
    const ret = getLayoutEditor().exec(mergeBlock("callout-0"));

    expect(ret).toBeFalsy();
    expect(getLayoutEditor().document).toEqual(originalDocument);
  });

  // `mergeBlocksCommand` treats a layout block like any other block with children
  // and merges into its last descendant, which puts the merged text inside the
  // layout block. Backspace never produces this, because
  // `KeyboardShortcutsExtension` bails out when the previous sibling has no
  // inline content and moves the block into the layout block instead. So this is
  // the command's behaviour on its own, not the editor's; it is pinned here
  // because `mergeBlocks.ts` documents the opposite.
  it("Merges a block into the last descendant of the layout block above it", () => {
    const ret = getLayoutEditor().exec(mergeBlock("after-callout"));

    expect(ret).toBeTruthy();

    const document = getLayoutEditor().document;

    expect(document.map((block) => block.id)).toEqual([
      "before-callout",
      "callout-0",
    ]);
    expect(document[1].children[1].content).toEqual([
      { type: "text", text: "Callout child 1After callout", styles: {} },
    ]);
  });
});
