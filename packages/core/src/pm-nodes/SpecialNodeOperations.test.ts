/**
 * @vitest-environment jsdom
 *
 * Tests for suggestion node compatibility with editor operations.
 * The existing SpecialNode.test.ts covers transparency (suggestion nodes are
 * invisible to Block API). This file covers compatibility — that all editor
 * operations work correctly when suggestion nodes are present in the document.
 *
 * Written in TDD style: tests are written before the implementation.
 */
import { Fragment, Slice } from "@tiptap/pm/model";
import { undo } from "@tiptap/pm/history";
import { describe, expect, it } from "vitest";
import { getBlockInfoWithManualOffset } from "../api/getBlockInfoFromPos.js";
import { moveBlocksDown, moveBlocksUp } from "../api/blockManipulation/commands/moveBlocks/moveBlocks.js";
import { prosemirrorSliceToSlicedBlocks } from "../api/nodeConversions/nodeToBlock.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

// =============================================================================
// Helpers
// =============================================================================

/** Default paragraph attrs required by the schema */
const PARA_ATTRS = {
  backgroundColor: "default",
  textAlignment: "left",
  textColor: "default",
};

/** Attrs for suggestion nodes — includes the required __suggestionData sentinel */
const SUGGESTION_PARA_ATTRS = {
  ...PARA_ATTRS,
  __suggestionData: "true",
};

/**
 * Creates a mounted editor and returns it along with a cleanup function.
 */
function createMountedEditor() {
  const editor = BlockNoteEditor.create();
  const div = document.createElement("div");
  editor.mount(div);
  return { editor, div, destroy: () => editor._tiptapEditor.destroy() };
}

/**
 * Injects a suggestion-paragraph BEFORE the paragraph inside the first blockContainer.
 * Result: blockContainer[suggestion-paragraph, paragraph]
 */
function injectSuggestionBefore(
  editor: BlockNoteEditor<any, any, any>,
  suggestionText: string,
  mainText: string,
  blockId = "block-1",
) {
  editor.transact((tr) => {
    const { nodes } = editor.pmSchema;

    const suggestionParagraph = nodes["suggestion-paragraph"].create(
      SUGGESTION_PARA_ATTRS,
      suggestionText ? [editor.pmSchema.text(suggestionText)] : [],
    );

    const mainParagraph = nodes.paragraph.create(
      PARA_ATTRS,
      mainText ? [editor.pmSchema.text(mainText)] : [],
    );

    const blockContainer = nodes.blockContainer.create({ id: blockId }, [
      suggestionParagraph,
      mainParagraph,
    ]);

    const blockGroup = nodes.blockGroup.create(null, [blockContainer]);
    const newDoc = nodes.doc.create(null, [blockGroup]);
    tr.replaceWith(0, tr.doc.content.size, newDoc.content);
  });
}

/**
 * Injects a suggestion-paragraph AFTER the paragraph inside the first blockContainer.
 * Result: blockContainer[paragraph, suggestion-paragraph]
 */
function injectSuggestionAfter(
  editor: BlockNoteEditor<any, any, any>,
  mainText: string,
  suggestionText: string,
  blockId = "block-1",
) {
  editor.transact((tr) => {
    const { nodes } = editor.pmSchema;

    const mainParagraph = nodes.paragraph.create(
      PARA_ATTRS,
      mainText ? [editor.pmSchema.text(mainText)] : [],
    );

    const suggestionParagraph = nodes["suggestion-paragraph"].create(
      SUGGESTION_PARA_ATTRS,
      suggestionText ? [editor.pmSchema.text(suggestionText)] : [],
    );

    const blockContainer = nodes.blockContainer.create({ id: blockId }, [
      mainParagraph,
      suggestionParagraph,
    ]);

    const blockGroup = nodes.blockGroup.create(null, [blockContainer]);
    const newDoc = nodes.doc.create(null, [blockGroup]);
    tr.replaceWith(0, tr.doc.content.size, newDoc.content);
  });
}

/**
 * Injects suggestion-paragraphs on BOTH sides of the paragraph.
 * Result: blockContainer[suggestion-paragraph, paragraph, suggestion-paragraph]
 */
function injectSuggestionBoth(
  editor: BlockNoteEditor<any, any, any>,
  beforeText: string,
  mainText: string,
  afterText: string,
  blockId = "block-1",
) {
  editor.transact((tr) => {
    const { nodes } = editor.pmSchema;

    const beforeSuggestion = nodes["suggestion-paragraph"].create(
      SUGGESTION_PARA_ATTRS,
      beforeText ? [editor.pmSchema.text(beforeText)] : [],
    );

    const mainParagraph = nodes.paragraph.create(
      PARA_ATTRS,
      mainText ? [editor.pmSchema.text(mainText)] : [],
    );

    const afterSuggestion = nodes["suggestion-paragraph"].create(
      SUGGESTION_PARA_ATTRS,
      afterText ? [editor.pmSchema.text(afterText)] : [],
    );

    const blockContainer = nodes.blockContainer.create({ id: blockId }, [
      beforeSuggestion,
      mainParagraph,
      afterSuggestion,
    ]);

    const blockGroup = nodes.blockGroup.create(null, [blockContainer]);
    const newDoc = nodes.doc.create(null, [blockGroup]);
    tr.replaceWith(0, tr.doc.content.size, newDoc.content);
  });
}

/**
 * Creates a doc with two blocks, optionally with suggestion nodes.
 */
function injectTwoBlocks(
  editor: BlockNoteEditor<any, any, any>,
  opts: {
    block1: {
      mainText: string;
      suggestionBefore?: string;
      suggestionAfter?: string;
    };
    block2: {
      mainText: string;
      suggestionBefore?: string;
      suggestionAfter?: string;
    };
  },
) {
  editor.transact((tr) => {
    const { nodes } = editor.pmSchema;

    function makeBlockContainer(
      blockId: string,
      main: string,
      suggBefore?: string,
      suggAfter?: string,
    ) {
      const children = [];

      if (suggBefore !== undefined) {
        children.push(
          nodes["suggestion-paragraph"].create(
            SUGGESTION_PARA_ATTRS,
            suggBefore ? [editor.pmSchema.text(suggBefore)] : [],
          ),
        );
      }

      children.push(
        nodes.paragraph.create(
          PARA_ATTRS,
          main ? [editor.pmSchema.text(main)] : [],
        ),
      );

      if (suggAfter !== undefined) {
        children.push(
          nodes["suggestion-paragraph"].create(
            SUGGESTION_PARA_ATTRS,
            suggAfter ? [editor.pmSchema.text(suggAfter)] : [],
          ),
        );
      }

      return nodes.blockContainer.create({ id: blockId }, children);
    }

    const bc1 = makeBlockContainer(
      "block-1",
      opts.block1.mainText,
      opts.block1.suggestionBefore,
      opts.block1.suggestionAfter,
    );
    const bc2 = makeBlockContainer(
      "block-2",
      opts.block2.mainText,
      opts.block2.suggestionBefore,
      opts.block2.suggestionAfter,
    );

    const blockGroup = nodes.blockGroup.create(null, [bc1, bc2]);
    const newDoc = nodes.doc.create(null, [blockGroup]);
    tr.replaceWith(0, tr.doc.content.size, newDoc.content);
  });
}

/**
 * Creates a doc with one block that has suggestion, blockContent, and blockGroup
 * (a child block nested underneath).
 */
