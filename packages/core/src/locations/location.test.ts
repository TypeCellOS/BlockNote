import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import {
  resolveLocation,
  resolveBlockToPM,
  resolvePointToPM,
  resolveRangeToPM,
} from "./location.js";
import type { BlockId, Point, Range } from "./types.js";
import { Node } from "prosemirror-model";

/**
 * @vitest-environment jsdom
 */
describe("Location Resolution", () => {
  let editor: BlockNoteEditor;
  let doc: Node;

  beforeEach(() => {
    editor = BlockNoteEditor.create({
      initialContent: [
        {
          id: "block1",
          type: "paragraph",
          content: "Hello World",
        },
        {
          id: "block2",
          type: "heading",
          content: "This is a heading",
        },
        {
          id: "block3",
          type: "paragraph",
          content: "Another paragraph with more text content",
        },
        {
          id: "block4",
          type: "bulletListItem",
          content: "List item one",
        },
        {
          id: "block5",
          type: "bulletListItem",
          content: "List item two",
        },
      ],
    });

    // Get the ProseMirror document
    doc = editor.prosemirrorState.doc;
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  describe("resolveLocation", () => {
    it("should resolve BlockId to PMLocation", () => {
      const result = resolveLocation(doc, "block1");

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 15,
        }
      `);
    });

    it("should resolve BlockIdentifier object to PMLocation", () => {
      const result = resolveLocation(doc, { id: "block2" });

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 17,
          "head": 36,
        }
      `);
    });

    it("should resolve Point to PMLocation", () => {
      const point: Point = { id: "block1", offset: 5 };
      const result = resolveLocation(doc, point);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 8,
          "head": 8,
        }
      `);
    });

    it("should resolve Range to PMLocation", () => {
      const range: Range = {
        anchor: { id: "block1", offset: 0 },
        head: { id: "block3", offset: 10 },
      };
      const result = resolveLocation(doc, range);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 3,
          "head": 49,
        }
      `);
    });

    it("should throw error for invalid location type", () => {
      expect(() => {
        resolveLocation(doc, "invalid-location-type" as any);
      }).toThrow("Block with ID invalid-location-type not found");
    });
  });

  describe("resolveBlockToPM", () => {
    it("should resolve existing block to PMLocation", () => {
      const result = resolveBlockToPM(doc, "block1");

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 15,
        }
      `);
    });

    it("should resolve different block types", () => {
      const paragraphResult = resolveBlockToPM(doc, "block1");
      const headingResult = resolveBlockToPM(doc, "block2");
      const listItemResult = resolveBlockToPM(doc, "block4");

      expect(paragraphResult).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 15,
        }
      `);
      expect(headingResult).toMatchInlineSnapshot(`
        {
          "anchor": 17,
          "head": 36,
        }
      `);
      expect(listItemResult).toMatchInlineSnapshot(`
        {
          "anchor": 82,
          "head": 97,
        }
      `);
    });

    it("should throw error for non-existent block", () => {
      expect(() => {
        resolveBlockToPM(doc, "non-existent-block" as BlockId);
      }).toThrow("Block with ID non-existent-block not found");
    });

    it("should return consistent positions for same block", () => {
      const result1 = resolveBlockToPM(doc, "block1");
      const result2 = resolveBlockToPM(doc, "block1");

      expect(result1).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 15,
        }
      `);
      expect(result2).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 15,
        }
      `);
    });
  });

  describe("resolvePointToPM", () => {
    it("should resolve point with offset -1 (whole block)", () => {
      const point: Point = { id: "block1", offset: -1 };
      const result = resolvePointToPM(doc, point);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 15,
        }
      `);
    });

    it("should resolve point with specific offset", () => {
      const point: Point = { id: "block1", offset: 5 };
      const result = resolvePointToPM(doc, point);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 8,
          "head": 8,
        }
      `);
    });

    it("should throw error for offset exceeding block length", () => {
      const point: Point = { id: "block1", offset: 100 }; // "Hello World" is only 11 characters

      expect(() => {
        resolvePointToPM(doc, point);
      }).toThrow("Offset 100 exceeds block length");
    });

    it("should handle different block types with points", () => {
      const paragraphPoint: Point = { id: "block1", offset: 3 };
      const headingPoint: Point = { id: "block2", offset: 5 };
      const listItemPoint: Point = { id: "block4", offset: 2 };

      expect(() => resolvePointToPM(doc, paragraphPoint)).not.toThrow();
      expect(() => resolvePointToPM(doc, headingPoint)).not.toThrow();
      expect(() => resolvePointToPM(doc, listItemPoint)).not.toThrow();
    });

    it("should handle inline leaf nodes correctly", () => {
      // Create a document with inline nodes to test
      const editorWithInline = BlockNoteEditor.create({
        initialContent: [
          {
            id: "test-block",
            type: "paragraph",
            content: "Text with **bold** and *italic*",
          },
        ],
      });
      const testDoc = editorWithInline._tiptapEditor.state.doc;

      // Test offset that should land on inline node
      const result = resolvePointToPM(testDoc, {
        id: "test-block",
        offset: 10,
      });

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 13,
          "head": 13,
        }
      `);

      editorWithInline._tiptapEditor.destroy();
    });

    it("should throw error for non-existent block", () => {
      const point: Point = { id: "non-existent", offset: 0 };

      expect(() => {
        resolvePointToPM(doc, point);
      }).toThrow("Block with ID non-existent not found");
    });
  });

  describe("resolveRangeToPM", () => {
    it("should resolve range with non-overlapping blocks", () => {
      const range: Range = {
        anchor: { id: "block1", offset: 0 },
        head: { id: "block3", offset: 5 },
      };
      const result = resolveRangeToPM(doc, range);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 3,
          "head": 44,
        }
      `);
    });

    it("should resolve range with same block (overlapping)", () => {
      const range: Range = {
        anchor: { id: "block1", offset: 2 },
        head: { id: "block1", offset: 8 },
      };
      const result = resolveRangeToPM(doc, range);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 5,
          "head": 11,
        }
      `);
    });

    it("should handle range where head is before anchor", () => {
      const range: Range = {
        anchor: { id: "block3", offset: 5 },
        head: { id: "block1", offset: 2 },
      };
      const result = resolveRangeToPM(doc, range);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 44,
          "head": 5,
        }
      `);
    });

    it("should handle range with adjacent blocks", () => {
      const range: Range = {
        anchor: { id: "block1", offset: -1 },
        head: { id: "block2", offset: -1 },
      };
      const result = resolveRangeToPM(doc, range);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 36,
        }
      `);
    });

    it("should handle range spanning multiple blocks", () => {
      const range: Range = {
        anchor: { id: "block1", offset: 0 },
        head: { id: "block5", offset: -1 },
      };
      const result = resolveRangeToPM(doc, range);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 3,
          "head": 114,
        }
      `);
    });

    it("should propagate errors from invalid points", () => {
      const range: Range = {
        anchor: { id: "non-existent", offset: 0 },
        head: { id: "block1", offset: 0 },
      };

      expect(() => {
        resolveRangeToPM(doc, range);
      }).toThrow("Block with ID non-existent not found");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle single block document", () => {
      const singleBlockEditor = BlockNoteEditor.create({
        initialContent: [
          {
            id: "single-block",
            type: "paragraph",
            content: "Only block",
          },
        ],
      });
      const singleDoc = singleBlockEditor._tiptapEditor.state.doc;

      const result = resolveBlockToPM(singleDoc, "single-block");
      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 14,
        }
      `);

      singleBlockEditor._tiptapEditor.destroy();
    });
  });

  describe("Blocks with Children", () => {
    let nestedEditor: BlockNoteEditor;
    let nestedDoc: Node;

    beforeEach(() => {
      nestedEditor = BlockNoteEditor.create({
        initialContent: [
          {
            id: "parent-bullet",
            type: "bulletListItem",
            content: "Parent bullet item",
            children: [
              {
                id: "child-bullet-1",
                type: "bulletListItem",
                content: "First child bullet",
              },
              {
                id: "child-bullet-2",
                type: "bulletListItem",
                content: "Second child bullet",
                children: [
                  {
                    id: "grandchild-bullet",
                    type: "bulletListItem",
                    content: "Grandchild bullet",
                  },
                ],
              },
            ],
          },
          {
            id: "parent-numbered",
            type: "numberedListItem",
            content: "Parent numbered item",
            children: [
              {
                id: "child-numbered-1",
                type: "numberedListItem",
                content: "First child numbered",
              },
              {
                id: "child-numbered-2",
                type: "numberedListItem",
                content: "Second child numbered",
              },
            ],
          },
          {
            id: "simple-paragraph",
            type: "paragraph",
            content: "Simple paragraph after nested structure",
          },
        ],
      });

      nestedDoc = nestedEditor._tiptapEditor.state.doc;
    });

    afterEach(() => {
      nestedEditor._tiptapEditor.destroy();
    });

    describe("resolveBlockToPM with nested blocks", () => {
      it("should resolve parent bullet list item", () => {
        const result = resolveBlockToPM(nestedDoc, "parent-bullet");
        expect(result).toBeDefined();
        expect(result.anchor).toBeLessThan(result.head);
      });

      it("should resolve child bullet list items", () => {
        const child1Result = resolveBlockToPM(nestedDoc, "child-bullet-1");
        const child2Result = resolveBlockToPM(nestedDoc, "child-bullet-2");

        expect(child1Result).toBeDefined();
        expect(child2Result).toBeDefined();
        expect(child1Result.anchor).toBeLessThan(child1Result.head);
        expect(child2Result.anchor).toBeLessThan(child2Result.head);
      });

      it("should resolve grandchild bullet list item", () => {
        const result = resolveBlockToPM(nestedDoc, "grandchild-bullet");
        expect(result).toBeDefined();
        expect(result.anchor).toBeLessThan(result.head);
      });

      it("should resolve parent numbered list item", () => {
        const result = resolveBlockToPM(nestedDoc, "parent-numbered");
        expect(result).toBeDefined();
        expect(result.anchor).toBeLessThan(result.head);
      });

      it("should resolve child numbered list items", () => {
        const child1Result = resolveBlockToPM(nestedDoc, "child-numbered-1");
        const child2Result = resolveBlockToPM(nestedDoc, "child-numbered-2");

        expect(child1Result).toBeDefined();
        expect(child2Result).toBeDefined();
        expect(child1Result.anchor).toBeLessThan(child1Result.head);
        expect(child2Result.anchor).toBeLessThan(child2Result.head);
      });

      it("should maintain proper ordering of nested blocks", () => {
        const parentResult = resolveBlockToPM(nestedDoc, "parent-bullet");
        const child1Result = resolveBlockToPM(nestedDoc, "child-bullet-1");
        const child2Result = resolveBlockToPM(nestedDoc, "child-bullet-2");
        const grandchildResult = resolveBlockToPM(
          nestedDoc,
          "grandchild-bullet",
        );

        // Parent should contain all children
        expect(parentResult.anchor).toBeLessThan(child1Result.anchor);
        expect(parentResult.head).toBeGreaterThan(child2Result.head);

        // Children should be in order
        expect(child1Result.anchor).toBeLessThan(child2Result.anchor);

        // Grandchild should be within child2
        expect(child2Result.anchor).toBeLessThan(grandchildResult.anchor);
        expect(child2Result.head).toBeGreaterThan(grandchildResult.head);
      });
    });

    describe("resolvePointToPM with nested blocks", () => {
      it("should resolve points within parent blocks", () => {
        const point: Point = { id: "parent-bullet", offset: 5 };
        const result = resolvePointToPM(nestedDoc, point);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 9,
            "head": 9,
          }
        `);
      });

      it("should resolve points within child blocks", () => {
        const childPoint: Point = { id: "child-bullet-1", offset: 3 };
        const result = resolvePointToPM(nestedDoc, childPoint);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 28,
            "head": 28,
          }
        `);
      });

      it("should resolve points within grandchild blocks", () => {
        const grandchildPoint: Point = { id: "grandchild-bullet", offset: 2 };
        const result = resolvePointToPM(nestedDoc, grandchildPoint);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 72,
            "head": 72,
          }
        `);
      });

      it("should resolve whole block points for nested blocks", () => {
        const parentWhole: Point = { id: "parent-bullet", offset: -1 };
        const childWhole: Point = { id: "child-bullet-1", offset: -1 };

        const parentResult = resolvePointToPM(nestedDoc, parentWhole);
        const childResult = resolvePointToPM(nestedDoc, childWhole);

        expect(parentResult).toMatchInlineSnapshot(`
          {
            "anchor": 2,
            "head": 92,
          }
        `);
        expect(childResult).toMatchInlineSnapshot(`
          {
            "anchor": 24,
            "head": 44,
          }
        `);

        expect(parentResult.anchor).toBeLessThan(parentResult.head);
        expect(childResult.anchor).toBeLessThan(childResult.head);

        // Child should be within parent
        expect(parentResult.anchor).toBeLessThan(childResult.anchor);
        expect(parentResult.head).toBeGreaterThan(childResult.head);
      });

      it("should handle offset validation for nested blocks", () => {
        const shortChild: Point = { id: "child-bullet-1", offset: 100 }; // "First child bullet" is only 19 characters

        expect(() => {
          resolvePointToPM(nestedDoc, shortChild);
        }).toThrow("Offset 100 exceeds block length");
      });
    });

    describe("resolveRangeToPM with nested blocks", () => {
      it("should resolve ranges within same nested level", () => {
        const range: Range = {
          anchor: { id: "child-bullet-1", offset: 0 },
          head: { id: "child-bullet-2", offset: -1 },
        };
        const result = resolveRangeToPM(nestedDoc, range);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 25,
            "head": 90,
          }
        `);
      });

      it("should resolve ranges across different nesting levels", () => {
        const range: Range = {
          anchor: { id: "parent-bullet", offset: 0 },
          head: { id: "grandchild-bullet", offset: -1 },
        };
        const result = resolveRangeToPM(nestedDoc, range);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 4,
            "head": 88,
          }
        `);
      });

      it("should resolve ranges from child to parent", () => {
        const range: Range = {
          anchor: { id: "child-bullet-1", offset: 0 },
          head: { id: "parent-bullet", offset: -1 },
        };
        const result = resolveRangeToPM(nestedDoc, range);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 2,
            "head": 92,
          }
        `);
      });

      it("should resolve ranges across different parent blocks", () => {
        const range: Range = {
          anchor: { id: "parent-bullet", offset: 0 },
          head: { id: "parent-numbered", offset: -1 },
        };
        const result = resolveRangeToPM(nestedDoc, range);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 4,
            "head": 167,
          }
        `);
      });

      it("should resolve ranges from nested to simple blocks", () => {
        const range: Range = {
          anchor: { id: "grandchild-bullet", offset: 0 },
          head: { id: "simple-paragraph", offset: -1 },
        };
        const result = resolveRangeToPM(nestedDoc, range);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 70,
            "head": 210,
          }
        `);
      });
    });

    describe("Complex nested structures", () => {
      let complexNestedEditor: BlockNoteEditor;
      let complexNestedDoc: Node;

      beforeEach(() => {
        complexNestedEditor = BlockNoteEditor.create({
          initialContent: [
            {
              id: "root-bullet",
              type: "bulletListItem",
              content: "Root level item",
              children: [
                {
                  id: "level1-bullet",
                  type: "bulletListItem",
                  content: "Level 1 item",
                  children: [
                    {
                      id: "level2-numbered",
                      type: "numberedListItem",
                      content: "Level 2 numbered",
                      children: [
                        {
                          id: "level3-bullet",
                          type: "bulletListItem",
                          content: "Level 3 bullet",
                        },
                        {
                          id: "level3-paragraph",
                          type: "paragraph",
                          content: "Level 3 paragraph",
                        },
                      ],
                    },
                  ],
                },
                {
                  id: "level1-numbered",
                  type: "numberedListItem",
                  content: "Another level 1 item",
                },
              ],
            },
          ],
        });

        complexNestedDoc = complexNestedEditor._tiptapEditor.state.doc;
      });

      afterEach(() => {
        complexNestedEditor._tiptapEditor.destroy();
      });

      it("should resolve deeply nested blocks", () => {
        const level3Result = resolveBlockToPM(
          complexNestedDoc,
          "level3-bullet",
        );
        const level3ParaResult = resolveBlockToPM(
          complexNestedDoc,
          "level3-paragraph",
        );

        expect(level3Result).toMatchInlineSnapshot(`
          {
            "anchor": 57,
            "head": 73,
          }
        `);
        expect(level3ParaResult).toMatchInlineSnapshot(`
          {
            "anchor": 75,
            "head": 94,
          }
        `);
        expect(level3Result.anchor).toBeLessThan(level3Result.head);
        expect(level3ParaResult.anchor).toBeLessThan(level3ParaResult.head);
      });

      it("should resolve points in deeply nested blocks", () => {
        const point: Point = { id: "level3-bullet", offset: 5 };
        const result = resolvePointToPM(complexNestedDoc, point);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 63,
            "head": 63,
          }
        `);
      });

      it("should resolve ranges across multiple nesting levels", () => {
        const range: Range = {
          anchor: { id: "root-bullet", offset: 0 },
          head: { id: "level3-paragraph", offset: -1 },
        };
        const result = resolveRangeToPM(complexNestedDoc, range);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": 4,
            "head": 94,
          }
        `);
      });

      it("should maintain proper hierarchy in complex structures", () => {
        const rootResult = resolveBlockToPM(complexNestedDoc, "root-bullet");
        const level1Result = resolveBlockToPM(
          complexNestedDoc,
          "level1-bullet",
        );
        const level2Result = resolveBlockToPM(
          complexNestedDoc,
          "level2-numbered",
        );
        const level3Result = resolveBlockToPM(
          complexNestedDoc,
          "level3-bullet",
        );

        // Root should contain all levels
        expect(rootResult.anchor).toBeLessThan(level1Result.anchor);
        expect(rootResult.head).toBeGreaterThan(level3Result.head);

        // Level 1 should contain level 2
        expect(level1Result.anchor).toBeLessThan(level2Result.anchor);
        expect(level1Result.head).toBeGreaterThan(level2Result.head);

        // Level 2 should contain level 3
        expect(level2Result.anchor).toBeLessThan(level3Result.anchor);
        expect(level2Result.head).toBeGreaterThan(level3Result.head);
      });
    });
  });

  describe("Integration Tests", () => {
    it("should work with complex document structure", () => {
      const complexEditor = BlockNoteEditor.create({
        initialContent: [
          {
            id: "title",
            type: "heading",
            content: "Document Title",
          },
          {
            id: "intro",
            type: "paragraph",
            content: "This is the introduction paragraph.",
          },
          {
            id: "list1",
            type: "bulletListItem",
            content: "First list item",
          },
          {
            id: "list2",
            type: "bulletListItem",
            content: "Second list item",
          },
          {
            id: "conclusion",
            type: "paragraph",
            content: "This is the conclusion.",
          },
        ],
      });
      const complexDoc = complexEditor._tiptapEditor.state.doc;

      // Test resolving different types of locations
      const blockResult = resolveLocation(complexDoc, "title");
      const pointResult = resolveLocation(complexDoc, {
        id: "intro",
        offset: 10,
      });
      const rangeResult = resolveLocation(complexDoc, {
        anchor: { id: "list1", offset: 0 },
        head: { id: "list2", offset: -1 },
      });

      expect(blockResult).toMatchInlineSnapshot(`
        {
          "anchor": 2,
          "head": 18,
        }
      `);
      expect(pointResult).toMatchInlineSnapshot(`
        {
          "anchor": 31,
          "head": 31,
        }
      `);
      expect(rangeResult).toMatchInlineSnapshot(`
        {
          "anchor": 60,
          "head": 96,
        }
      `);

      complexEditor._tiptapEditor.destroy();
    });

    it("should maintain consistency across multiple calls", () => {
      const point: Point = { id: "block1", offset: 5 };

      const result1 = resolveLocation(doc, point);
      const result2 = resolveLocation(doc, point);

      expect(result1).toMatchInlineSnapshot(`
        {
          "anchor": 8,
          "head": 8,
        }
      `);
      expect(result2).toMatchInlineSnapshot(`
        {
          "anchor": 8,
          "head": 8,
        }
      `);
    });
  });
});
