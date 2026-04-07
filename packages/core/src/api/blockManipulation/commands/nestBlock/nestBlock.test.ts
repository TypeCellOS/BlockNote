import { describe, expect, it } from "vitest";

import { afterAll, beforeAll } from "vitest";
import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";

/**
 * Custom test setup with a document designed to reproduce nesting/unnesting bugs.
 *
 * BLO-835 / BLO-899: liftListItem produces invalid content when a nested block
 *   has siblings after it in the same blockGroup.
 * BLO-953: Backspace at start of indented block with multi-level children
 *   causes deeply nested content to be lost.
 * BLO-844 / BLO-847: Deleting parent block then operating on children causes
 *   RangeError.
 */

function setupNestTestEnv() {
  let editor: BlockNoteEditor;
  const div = document.createElement("div");

  beforeAll(() => {
    editor = BlockNoteEditor.create();
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  return (doc: PartialBlock[]) => {
    editor.replaceBlocks(editor.document, doc);
    return editor;
  };
}

const withEditor = setupNestTestEnv();

describe("unnestBlock / liftListItem", () => {
  // BLO-835: liftListItem error with siblings after nested children
  // Structure:
  //   block1
  //     block2        ← unnest this
  //       block3
  //       block4
  //     block5
  //
  // Expected: block2 lifts out, block5 becomes child of block2
  describe("BLO-835: unnest block with siblings after and nested children", () => {
    it("should not throw when unnesting a block that has siblings after it", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
          children: [
            {
              id: "block2",
              type: "paragraph",
              content: "Block 2",
              children: [
                {
                  id: "block3",
                  type: "paragraph",
                  content: "Block 3",
                },
                {
                  id: "block4",
                  type: "paragraph",
                  content: "Block 4",
                },
              ],
            },
            {
              id: "block5",
              type: "paragraph",
              content: "Block 5",
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("block2", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      expect(editor.document).toMatchSnapshot();
    });

    it("should move siblings after into lifted block's children", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
          children: [
            {
              id: "block2",
              type: "paragraph",
              content: "Block 2",
            },
            {
              id: "block5",
              type: "paragraph",
              content: "Block 5",
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("block2", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      // block2 should now be at root level after block1
      // block5 should be a child of block2
      expect(editor.document).toMatchSnapshot();
    });

    it("should handle unnesting the first of many siblings", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
          children: [
            {
              id: "block2",
              type: "paragraph",
              content: "Block 2",
            },
            {
              id: "block3",
              type: "paragraph",
              content: "Block 3",
            },
            {
              id: "block4",
              type: "paragraph",
              content: "Block 4",
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("block2", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      // block2 at root, block3 and block4 become children of block2
      expect(editor.document).toMatchSnapshot();
    });
  });

  // BLO-899: Shift-Tab on second-level nested child (not last) causes error
  // Structure:
  //   parent
  //     child1
  //       grandchild1  ← unnest this
  //       grandchild2
  //     child2
  //       grandchild3
  //       grandchild4
  //
  describe("BLO-899: Shift-Tab on second-level nested block", () => {
    it("should not throw when unnesting a deeply nested block with siblings", () => {
      const editor = withEditor([
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [
            {
              id: "child1",
              type: "paragraph",
              content: "Child 1",
              children: [
                {
                  id: "grandchild1",
                  type: "paragraph",
                  content: "Grandchild 1",
                },
                {
                  id: "grandchild2",
                  type: "paragraph",
                  content: "Grandchild 2",
                },
              ],
            },
            {
              id: "child2",
              type: "paragraph",
              content: "Child 2",
              children: [
                {
                  id: "grandchild3",
                  type: "paragraph",
                  content: "Grandchild 3",
                },
                {
                  id: "grandchild4",
                  type: "paragraph",
                  content: "Grandchild 4",
                },
              ],
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("grandchild1", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      // grandchild1 should become a sibling of child1 (at same level)
      // grandchild2 should become a child of grandchild1
      expect(editor.document).toMatchSnapshot();
    });

    it("should not throw when unnesting the last deeply nested block", () => {
      const editor = withEditor([
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [
            {
              id: "child1",
              type: "paragraph",
              content: "Child 1",
              children: [
                {
                  id: "grandchild1",
                  type: "paragraph",
                  content: "Grandchild 1",
                },
                {
                  id: "grandchild2",
                  type: "paragraph",
                  content: "Grandchild 2",
                },
              ],
            },
          ],
        },
      ]);

      // Unnesting the LAST child should always work (no siblings after)
      editor.setTextCursorPosition("grandchild2", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      expect(editor.document).toMatchSnapshot();
    });
  });

  // BLO-953: Backspace at start of indented block loses deeply nested content
  // Structure:
  //   block1
  //     blockA "text A"     ← Backspace at start (unnest via keyboard)
  //       block3
  //         block4
  //       block5
  //
  // Expected: blockA moves to root, all children preserved
  describe("BLO-953: unnest block with multi-level nested children", () => {
    it("should preserve all deeply nested content when unnesting", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
          children: [
            {
              id: "blockA",
              type: "paragraph",
              content: "Block A",
              children: [
                {
                  id: "block3",
                  type: "paragraph",
                  content: "Block 3",
                  children: [
                    {
                      id: "block4",
                      type: "paragraph",
                      content: "Block 4",
                    },
                  ],
                },
                {
                  id: "block5",
                  type: "paragraph",
                  content: "Block 5",
                },
              ],
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("blockA", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      const doc = editor.document;

      // All blocks should still exist in the document
      const allBlockIds = flattenBlockIds(doc);
      expect(allBlockIds).toContain("block1");
      expect(allBlockIds).toContain("blockA");
      expect(allBlockIds).toContain("block3");
      expect(allBlockIds).toContain("block4");
      expect(allBlockIds).toContain("block5");

      expect(doc).toMatchSnapshot();
    });

    it("should preserve content when unnesting only child", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
          children: [
            {
              id: "blockA",
              type: "paragraph",
              content: "Block A",
              children: [
                {
                  id: "block3",
                  type: "paragraph",
                  content: "Block 3",
                  children: [
                    {
                      id: "block4",
                      type: "paragraph",
                      content: "Block 4",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("blockA", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      const doc = editor.document;
      const allBlockIds = flattenBlockIds(doc);
      expect(allBlockIds).toContain("block1");
      expect(allBlockIds).toContain("blockA");
      expect(allBlockIds).toContain("block3");
      expect(allBlockIds).toContain("block4");

      expect(doc).toMatchSnapshot();
    });
  });

  // BLO-844 / BLO-847: Operations after deleting parent cause RangeError
  // These bugs manifest when backspace merges/deletes a parent block and
  // then further operations on the (now re-parented) children fail.
  //
  // The core issue is liftListItem failing when the children need to be
  // reorganized. Testing the unnest operation directly.
  describe("BLO-844/847: unnest with complex nesting after parent operations", () => {
    it("should handle unnesting when block is only child", () => {
      const editor = withEditor([
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [
            {
              id: "child",
              type: "paragraph",
              content: "Child",
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("child", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      expect(editor.document).toMatchSnapshot();
    });

    it("should handle sequential unnest operations", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
          children: [
            {
              id: "block2",
              type: "paragraph",
              content: "Block 2",
              children: [
                {
                  id: "block3",
                  type: "paragraph",
                  content: "Block 3",
                },
              ],
            },
            {
              id: "block4",
              type: "paragraph",
              content: "Block 4",
            },
          ],
        },
      ]);

      // First unnest block2
      editor.setTextCursorPosition("block2", "start");
      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      // Then unnest block3 (which should now be child of block2)
      editor.setTextCursorPosition("block3", "start");
      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      expect(editor.document).toMatchSnapshot();
    });
  });

  // Additional edge cases
  describe("Edge cases", () => {
    it("should not unnest a root-level block", () => {
      const editor = withEditor([
        {
          id: "root-block",
          type: "paragraph",
          content: "Root Block",
        },
      ]);

      editor.setTextCursorPosition("root-block", "start");

      // Should be a no-op (can't unnest root level)
      const canUnnest = editor.canUnnestBlock();
      expect(canUnnest).toBe(false);
    });

    it("should handle unnesting block with both existing children and siblings after", () => {
      const editor = withEditor([
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [
            {
              id: "child1",
              type: "paragraph",
              content: "Child 1",
              children: [
                {
                  id: "existing-grandchild",
                  type: "paragraph",
                  content: "Existing Grandchild",
                },
              ],
            },
            {
              id: "child2",
              type: "paragraph",
              content: "Child 2",
            },
            {
              id: "child3",
              type: "paragraph",
              content: "Child 3",
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("child1", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      // child1 should be at root level
      // existing-grandchild should still be a child of child1
      // child2 and child3 should also become children of child1
      const doc = editor.document;
      const allBlockIds = flattenBlockIds(doc);
      expect(allBlockIds).toContain("parent");
      expect(allBlockIds).toContain("child1");
      expect(allBlockIds).toContain("existing-grandchild");
      expect(allBlockIds).toContain("child2");
      expect(allBlockIds).toContain("child3");

      expect(doc).toMatchSnapshot();
    });

    it("should handle unnesting with different block types", () => {
      const editor = withEditor([
        {
          id: "parent",
          type: "paragraph",
          content: "Parent",
          children: [
            {
              id: "heading-child",
              type: "heading",
              content: "Heading Child",
            },
            {
              id: "para-sibling",
              type: "paragraph",
              content: "Paragraph Sibling",
            },
          ],
        },
      ]);

      editor.setTextCursorPosition("heading-child", "start");

      expect(() => {
        editor.unnestBlock();
      }).not.toThrow();

      expect(editor.document).toMatchSnapshot();
    });
  });

  // nestBlock tests (sinkListItem) - ensuring nesting works correctly
  describe("nestBlock", () => {
    it("should nest a block under its previous sibling", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
        },
        {
          id: "block2",
          type: "paragraph",
          content: "Block 2",
        },
      ]);

      editor.setTextCursorPosition("block2", "start");
      editor.nestBlock();

      expect(editor.document).toMatchSnapshot();
    });

    it("should not nest the first block (no previous sibling)", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
        },
      ]);

      editor.setTextCursorPosition("block1", "start");

      const canNest = editor.canNestBlock();
      expect(canNest).toBe(false);
    });

    it("should nest into a sibling that already has children (nestedBefore)", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
          children: [
            {
              id: "child1",
              type: "paragraph",
              content: "Child 1",
            },
          ],
        },
        {
          id: "block2",
          type: "paragraph",
          content: "Block 2",
        },
      ]);

      editor.setTextCursorPosition("block2", "start");
      editor.nestBlock();

      expect(editor.document).toMatchSnapshot();
    });

    it("nest then unnest should be a round trip", () => {
      const editor = withEditor([
        {
          id: "block1",
          type: "paragraph",
          content: "Block 1",
        },
        {
          id: "block2",
          type: "paragraph",
          content: "Block 2",
        },
      ]);

      const originalDoc = JSON.parse(JSON.stringify(editor.document));

      editor.setTextCursorPosition("block2", "start");
      editor.nestBlock();
      editor.unnestBlock();

      // Content should be preserved (IDs may differ but structure/content same)
      expect(editor.document.length).toBe(originalDoc.length);
      expect(editor.document[0].content).toEqual(originalDoc[0].content);
      expect(editor.document[1].content).toEqual(originalDoc[1].content);
    });
  });
});

/** Recursively collects all block IDs from a document */
function flattenBlockIds(blocks: any[]): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    if (block.id) {
      ids.push(block.id);
    }
    if (block.children) {
      ids.push(...flattenBlockIds(block.children));
    }
  }
  return ids;
}