function injectBlockWithChildren(
  editor: BlockNoteEditor<any, any, any>,
  opts: {
    mainText: string;
    childText: string;
    suggestionBefore?: string;
    suggestionAfter?: string;
  },
) {
  editor.transact((tr) => {
    const { nodes } = editor.pmSchema;

    const children = [];

    if (opts.suggestionBefore !== undefined) {
      children.push(
        nodes["suggestion-paragraph"].create(
          SUGGESTION_PARA_ATTRS,
          opts.suggestionBefore
            ? [editor.pmSchema.text(opts.suggestionBefore)]
            : [],
        ),
      );
    }

    children.push(
      nodes.paragraph.create(
        PARA_ATTRS,
        opts.mainText ? [editor.pmSchema.text(opts.mainText)] : [],
      ),
    );

    if (opts.suggestionAfter !== undefined) {
      children.push(
        nodes["suggestion-paragraph"].create(
          SUGGESTION_PARA_ATTRS,
          opts.suggestionAfter
            ? [editor.pmSchema.text(opts.suggestionAfter)]
            : [],
        ),
      );
    }

    // Add a child block in a blockGroup
    const childParagraph = nodes.paragraph.create(PARA_ATTRS, [
      editor.pmSchema.text(opts.childText),
    ]);
    const childContainer = nodes.blockContainer.create({ id: "child-1" }, [
      childParagraph,
    ]);
    const blockGroup = nodes.blockGroup.create(null, [childContainer]);
    children.push(blockGroup);

    const blockContainer = nodes.blockContainer.create(
      { id: "block-1" },
      children,
    );

    const outerGroup = nodes.blockGroup.create(null, [blockContainer]);
    const newDoc = nodes.doc.create(null, [outerGroup]);
    tr.replaceWith(0, tr.doc.content.size, newDoc.content);
  });
}

// =============================================================================
// Tier 1: prosemirrorSliceToSlicedBlocks — crash fixes
// =============================================================================

describe("Tier 1 - prosemirrorSliceToSlicedBlocks with suggestion nodes", () => {
  it("should not throw when blockContainer has suggestion-before + blockContent + blockGroup (childCount=3)", () => {
    const { editor, destroy } = createMountedEditor();

    // Create a doc with suggestion + paragraph + blockGroup
    injectBlockWithChildren(editor, {
      mainText: "Main",
      childText: "Child",
      suggestionBefore: "Deleted",
    });

    // Verify the structure before slicing
    const doc = editor.prosemirrorState.doc;
    const outerBlockGroup = doc.firstChild!;
    const blockContainer = outerBlockGroup.firstChild!;
    // Should have 3 children: suggestion, paragraph, blockGroup
    expect(blockContainer.childCount).toBe(3);

    // Create a slice that wraps the blockGroup node (the function expects blockGroup as root)
    const slice = new Slice(Fragment.from(outerBlockGroup), 0, 0);

    // This should NOT throw
    expect(() => {
      prosemirrorSliceToSlicedBlocks(slice, editor.pmSchema);
    }).not.toThrow();

    // The result should contain the block with its child
    const result = prosemirrorSliceToSlicedBlocks(slice, editor.pmSchema);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("paragraph");
    expect(result.blocks[0].children).toHaveLength(1);

    destroy();
  });

  it("should not throw when blockContainer has both suggestions + blockContent + blockGroup (childCount=4)", () => {
    const { editor, destroy } = createMountedEditor();

    injectBlockWithChildren(editor, {
      mainText: "Main",
      childText: "Child",
      suggestionBefore: "Before",
      suggestionAfter: "After",
    });

    const doc = editor.prosemirrorState.doc;
    const outerBlockGroup = doc.firstChild!;
    const blockContainer = outerBlockGroup.firstChild!;
    expect(blockContainer.childCount).toBe(4);

    const slice = new Slice(Fragment.from(outerBlockGroup), 0, 0);

    expect(() => {
      prosemirrorSliceToSlicedBlocks(slice, editor.pmSchema);
    }).not.toThrow();

    const result = prosemirrorSliceToSlicedBlocks(slice, editor.pmSchema);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].children).toHaveLength(1);

    destroy();
  });

  it("should correctly identify blockGroup when suggestion node is between blockContent and blockGroup", () => {
    const { editor, destroy } = createMountedEditor();

    // suggestion-paragraph + paragraph + blockGroup
    injectBlockWithChildren(editor, {
      mainText: "Main",
      childText: "Child block",
      suggestionBefore: "Deleted",
    });

    const doc = editor.prosemirrorState.doc;
    const outerBlockGroup = doc.firstChild!;
    const slice = new Slice(Fragment.from(outerBlockGroup), 0, 0);

    const result = prosemirrorSliceToSlicedBlocks(slice, editor.pmSchema);

    // Block should have the child from blockGroup
    expect(result.blocks[0].children).toHaveLength(1);
    expect(result.blocks[0].children[0].type).toBe("paragraph");
    expect(result.blocks[0].children[0].content).toEqual([
      { type: "text", text: "Child block", styles: {} },
    ]);

    destroy();
  });

  it("should handle suggestion-before + blockContent without blockGroup (childCount=2) without mistaking suggestion for blockGroup", () => {
    const { editor, destroy } = createMountedEditor();

    // Create blockContainer with [suggestion-paragraph, paragraph] — no blockGroup
    injectSuggestionBefore(editor, "Deleted", "Main");

    const doc = editor.prosemirrorState.doc;
    const outerBlockGroup = doc.firstChild!;
    const blockContainer = outerBlockGroup.firstChild!;
    expect(blockContainer.childCount).toBe(2);

    const slice = new Slice(Fragment.from(outerBlockGroup), 0, 0);

    // Should not throw and should return block with no children
    expect(() => {
      prosemirrorSliceToSlicedBlocks(slice, editor.pmSchema);
    }).not.toThrow();

    const result = prosemirrorSliceToSlicedBlocks(slice, editor.pmSchema);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe("paragraph");
    expect(result.blocks[0].children).toHaveLength(0);

    destroy();
  });
});

// =============================================================================
// Tier 2A-B: getBlockInfoWithManualOffset — suggestion awareness
// =============================================================================

