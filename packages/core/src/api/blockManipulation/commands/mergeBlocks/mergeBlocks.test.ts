import { describe, expect, it } from "vite-plus/test";

import { getBlockInfoFromSelection } from "../../../getBlockInfoFromPos.js";
import { setupTestEnv } from "../../setupTestEnv.js";
import { getParentBlockInfo } from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";
import { containerSchema } from "../../containers/containers.fixture.js";
import { mergeBlocksCommand } from "./mergeBlocks.js";

const getEditor = setupTestEnv();

function mergeBlocks(posBetweenBlocks: number) {
  return getEditor()._tiptapEditor.commands.command(
    mergeBlocksCommand(posBetweenBlocks),
  );
}

function getPosBeforeSelectedBlock() {
  return getEditor().transact(
    (tr) => getBlockInfoFromSelection(tr).block.beforePos,
  );
}

describe("Test mergeBlocks", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-1");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("First block has children", () => {
    getEditor().setTextCursorPosition("paragraph-2");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block has children", () => {
    getEditor().setTextCursorPosition("paragraph-with-children");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Second block is empty", () => {
    getEditor().setTextCursorPosition("empty-paragraph");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Blocks have different types", () => {
    getEditor().setTextCursorPosition("paragraph-5");

    mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is updated", () => {
    getEditor().setTextCursorPosition("paragraph-0", "end");

    const firstBlockEndOffset = getEditor().transact(
      (tr) => tr.selection.$anchor.parentOffset,
    );

    getEditor().setTextCursorPosition("paragraph-1");

    mergeBlocks(getPosBeforeSelectedBlock());

    const anchorIsAtOldFirstBlockEndPos =
      getEditor().transact((tr) => tr.selection.$anchor.parentOffset) ===
      firstBlockEndOffset;

    expect(anchorIsAtOldFirstBlockEndPos).toBeTruthy();
  });

  it("getParentBlockInfo returns undefined for top-level block", () => {
    getEditor().setTextCursorPosition("paragraph-0");

    const beforePos = getPosBeforeSelectedBlock();
    const doc = getEditor()._tiptapEditor.state.doc;
    const $pos = doc.resolve(beforePos);

    expect($pos.depth - 1).toBeLessThan(1);

    const result = getParentBlockInfo(doc, beforePos);

    expect(result).toBeUndefined();
  });

  // We expect a no-op for each of the remaining tests as merging should only
  // happen for blocks which both have inline content. We also expect
  // `mergeBlocks` to return false as TipTap commands should do that instead of
  // throwing an error, when the command cannot be executed.
  it("First block is empty", () => {
    getEditor().setTextCursorPosition("paragraph-8");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Inline content & no content", () => {
    getEditor().setTextCursorPosition("image-0");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Inline content & table content", () => {
    getEditor().setTextCursorPosition("table-0");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("No content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-6");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });

  it("Table content & inline content", () => {
    getEditor().setTextCursorPosition("paragraph-7");

    const originalDocument = getEditor().document;
    const ret = mergeBlocks(getPosBeforeSelectedBlock());

    expect(getEditor().document).toEqual(originalDocument);
    expect(ret).toBeFalsy();
  });
});

describe("Test mergeBlocks at container boundaries", () => {
  const getContainerEditor = setupTestEnv({
    schema: containerSchema,
    document: [
      { id: "before-callout", type: "paragraph", content: "Before callout" },
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
  });

  function mergeContainerBlocks(posBetweenBlocks: number) {
    return getContainerEditor()._tiptapEditor.commands.command(
      mergeBlocksCommand(posBetweenBlocks),
    );
  }

  function getPosBefore(id: string) {
    return getContainerEditor().transact((tr) => {
      const node = getNodeById(id, tr.doc);
      if (!node) {
        throw new Error(`No block with id "${id}" in the test document`);
      }
      return node.posBeforeNode;
    });
  }

  // A container's first child has no previous sibling, so there is nothing to
  // merge it into. The block above it on screen sits outside the container.
  it("Does not merge a container's first child out of the container", () => {
    const originalDocument = getContainerEditor().document;
    const ret = mergeContainerBlocks(getPosBefore("callout-child-0"));

    expect(ret).toBeFalsy();
    expect(getContainerEditor().document).toEqual(originalDocument);
  });

  // A container has no content of its own, so there is nothing to merge.
  it("Does not merge a container into the block above it", () => {
    const originalDocument = getContainerEditor().document;
    const ret = mergeContainerBlocks(getPosBefore("callout-0"));

    expect(ret).toBeFalsy();
    expect(getContainerEditor().document).toEqual(originalDocument);
  });

  // `mergeBlocksCommand` treats a container like any other block with children
  // and merges into its last descendant, which puts the merged text inside the
  // container. Backspace never produces this, because
  // `KeyboardShortcutsExtension` bails out when the previous sibling has no
  // inline content and moves the block into the container instead. So this is
  // the command's behaviour on its own, not the editor's; it is pinned here
  // because `mergeBlocks.ts` documents the opposite.
  it("Merges a block into the last descendant of the container above it", () => {
    const ret = mergeContainerBlocks(getPosBefore("after-callout"));

    expect(ret).toBeTruthy();

    const document = getContainerEditor().document;

    expect(document.map((block) => block.id)).toEqual([
      "before-callout",
      "callout-0",
    ]);
    expect(document[1].children[1].content).toEqual([
      { type: "text", text: "Callout child 1After callout", styles: {} },
    ]);
  });
});