describe("Tier 2A-B - getBlockInfoWithManualOffset suggestion awareness", () => {
  it("should include suggestionBefore info when suggestion node precedes blockContent", () => {
    const { editor, destroy } = createMountedEditor();
    injectSuggestionBefore(editor, "Deleted", "Main");

    const doc = editor.prosemirrorState.doc;
    const blockContainerNode = doc.firstChild!.firstChild!;

    const blockInfo = getBlockInfoWithManualOffset(blockContainerNode, 0);

    expect(blockInfo.isBlockContainer).toBe(true);
    if (!blockInfo.isBlockContainer) {
      throw new Error("Expected blockInfo to be a blockContainer");
    }
    expect(blockInfo.blockContent.node.type.name).toBe("paragraph");
    expect(blockInfo.blockNoteType).toBe("paragraph");

    // NEW: should have suggestionBefore
    expect((blockInfo as any).suggestionBefore).toBeDefined();
    expect((blockInfo as any).suggestionBefore.node.type.name).toBe(
      "suggestion-paragraph",
    );
    expect((blockInfo as any).suggestionBefore.node.textContent).toBe(
      "Deleted",
    );

    destroy();
  });

  it("should include suggestionAfter info when suggestion node follows blockContent", () => {
    const { editor, destroy } = createMountedEditor();
    injectSuggestionAfter(editor, "Main", "Added");

    const doc = editor.prosemirrorState.doc;
    const blockContainerNode = doc.firstChild!.firstChild!;

    const blockInfo = getBlockInfoWithManualOffset(blockContainerNode, 0);

    expect(blockInfo.isBlockContainer).toBe(true);
    if (!blockInfo.isBlockContainer) {
      throw new Error("Expected blockInfo to be a blockContainer");
    }
    expect(blockInfo.blockContent.node.type.name).toBe("paragraph");

    // NEW: should have suggestionAfter
    expect((blockInfo as any).suggestionAfter).toBeDefined();
    expect((blockInfo as any).suggestionAfter.node.type.name).toBe(
      "suggestion-paragraph",
    );
    expect((blockInfo as any).suggestionAfter.node.textContent).toBe("Added");

    // Should NOT have suggestionBefore
    expect((blockInfo as any).suggestionBefore).toBeUndefined();

    destroy();
  });

  it("should include both suggestionBefore and suggestionAfter when both exist", () => {
    const { editor, destroy } = createMountedEditor();
    injectSuggestionBoth(editor, "Before", "Main", "After");

    const doc = editor.prosemirrorState.doc;
    const blockContainerNode = doc.firstChild!.firstChild!;

    const blockInfo = getBlockInfoWithManualOffset(blockContainerNode, 0);

    expect(blockInfo.isBlockContainer).toBe(true);
    if (!blockInfo.isBlockContainer) {
      throw new Error("Expected blockInfo to be a blockContainer");
    }
    expect((blockInfo as any).suggestionBefore).toBeDefined();
    expect((blockInfo as any).suggestionAfter).toBeDefined();
    expect((blockInfo as any).suggestionBefore.node.textContent).toBe("Before");
    expect((blockInfo as any).suggestionAfter.node.textContent).toBe("After");

    destroy();
  });

  it("should compute correct beforePos/afterPos for suggestion nodes", () => {
    const { editor, destroy } = createMountedEditor();
    injectSuggestionBefore(editor, "Hi", "Main");

    const doc = editor.prosemirrorState.doc;
    const blockContainerNode = doc.firstChild!.firstChild!;

    // Use a known offset to make position arithmetic deterministic
    const bnBlockBeforePos = 1; // position just before the blockContainer in the doc
    const blockInfo = getBlockInfoWithManualOffset(
      blockContainerNode,
      bnBlockBeforePos,
    );

    expect(blockInfo.isBlockContainer).toBe(true);
    if (!blockInfo.isBlockContainer) {
      throw new Error("Expected blockInfo to be a blockContainer");
    }
    const suggBefore = (blockInfo as any).suggestionBefore;
    expect(suggBefore).toBeDefined();

    // The suggestion node should start right after blockContainer opens
    expect(suggBefore.beforePos).toBe(bnBlockBeforePos + 1);
    expect(suggBefore.afterPos).toBe(
      suggBefore.beforePos + suggBefore.node.nodeSize,
    );

    // blockContent should start right after the suggestion node
    expect(blockInfo.blockContent.beforePos).toBe(suggBefore.afterPos);

    destroy();
  });

  it("should still find blockGroup when suggestion nodes are also present", () => {
    const { editor, destroy } = createMountedEditor();
    injectBlockWithChildren(editor, {
      mainText: "Main",
      childText: "Child",
      suggestionBefore: "Before",
      suggestionAfter: "After",
    });

    const doc = editor.prosemirrorState.doc;
    const blockContainerNode = doc.firstChild!.firstChild!;

    const blockInfo = getBlockInfoWithManualOffset(blockContainerNode, 0);

    expect(blockInfo.isBlockContainer).toBe(true);
    if (!blockInfo.isBlockContainer) {
      throw new Error("Expected blockInfo to be a blockContainer");
    }
    expect(blockInfo.childContainer).toBeDefined();
    expect(blockInfo.childContainer!.node.type.name).toBe("blockGroup");
    expect((blockInfo as any).suggestionBefore).toBeDefined();
    expect((blockInfo as any).suggestionAfter).toBeDefined();

    destroy();
  });
});

// =============================================================================
// Tier 2C: selectionAtBlockStart / selectionAtBlockEnd with suggestions
// =============================================================================

describe("Tier 2C - Backspace selectionAtBlockStart with suggestion nodes", () => {
  it("should revert non-paragraph block to paragraph when cursor is at start of leading suggestion", () => {
    const { editor, destroy } = createMountedEditor();

    // Create a heading block with a leading suggestion-heading
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;

      const suggestionHeading = nodes["suggestion-heading"].create(
        {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
          level: 2,
          __suggestionData: "true",
        },
        [editor.pmSchema.text("Deleted heading")],
      );

      const mainHeading = nodes.heading.create(
        {
          backgroundColor: "default",
          textAlignment: "left",
          textColor: "default",
          level: 2,
        },
        [editor.pmSchema.text("Main heading")],
      );

      const blockContainer = nodes.blockContainer.create({ id: "block-1" }, [
        suggestionHeading,
        mainHeading,
      ]);

      const blockGroup = nodes.blockGroup.create(null, [blockContainer]);
      const newDoc = nodes.doc.create(null, [blockGroup]);
      tr.replaceWith(0, tr.doc.content.size, newDoc.content);
    });

    // Verify the heading was set up correctly
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    expect(bc.childCount).toBe(2);
    expect(bc.firstChild!.type.name).toBe("suggestion-heading");
    expect(bc.child(1).type.name).toBe("heading");

    // Position cursor at start of the suggestion-heading (position 0 within the suggestion node)
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer && (blockInfo as any).suggestionBefore) {
      const suggPos = (blockInfo as any).suggestionBefore.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(suggPos);
    }

    // Simulate backspace
    editor._tiptapEditor.commands.keyboardShortcut("Backspace");

    // The block type should now be paragraph (reverted from heading)
    const newDoc = editor.prosemirrorState.doc;
    const newBc = newDoc.firstChild!.firstChild!;
    // Find the blockContent (non-suggestion child)
    let blockContentType = "";
    newBc.forEach((child) => {
      if (child.type.spec.group === "blockContent") {
        blockContentType = child.type.name;
      }
    });
    expect(blockContentType).toBe("paragraph");

    destroy();
  });

  it("should merge with previous block when Backspace at start of leading suggestion (paragraph block)", () => {
    const { editor, destroy } = createMountedEditor();

    // Two blocks: block-1 is normal paragraph, block-2 has suggestion-before
    injectTwoBlocks(editor, {
      block1: { mainText: "First" },
      block2: { mainText: "Second", suggestionBefore: "Deleted" },
    });

    // Get block info for block-2 to find suggestion position
    const doc = editor.prosemirrorState.doc;
    const block2 = doc.firstChild!.child(1);
    const block2Offset = doc.firstChild!.firstChild!.nodeSize + 1; // after block-1
    const block2Info = getBlockInfoWithManualOffset(block2, block2Offset);

    if (block2Info.isBlockContainer && (block2Info as any).suggestionBefore) {
      const suggPos = (block2Info as any).suggestionBefore.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(suggPos);
    }

    // Press Backspace — should merge with previous block
    editor._tiptapEditor.commands.keyboardShortcut("Backspace");

    // Should now have one block with combined content
    const blocks = editor.document;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text", text: "FirstSecond" }),
      ]),
    );

    destroy();
  });
});

describe("Tier 2C - Delete selectionAtBlockEnd with suggestion nodes", () => {
  it("should merge with next block when Delete at end of trailing suggestion", () => {
    const { editor, destroy } = createMountedEditor();

    // Two blocks: block-1 has trailing suggestion, block-2 is normal
    injectTwoBlocks(editor, {
      block1: { mainText: "First", suggestionAfter: "Added" },
      block2: { mainText: "Second" },
    });

    // Position cursor at end of trailing suggestion
    const doc = editor.prosemirrorState.doc;
    const block1 = doc.firstChild!.firstChild!;
    const block1Info = getBlockInfoWithManualOffset(block1, 1);

    if (block1Info.isBlockContainer && (block1Info as any).suggestionAfter) {
      const suggAfter = (block1Info as any).suggestionAfter;
      const endPos = suggAfter.afterPos - 1;
      editor._tiptapEditor.commands.setTextSelection(endPos);
    }

    // Press Delete — should merge next block into this one
    editor._tiptapEditor.commands.keyboardShortcut("Delete");

    // Should now have one block
    const blocks = editor.document;
    expect(blocks).toHaveLength(1);

    destroy();
  });
});

// =============================================================================
// Tier 2D: blockEmpty checks in Enter handler
// =============================================================================

describe("Tier 2D - Enter blockEmpty with suggestion nodes", () => {
  it("should NOT treat block as empty when blockContent is empty but leading suggestion has content", () => {
    const { editor, destroy } = createMountedEditor();

    // Block with non-empty suggestion, empty blockContent
    injectSuggestionBefore(editor, "Deleted text", "");

    // Position cursor in the empty blockContent
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer) {
      const pos = blockInfo.blockContent.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(pos);
    }

    // Count blocks before Enter
    const blocksBefore = editor.document;
    const blockCountBefore = blocksBefore.length;

    // Press Enter
    editor._tiptapEditor.commands.keyboardShortcut("Enter");

    // The block should NOT have been treated as "empty" and deleted/unnested.
    // Instead, a new block should be created (split behavior).
    const blocksAfter = editor.document;
    // We should have more blocks (split creates a new one), not fewer
    expect(blocksAfter.length).toBeGreaterThanOrEqual(blockCountBefore);

    destroy();
  });

  it("should treat block as truly empty when both blockContent and all suggestion nodes are empty", () => {
    const { editor, destroy } = createMountedEditor();

    // Block with empty suggestion AND empty blockContent
    injectSuggestionBefore(editor, "", "");

    // Position cursor in the empty blockContent
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer) {
      const pos = blockInfo.blockContent.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(pos);
    }

    // Press Enter on an empty block — should be treated as empty
    // (this is the normal behavior for empty blocks)
    editor._tiptapEditor.commands.keyboardShortcut("Enter");

    // Verify the doc is still valid
    editor.prosemirrorState.doc.check();

    destroy();
  });
});

// =============================================================================
// Tier 2E: Delete handler childCount assumption
// =============================================================================

describe("Tier 2E - Delete handler childCount assumption with suggestions", () => {
  it("should correctly handle next block with suggestion + blockContent + blockGroup (childCount != 2)", () => {
    const { editor, destroy } = createMountedEditor();

    // Create a doc with:
    // Block 1: paragraph("First") — cursor at end
    // Block 2: suggestion-paragraph("Deleted") + paragraph("") + blockGroup([child])
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;

      const bc1 = nodes.blockContainer.create({ id: "block-1" }, [
        nodes.paragraph.create(PARA_ATTRS, [editor.pmSchema.text("First")]),
      ]);

      const childParagraph = nodes.paragraph.create(PARA_ATTRS, [
        editor.pmSchema.text("Child"),
      ]);
      const childContainer = nodes.blockContainer.create({ id: "child-1" }, [
        childParagraph,
      ]);
      const blockGroup = nodes.blockGroup.create(null, [childContainer]);

      const bc2 = nodes.blockContainer.create({ id: "block-2" }, [
        nodes["suggestion-paragraph"].create(SUGGESTION_PARA_ATTRS, [
          editor.pmSchema.text("Deleted"),
        ]),
        nodes.paragraph.create(PARA_ATTRS), // empty paragraph
        blockGroup,
      ]);

      const outerGroup = nodes.blockGroup.create(null, [bc1, bc2]);
      const newDoc = nodes.doc.create(null, [outerGroup]);
      tr.replaceWith(0, tr.doc.content.size, newDoc.content);
    });

    // Position cursor at end of block-1's content
    const doc = editor.prosemirrorState.doc;
    const block1 = doc.firstChild!.firstChild!;
    const block1Info = getBlockInfoWithManualOffset(block1, 1);
    if (block1Info.isBlockContainer) {
      const endPos = block1Info.blockContent.afterPos - 1;
      editor._tiptapEditor.commands.setTextSelection(endPos);
    }

    // Press Delete — should handle the next block correctly despite childCount > 2
    // At minimum, this should NOT crash
    expect(() => {
      editor._tiptapEditor.commands.keyboardShortcut("Delete");
    }).not.toThrow();

    // Verify doc is still valid
    editor.prosemirrorState.doc.check();

    destroy();
  });
});

// =============================================================================
// Tier 3A: splitBlock with suggestion nodes
// =============================================================================

describe("Tier 3A - splitBlock with suggestion nodes", () => {
  it("should split block correctly when cursor is in blockContent with leading suggestion", () => {
    const { editor, destroy } = createMountedEditor();

    injectSuggestionBefore(editor, "Deleted", "HelloWorld");

    // Position cursor between "Hello" and "World" (offset 5 in the paragraph)
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer) {
      const pos = blockInfo.blockContent.beforePos + 1 + 5; // "Hello" = 5 chars
      editor._tiptapEditor.commands.setTextSelection(pos);
    }

    // Press Enter to split
    editor._tiptapEditor.commands.keyboardShortcut("Enter");

    // Verify doc is valid
    editor.prosemirrorState.doc.check();

    // Should have 2 blocks now
    const blocks = editor.document;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].content).toEqual([
      expect.objectContaining({ text: "Hello" }),
    ]);
    expect(blocks[1].content).toEqual([
      expect.objectContaining({ text: "World" }),
    ]);

    // The leading suggestion should stay with the first block
    const newDoc = editor.prosemirrorState.doc;
    const firstBc = newDoc.firstChild!.firstChild!;
    let hasSuggestion = false;
    firstBc.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        hasSuggestion = true;
      }
    });
    expect(hasSuggestion).toBe(true);

    destroy();
  });

  it("should split block correctly when cursor is in blockContent with trailing suggestion", () => {
    const { editor, destroy } = createMountedEditor();

    injectSuggestionAfter(editor, "HelloWorld", "Added");

    // Position cursor between "Hello" and "World"
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer) {
      const pos = blockInfo.blockContent.beforePos + 1 + 5;
      editor._tiptapEditor.commands.setTextSelection(pos);
    }

    // Split
    editor._tiptapEditor.commands.keyboardShortcut("Enter");

    // Verify valid
    editor.prosemirrorState.doc.check();

    // Two blocks
    const blocks = editor.document;
    expect(blocks).toHaveLength(2);

    // The trailing suggestion should stay with the second block
    const newDoc = editor.prosemirrorState.doc;
    const secondBc = newDoc.firstChild!.child(1);
    let hasSuggestion = false;
    secondBc.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        hasSuggestion = true;
      }
    });
    expect(hasSuggestion).toBe(true);

    destroy();
  });

  it("should not crash when cursor is inside a suggestion node and Enter is pressed", () => {
    const { editor, destroy } = createMountedEditor();

    injectSuggestionBefore(editor, "Hello suggestion", "Main content");

    // Position cursor inside the suggestion node at offset 5 ("Hello|suggestion")
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer && (blockInfo as any).suggestionBefore) {
      const suggPos = (blockInfo as any).suggestionBefore.beforePos + 1 + 5;
      editor._tiptapEditor.commands.setTextSelection(suggPos);
    }

    // Press Enter — should not crash
    expect(() => {
      editor._tiptapEditor.commands.keyboardShortcut("Enter");
    }).not.toThrow();

    // Verify doc is still valid
    editor.prosemirrorState.doc.check();

    // Should have 2 blocks now (a split happened)
    const blocks = editor.document;
    expect(blocks).toHaveLength(2);

    // The split should happen at blockContent start (redirected from suggestion),
    // so the first block keeps the suggestion + its content, and the second block
    // gets all the main content.
    // Block 1 should have suggestion preserved at PM level
    const newDoc = editor.prosemirrorState.doc;
    const firstBc = newDoc.firstChild!.firstChild!;
    let firstHasSuggestion = false;
    let firstBlockContentText = "";
    firstBc.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        firstHasSuggestion = true;
      }
      if (child.type.spec.group === "blockContent") {
        firstBlockContentText = child.textContent;
      }
    });
    expect(firstHasSuggestion).toBe(true);

    // The suggestion should be preserved intact (not split)
    const suggNode = firstBc.firstChild!;
    expect(suggNode.type.name).toBe("suggestion-paragraph");
    expect(suggNode.textContent).toBe("Hello suggestion");

    // First block's blockContent should be empty (split at start of blockContent)
    expect(firstBlockContentText).toBe("");

    // Second block should have the main content
    expect(blocks[1].content).toEqual([
      expect.objectContaining({ text: "Main content" }),
    ]);

    destroy();
  });
});

// =============================================================================
// Tier 3B: mergeBlocks with suggestion nodes
// =============================================================================

describe("Tier 3B - mergeBlocks with suggestion nodes", () => {
  it("should preserve leading suggestion of second block during merge", () => {
    const { editor, destroy } = createMountedEditor();

    injectTwoBlocks(editor, {
      block1: { mainText: "First" },
      block2: { mainText: "Second", suggestionBefore: "Deleted" },
    });

    // Position cursor at start of block-2's leading suggestion (= effective block start)
    const doc = editor.prosemirrorState.doc;
    const block2 = doc.firstChild!.child(1);
    const block2Offset =
      1 + doc.firstChild!.firstChild!.nodeSize; // after blockGroup open + block1
    const block2Info = getBlockInfoWithManualOffset(block2, block2Offset);
    if (block2Info.isBlockContainer && (block2Info as any).suggestionBefore) {
      const pos = (block2Info as any).suggestionBefore.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(pos);
    }

    // Backspace to merge
    editor._tiptapEditor.commands.keyboardShortcut("Backspace");

    // Verify doc is valid
    editor.prosemirrorState.doc.check();

    // Should have 1 block with merged content
    const blocks = editor.document;
    expect(blocks).toHaveLength(1);

    // Check that the suggestion node survived in the PM doc
    const newDoc = editor.prosemirrorState.doc;
    const mergedBc = newDoc.firstChild!.firstChild!;
    let hasSuggestion = false;
    mergedBc.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        hasSuggestion = true;
      }
    });
    expect(hasSuggestion).toBe(true);

    destroy();
  });

  it("should preserve trailing suggestion of first block during merge", () => {
    const { editor, destroy } = createMountedEditor();

    injectTwoBlocks(editor, {
      block1: { mainText: "First", suggestionAfter: "Added" },
      block2: { mainText: "Second" },
    });

    // Position cursor at start of block-2's blockContent (selectionAtBlockStart since no suggestion-before)
    const doc = editor.prosemirrorState.doc;
    const block2 = doc.firstChild!.child(1);
    const block2Offset = 1 + doc.firstChild!.firstChild!.nodeSize;
    const block2Info = getBlockInfoWithManualOffset(block2, block2Offset);
    if (block2Info.isBlockContainer) {
      const pos = block2Info.blockContent.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(pos);
    }

    // Backspace to merge
    editor._tiptapEditor.commands.keyboardShortcut("Backspace");

    // Verify doc is valid
    editor.prosemirrorState.doc.check();

    // Should have merged into 1 block
    const blocks = editor.document;
    expect(blocks).toHaveLength(1);

    // Check that the trailing suggestion survived in the PM doc
    const newDoc = editor.prosemirrorState.doc;
    const mergedBc = newDoc.firstChild!.firstChild!;
    let hasSuggestion = false;
    mergedBc.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        hasSuggestion = true;
      }
    });
    expect(hasSuggestion).toBe(true);

    destroy();
  });
});

// =============================================================================
// Tier 4A: dragging with suggestion nodes
// =============================================================================

describe("Tier 4A - dragging with suggestion nodes", () => {
  it("should correctly resolve block when selection is inside a suggestion node", () => {
    const { editor, destroy } = createMountedEditor();
    injectSuggestionBefore(editor, "Deleted text", "Main content");

    // Place selection inside the suggestion node
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);

    if (blockInfo.isBlockContainer && (blockInfo as any).suggestionBefore) {
      const suggPos = (blockInfo as any).suggestionBefore.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(suggPos);
    }

    // The selection's parent node should be resolvable to a block
    const state = editor._tiptapEditor.state;
    const $from = state.selection.$from;
    const parentNode = $from.node();
    const parentGroup = parentNode.type.spec.group as string;

    // The parent should be either blockContent or suggestionBlockContent
    expect(
      parentGroup === "blockContent" ||
        parentGroup === "suggestionBlockContent",
    ).toBe(true);

    destroy();
  });
});

// =============================================================================
// Tier 5A: getBlockFromPos stub block
// =============================================================================

describe("Tier 5A - getBlockFromPos stub block", () => {
  it("should not return hardcoded 'abc' id for suggestion node positions", () => {
    const { editor, destroy } = createMountedEditor();
    injectSuggestionBefore(editor, "Deleted", "Main");

    // Verify the blockContainer has a real ID
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    expect(bc.attrs.id).toBe("block-1");

    // The suggestion node is the first child
    const suggNode = bc.firstChild!;
    expect(suggNode.type.name).toBe("suggestion-paragraph");

    // Note: We can't easily call getBlockFromPos directly without a NodeView context.
    // But we can verify the mechanism: when resolving the suggestion node's position,
    // we should be able to find the parent blockContainer's ID.
    const suggBeforePos = 2; // position of suggestion node (after doc + blockGroup + blockContainer opens)
    const resolvedNode = doc.resolve(suggBeforePos).node();
    expect(resolvedNode.type.name.startsWith("suggestion-")).toBe(true);

    // Walk up to find the blockContainer
    const depth = doc.resolve(suggBeforePos).depth;
    let parentId: string | undefined;
    for (let d = depth; d >= 0; d--) {
      const ancestor = doc.resolve(suggBeforePos).node(d);
      if (ancestor.type.name === "blockContainer") {
        parentId = ancestor.attrs.id;
        break;
      }
    }
    expect(parentId).toBe("block-1");

    destroy();
  });
});

// =============================================================================
// Tier 5B: fixColumnList.isEmptyColumn
// =============================================================================

// Note: Column tests require the multi-column extension which may not be available
// in the core package. These tests document the expected behavior but may need
// to be moved to the xl-multi-column package.

// =============================================================================
// Tier 5C: Placeholder empty doc check
// =============================================================================

describe("Tier 5C - Placeholder with suggestion nodes", () => {
  it("should not break when suggestion nodes increase doc content size beyond 6", () => {
    const { editor, destroy } = createMountedEditor();

    // Inject suggestion — doc size will be > 6
    injectSuggestionBefore(editor, "", "");

    // The doc should still be valid
    editor.prosemirrorState.doc.check();

    // Doc content size should be > 6 (the hardcoded empty-doc check)
    expect(editor.prosemirrorState.doc.content.size).toBeGreaterThan(6);

    destroy();
  });
});

// =============================================================================
// Integration: Manual test scenario coverage
// =============================================================================

describe("Integration - Multi-block scenarios with suggestion nodes", () => {
  /**
   * Helper: creates the 3-block document from App.tsx:
   * Block 1: [suggestion-paragraph("Hello from suggestion!"), paragraph("Hello from main!")]
   * Block 2: [paragraph("Second block main"), suggestion-paragraph("Trailing suggestion")]
   * Block 3: [paragraph("Third block, no suggestions")]
   */
  function injectThreeBlocks(editor: BlockNoteEditor<any, any, any>) {
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;

      const bc1 = nodes.blockContainer.create({ id: "block-1" }, [
        nodes["suggestion-paragraph"].create(SUGGESTION_PARA_ATTRS, [
          editor.pmSchema.text("Hello from suggestion!"),
        ]),
        nodes.paragraph.create(PARA_ATTRS, [
          editor.pmSchema.text("Hello from main!"),
        ]),
      ]);

      const bc2 = nodes.blockContainer.create({ id: "block-2" }, [
        nodes.paragraph.create(PARA_ATTRS, [
          editor.pmSchema.text("Second block main"),
        ]),
        nodes["suggestion-paragraph"].create(SUGGESTION_PARA_ATTRS, [
          editor.pmSchema.text("Trailing suggestion"),
        ]),
      ]);

      const bc3 = nodes.blockContainer.create({ id: "block-3" }, [
        nodes.paragraph.create(PARA_ATTRS, [
          editor.pmSchema.text("Third block, no suggestions"),
        ]),
      ]);

      const blockGroup = nodes.blockGroup.create(null, [bc1, bc2, bc3]);
      const newDoc = nodes.doc.create(null, [blockGroup]);
      tr.replaceWith(0, tr.doc.content.size, newDoc.content);
    });
  }

  // --- Block API transparency ---

  it("editor.document should show only blockContent, not suggestion nodes", () => {
    const { editor, destroy } = createMountedEditor();
    injectThreeBlocks(editor);

    const blocks = editor.document;
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].content).toEqual([
      expect.objectContaining({ text: "Hello from main!" }),
    ]);
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].content).toEqual([
      expect.objectContaining({ text: "Second block main" }),
    ]);
    expect(blocks[2].type).toBe("paragraph");
    expect(blocks[2].content).toEqual([
      expect.objectContaining({ text: "Third block, no suggestions" }),
    ]);

    destroy();
  });

  // --- Backspace: merge block 2 into block 1 ---

  it("Backspace at start of block-2 (with leading main content) should merge into block-1", () => {
    const { editor, destroy } = createMountedEditor();
    injectThreeBlocks(editor);

    // Position cursor at start of block-2's blockContent
    const doc = editor.prosemirrorState.doc;
    const block2 = doc.firstChild!.child(1);
    const block2Offset = 1 + doc.firstChild!.firstChild!.nodeSize;
    const block2Info = getBlockInfoWithManualOffset(block2, block2Offset);
    if (block2Info.isBlockContainer) {
      editor._tiptapEditor.commands.setTextSelection(
        block2Info.blockContent.beforePos + 1,
      );
    }

    editor._tiptapEditor.commands.keyboardShortcut("Backspace");
    editor.prosemirrorState.doc.check();

    // Should now have 2 blocks (block-1 merged with block-2, block-3 remains)
    const blocks = editor.document;
    expect(blocks).toHaveLength(2);

    // First block should have merged content
    expect(blocks[0].content).toEqual([
      expect.objectContaining({ text: "Hello from main!Second block main" }),
    ]);

    destroy();
  });

  // --- Backspace: merge block 3 into block 2 ---

  it("Backspace at start of block-3 should merge into block-2, preserving trailing suggestion", () => {
    const { editor, destroy } = createMountedEditor();
    injectThreeBlocks(editor);

    // Position cursor at start of block-3's blockContent
    const doc = editor.prosemirrorState.doc;
    const block3 = doc.firstChild!.child(2);
    const block3Offset =
      1 +
      doc.firstChild!.firstChild!.nodeSize +
      doc.firstChild!.child(1).nodeSize;
    const block3Info = getBlockInfoWithManualOffset(block3, block3Offset);
    if (block3Info.isBlockContainer) {
      editor._tiptapEditor.commands.setTextSelection(
        block3Info.blockContent.beforePos + 1,
      );
    }

    editor._tiptapEditor.commands.keyboardShortcut("Backspace");
    editor.prosemirrorState.doc.check();

    // Should now have 2 blocks
    const blocks = editor.document;
    expect(blocks).toHaveLength(2);

    // Second block should have merged content
    expect(blocks[1].content).toEqual([
      expect.objectContaining({
        text: "Second block mainThird block, no suggestions",
      }),
    ]);

    // Trailing suggestion from block-2 should be preserved at PM level
    const newDoc = editor.prosemirrorState.doc;
    const mergedBlock = newDoc.firstChild!.child(1);
    let trailingSuggestionText: string | undefined;
    mergedBlock.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        trailingSuggestionText = child.textContent;
      }
    });
    expect(trailingSuggestionText).toBe("Trailing suggestion");

    destroy();
  });

  // --- Enter: split inside main paragraph of block with leading suggestion ---

  it("Enter inside main paragraph should split block, suggestion stays with first block", () => {
    const { editor, destroy } = createMountedEditor();
    injectThreeBlocks(editor);

    // Position cursor inside block-1's paragraph at offset 5 ("Hello| from main!")
    const doc = editor.prosemirrorState.doc;
    const block1 = doc.firstChild!.firstChild!;
    const block1Info = getBlockInfoWithManualOffset(block1, 1);
    if (block1Info.isBlockContainer) {
      // Position after "Hello"
      editor._tiptapEditor.commands.setTextSelection(
        block1Info.blockContent.beforePos + 1 + 5,
      );
    }

    editor._tiptapEditor.commands.keyboardShortcut("Enter");
    editor.prosemirrorState.doc.check();

    // Should now have 4 blocks
    const blocks = editor.document;
    expect(blocks).toHaveLength(4);

    // First block should have "Hello"
    expect(blocks[0].content).toEqual([
      expect.objectContaining({ text: "Hello" }),
    ]);
    // Second block should have " from main!"
    expect(blocks[1].content).toEqual([
      expect.objectContaining({ text: " from main!" }),
    ]);

    // Leading suggestion should stay with first block at PM level
    const newDoc = editor.prosemirrorState.doc;
    const firstBc = newDoc.firstChild!.firstChild!;
    let suggestionText: string | undefined;
    firstBc.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        suggestionText = child.textContent;
      }
    });
    expect(suggestionText).toBe("Hello from suggestion!");

    destroy();
  });

  // --- Enter: split inside suggestion text (Tier 3A behavior) ---

  it("Enter inside suggestion text should split at blockContent start, keeping suggestion intact", () => {
    const { editor, destroy } = createMountedEditor();
    injectThreeBlocks(editor);

    // Position cursor inside block-1's suggestion at offset 5 ("Hello| from suggestion!")
    const doc = editor.prosemirrorState.doc;
    const block1 = doc.firstChild!.firstChild!;
    const block1Info = getBlockInfoWithManualOffset(block1, 1);
    if (block1Info.isBlockContainer && (block1Info as any).suggestionBefore) {
      const suggPos =
        (block1Info as any).suggestionBefore.beforePos + 1 + 5;
      editor._tiptapEditor.commands.setTextSelection(suggPos);
    }

    editor._tiptapEditor.commands.keyboardShortcut("Enter");
    editor.prosemirrorState.doc.check();

    // Should now have 4 blocks (3 original + 1 from split)
    const blocks = editor.document;
    expect(blocks).toHaveLength(4);

    // The suggestion should be intact (not split) in the first block
    const newDoc = editor.prosemirrorState.doc;
    const firstBc = newDoc.firstChild!.firstChild!;
    let suggestionText = "";
    let blockContentText = "";
    firstBc.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        suggestionText = child.textContent;
      }
      if (child.type.spec.group === "blockContent") {
        blockContentText = child.textContent;
      }
    });
    // Suggestion should be fully intact
    expect(suggestionText).toBe("Hello from suggestion!");
    // BlockContent should be empty (split at start)
    expect(blockContentText).toBe("");

    // Second block should have the original main content
    expect(blocks[1].content).toEqual([
      expect.objectContaining({ text: "Hello from main!" }),
    ]);

    destroy();
  });

  // --- Delete at end of block-2's trailing suggestion ---

  it("Delete at end of trailing suggestion should merge with next block", () => {
    const { editor, destroy } = createMountedEditor();
    injectThreeBlocks(editor);

    // Position cursor at end of block-2's trailing suggestion
    const doc = editor.prosemirrorState.doc;
    const block2 = doc.firstChild!.child(1);
    const block2Offset = 1 + doc.firstChild!.firstChild!.nodeSize;
    const block2Info = getBlockInfoWithManualOffset(block2, block2Offset);
    if (block2Info.isBlockContainer && (block2Info as any).suggestionAfter) {
      const suggAfter = (block2Info as any).suggestionAfter;
      // Position at end of trailing suggestion content
      editor._tiptapEditor.commands.setTextSelection(suggAfter.afterPos - 1);
    }

    editor._tiptapEditor.commands.keyboardShortcut("Delete");
    editor.prosemirrorState.doc.check();

    // Should now have 2 blocks (block-2 merged with block-3)
    const blocks = editor.document;
    expect(blocks).toHaveLength(2);

    // The merged block should have combined content
    expect(blocks[1].content).toEqual([
      expect.objectContaining({
        text: "Second block mainThird block, no suggestions",
      }),
    ]);

    destroy();
  });

  // --- Undo: edit in suggestion, then undo ---

  it("Undo should revert edits made inside suggestion nodes", () => {
    const { editor, destroy } = createMountedEditor();

    // Inject suggestion without adding to history, so undo only affects user edits
    const view = editor._tiptapEditor.view;
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;
      const suggestionParagraph = nodes["suggestion-paragraph"].create(
        SUGGESTION_PARA_ATTRS,
        [editor.pmSchema.text("Original suggestion")],
      );
      const mainParagraph = nodes.paragraph.create(PARA_ATTRS, [
        editor.pmSchema.text("Main content"),
      ]);
      const bc = nodes.blockContainer.create({ id: "block-1" }, [
        suggestionParagraph,
        mainParagraph,
      ]);
      const bg = nodes.blockGroup.create(null, [bc]);
      const newDoc = nodes.doc.create(null, [bg]);
      tr.replaceWith(0, tr.doc.content.size, newDoc.content);
      tr.setMeta("addToHistory", false);
    });

    // Position cursor inside suggestion and type a character
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer && (blockInfo as any).suggestionBefore) {
      const suggPos = (blockInfo as any).suggestionBefore.beforePos + 1;
      editor._tiptapEditor.commands.setTextSelection(suggPos);
    }

    // Insert text
    editor._tiptapEditor.commands.insertContent("X");

    // Verify the text was inserted
    let suggText = "";
    editor.prosemirrorState.doc.firstChild!.firstChild!.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        suggText = child.textContent;
      }
    });
    expect(suggText).toBe("XOriginal suggestion");

    // Undo using PM history command
    undo(view.state, view.dispatch);

    // Verify the text was reverted
    suggText = "";
    editor.prosemirrorState.doc.firstChild!.firstChild!.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        suggText = child.textContent;
      }
    });
    expect(suggText).toBe("Original suggestion");

    destroy();
  });

  // --- Undo after merge ---

  it("Undo after merge should restore blocks with suggestion nodes", () => {
    const { editor, destroy } = createMountedEditor();

    // Inject without adding to history
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;
      const bc1 = nodes.blockContainer.create({ id: "block-1" }, [
        nodes.paragraph.create(PARA_ATTRS, [editor.pmSchema.text("First")]),
      ]);
      const bc2 = nodes.blockContainer.create({ id: "block-2" }, [
        nodes["suggestion-paragraph"].create(SUGGESTION_PARA_ATTRS, [
          editor.pmSchema.text("Deleted"),
        ]),
        nodes.paragraph.create(PARA_ATTRS, [editor.pmSchema.text("Second")]),
      ]);
      const bg = nodes.blockGroup.create(null, [bc1, bc2]);
      const newDoc = nodes.doc.create(null, [bg]);
      tr.replaceWith(0, tr.doc.content.size, newDoc.content);
      tr.setMeta("addToHistory", false);
    });

    // Position at effective start of block-2 and Backspace
    const doc = editor.prosemirrorState.doc;
    const block2 = doc.firstChild!.child(1);
    const block2Offset = 1 + doc.firstChild!.firstChild!.nodeSize;
    const block2Info = getBlockInfoWithManualOffset(block2, block2Offset);
    if (block2Info.isBlockContainer && (block2Info as any).suggestionBefore) {
      const suggBefore = (block2Info as any).suggestionBefore;
      editor._tiptapEditor.commands.setTextSelection(
        suggBefore.beforePos + 1,
      );
    }

    editor._tiptapEditor.commands.keyboardShortcut("Backspace");
    editor.prosemirrorState.doc.check();

    // Verify merge happened
    expect(editor.document).toHaveLength(1);

    // Undo using PM history command
    const view = editor._tiptapEditor.view;
    undo(view.state, view.dispatch);
    editor.prosemirrorState.doc.check();

    // Should be back to 2 blocks
    expect(editor.document).toHaveLength(2);

    // The suggestion node should be restored on block-2
    const restoredDoc = editor.prosemirrorState.doc;
    const restoredBlock2 = restoredDoc.firstChild!.child(1);
    let restoredSuggestionText: string | undefined;
    restoredBlock2.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        restoredSuggestionText = child.textContent;
      }
    });
    expect(restoredSuggestionText).toBe("Deleted");

    destroy();
  });

  // --- Formatting inside suggestion nodes ---

  it("Bold formatting should work inside suggestion node content", () => {
    const { editor, destroy } = createMountedEditor();
    injectSuggestionBefore(editor, "Hello suggestion", "Main content");

    // Select text inside suggestion node
    const doc = editor.prosemirrorState.doc;
    const bc = doc.firstChild!.firstChild!;
    const blockInfo = getBlockInfoWithManualOffset(bc, 1);
    if (blockInfo.isBlockContainer && (blockInfo as any).suggestionBefore) {
      const suggBefore = (blockInfo as any).suggestionBefore;
      // Select "Hello" (first 5 chars)
      editor._tiptapEditor.commands.setTextSelection({
        from: suggBefore.beforePos + 1,
        to: suggBefore.beforePos + 1 + 5,
      });
    }

    // Toggle bold
    editor._tiptapEditor.commands.toggleMark("bold");

    // Verify the mark was applied
    const newDoc = editor.prosemirrorState.doc;
    const suggestion = newDoc.firstChild!.firstChild!.firstChild!;
    expect(suggestion.type.name).toBe("suggestion-paragraph");
    // First child should be text with bold mark
    const firstChild = suggestion.firstChild!;
    expect(firstChild.text).toBe("Hello");
    expect(firstChild.marks.some((m) => m.type.name === "bold")).toBe(true);

    destroy();
  });

  // --- Enter in block with trailing suggestion ---

  it("Enter inside main paragraph of block-2 (trailing suggestion) should preserve trailing suggestion", () => {
    const { editor, destroy } = createMountedEditor();
    injectThreeBlocks(editor);

    // Position cursor inside block-2's main paragraph at offset 7 ("Second | block main")
    const doc = editor.prosemirrorState.doc;
    const block2 = doc.firstChild!.child(1);
    const block2Offset = 1 + doc.firstChild!.firstChild!.nodeSize;
    const block2Info = getBlockInfoWithManualOffset(block2, block2Offset);
    if (block2Info.isBlockContainer) {
      editor._tiptapEditor.commands.setTextSelection(
        block2Info.blockContent.beforePos + 1 + 7,
      );
    }

    editor._tiptapEditor.commands.keyboardShortcut("Enter");
    editor.prosemirrorState.doc.check();

    // Should now have 4 blocks
    const blocks = editor.document;
    expect(blocks).toHaveLength(4);

    // Block at position 1 should have "Second "
    expect(blocks[1].content).toEqual([
      expect.objectContaining({ text: "Second " }),
    ]);
    // Block at position 2 should have "block main"
    expect(blocks[2].content).toEqual([
      expect.objectContaining({ text: "block main" }),
    ]);

    // Trailing suggestion should stay with the second part (position 2 at PM level)
    const newDoc = editor.prosemirrorState.doc;
    const splitSecondHalf = newDoc.firstChild!.child(2);
    let splitTrailingSuggestionText: string | undefined;
    splitSecondHalf.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        splitTrailingSuggestionText = child.textContent;
      }
    });
    expect(splitTrailingSuggestionText).toBe("Trailing suggestion");

    destroy();
  });
});

// =============================================================================
// moveBlocks: suggestion nodes should survive block moves
// =============================================================================
describe("moveBlocks with suggestion nodes", () => {
  it("should preserve leading suggestion when moving block up", () => {
    const { editor, destroy } = createMountedEditor();

    // Create 2 blocks:
    // block-1: plain paragraph "First"
    // block-2: [suggestion-paragraph("Deleted"), paragraph("Second")]
    injectTwoBlocks(editor, {
      block1: { mainText: "First" },
      block2: { mainText: "Second", suggestionBefore: "Deleted" },
    });

    // Verify setup: block-2 has suggestion node
    const block2 = editor.prosemirrorState.doc.firstChild!.child(1);
    let hasSuggestion = false;
    block2.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        hasSuggestion = true;
      }
    });
    expect(hasSuggestion).toBe(true);

    // Move block-2 up (should become first block)
    moveBlocksUp(editor, "block-2");

    // Verify block-2 is now first and still has its suggestion node
    const doc = editor.prosemirrorState.doc;
    const firstBlock = doc.firstChild!.child(0);
    expect(firstBlock.attrs.id).toBe("block-2");

    let preservedSuggestionText: string | undefined;
    firstBlock.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        preservedSuggestionText = child.textContent;
      }
    });
    expect(preservedSuggestionText).toBe("Deleted");

    // Block API should still show clean blocks
    const blocks = editor.document;
    expect(blocks[0].id).toBe("block-2");
    expect(blocks[0].content).toEqual([
      expect.objectContaining({ text: "Second" }),
    ]);

    destroy();
  });

  it("should preserve trailing suggestion when moving block down", () => {
    const { editor, destroy } = createMountedEditor();

    // Create 2 blocks:
    // block-1: [paragraph("First"), suggestion-paragraph("Added")]
    // block-2: plain paragraph "Second"
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;

      const para1 = nodes.paragraph.create(PARA_ATTRS, [
        editor.pmSchema.text("First"),
      ]);
      const suggestion = nodes["suggestion-paragraph"].create(
        SUGGESTION_PARA_ATTRS,
        [editor.pmSchema.text("Added")],
      );
      const bc1 = nodes.blockContainer.create({ id: "block-1" }, [
        para1,
        suggestion,
      ]);

      const para2 = nodes.paragraph.create(PARA_ATTRS, [
        editor.pmSchema.text("Second"),
      ]);
      const bc2 = nodes.blockContainer.create({ id: "block-2" }, [para2]);

      const blockGroup = nodes.blockGroup.create({}, [bc1, bc2]);
      const doc = nodes.doc.create({}, [blockGroup]);

      tr.replaceWith(0, tr.doc.nodeSize - 2, doc.content);
    });

    // Verify setup
    const block1 = editor.prosemirrorState.doc.firstChild!.child(0);
    let hasTrailingSuggestion = false;
    block1.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        hasTrailingSuggestion = true;
      }
    });
    expect(hasTrailingSuggestion).toBe(true);

    // Move block-1 down (should become second block)
    moveBlocksDown(editor, "block-1");

    // Verify block-1 is now second and still has its trailing suggestion
    const doc = editor.prosemirrorState.doc;
    const secondBlock = doc.firstChild!.child(1);
    expect(secondBlock.attrs.id).toBe("block-1");

    let preservedSuggestionText: string | undefined;
    secondBlock.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        preservedSuggestionText = child.textContent;
      }
    });
    expect(preservedSuggestionText).toBe("Added");

    destroy();
  });

  it("should preserve suggestions on both sides when moving block", () => {
    const { editor, destroy } = createMountedEditor();

    // Create 2 blocks:
    // block-1: [suggestion("Before"), paragraph("Main"), suggestion("After")]
    // block-2: plain paragraph "Other"
    editor.transact((tr) => {
      const { nodes } = editor.pmSchema;

      const suggBefore = nodes["suggestion-paragraph"].create(
        SUGGESTION_PARA_ATTRS,
        [editor.pmSchema.text("Before")],
      );
      const para1 = nodes.paragraph.create(PARA_ATTRS, [
        editor.pmSchema.text("Main"),
      ]);
      const suggAfter = nodes["suggestion-paragraph"].create(
        SUGGESTION_PARA_ATTRS,
        [editor.pmSchema.text("After")],
      );
      const bc1 = nodes.blockContainer.create({ id: "block-1" }, [
        suggBefore,
        para1,
        suggAfter,
      ]);

      const para2 = nodes.paragraph.create(PARA_ATTRS, [
        editor.pmSchema.text("Other"),
      ]);
      const bc2 = nodes.blockContainer.create({ id: "block-2" }, [para2]);

      const blockGroup = nodes.blockGroup.create({}, [bc1, bc2]);
      const doc = nodes.doc.create({}, [blockGroup]);

      tr.replaceWith(0, tr.doc.nodeSize - 2, doc.content);
    });

    // Move block-1 down
    moveBlocksDown(editor, "block-1");

    // Verify block-1 preserved both suggestion nodes
    const doc = editor.prosemirrorState.doc;
    const movedBlock = doc.firstChild!.child(1);
    expect(movedBlock.attrs.id).toBe("block-1");

    let suggBeforeText: string | undefined;
    let suggAfterText: string | undefined;
    let contentText: string | undefined;
    let foundContent = false;
    movedBlock.forEach((child) => {
      if (child.type.name.startsWith("suggestion-")) {
        if (!foundContent) {
          suggBeforeText = child.textContent;
        } else {
          suggAfterText = child.textContent;
        }
      }
      if (child.type.spec.group === "blockContent") {
        foundContent = true;
        contentText = child.textContent;
      }
    });
    expect(suggBeforeText).toBe("Before");
    expect(suggAfterText).toBe("After");
    expect(contentText).toBe("Main");

    destroy();
  });
});
