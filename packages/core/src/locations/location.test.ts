import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import {
  resolveLocation,
  resolveBlockToPM,
  resolvePointToPM,
  resolveRangeToPM,
  resolvePMToLocation,
  getBlocksAt,
  getSelectionLocation,
  setSelectionLocation,
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

    it("should resolve point with offset 0", () => {
      const point: Point = { id: "block1", offset: 0 };
      const result = resolvePointToPM(doc, point);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 3,
          "head": 3,
        }
      `);
    });

    it("should resolve point with offset 1", () => {
      const point: Point = { id: "block1", offset: 1 };
      const result = resolvePointToPM(doc, point);

      expect(result).toMatchInlineSnapshot(`
        {
          "anchor": 4,
          "head": 4,
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
      }).toThrow("Invalid offset: 100 exceeds block length 13");
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
            "anchor": 8,
            "head": 8,
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
        }).toThrow("Invalid offset: 100 exceeds block length 20");
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
            "anchor": 3,
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
            "anchor": 3,
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
            "anchor": 3,
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

  describe("resolvePMToLocation", () => {
    describe("Point conversion (same block)", () => {
      it("should convert PMLocation to Point when anchor equals head", () => {
        const pmLocation = { anchor: 8, head: 8 }; // Point within block1
        const result = resolvePMToLocation(doc, pmLocation);

        expect(result).toMatchInlineSnapshot(`
          {
            "id": "block1",
            "offset": 5,
          }
        `);
      });

      it("should convert PMLocation to Point for different blocks", () => {
        const pmLocation1 = { anchor: 8, head: 8 }; // Point within block1
        const pmLocation2 = { anchor: 20, head: 20 }; // Point within block2
        const pmLocation3 = { anchor: 45, head: 45 }; // Point within block3

        const result1 = resolvePMToLocation(doc, pmLocation1);
        const result2 = resolvePMToLocation(doc, pmLocation2);
        const result3 = resolvePMToLocation(doc, pmLocation3);

        expect(result1).toMatchInlineSnapshot(`
          {
            "id": "block1",
            "offset": 5,
          }
        `);
        expect(result2).toMatchInlineSnapshot(`
          {
            "id": "block2",
            "offset": 2,
          }
        `);
        expect(result3).toMatchInlineSnapshot(`
          {
            "id": "block3",
            "offset": 6,
          }
        `);
      });

      it("should handle points at block boundaries", () => {
        const pmLocationStart = { anchor: 2, head: 2 }; // Start of block1
        const pmLocationEnd = { anchor: 15, head: 15 }; // End of block1

        const resultStart = resolvePMToLocation(doc, pmLocationStart);
        const resultEnd = resolvePMToLocation(doc, pmLocationEnd);

        expect(resultStart).toMatchInlineSnapshot(`
          {
            "id": "block1",
            "offset": -1,
          }
        `);
        expect(resultEnd).toMatchInlineSnapshot(`
          {
            "id": "block1",
            "offset": 12,
          }
        `);
      });

      it("should handle points in list items", () => {
        const pmLocation4 = { anchor: 82, head: 82 }; // Point within block4 (list item)
        const pmLocation5 = { anchor: 97, head: 97 }; // Point within block5 (list item)

        const result4 = resolvePMToLocation(doc, pmLocation4);
        const result5 = resolvePMToLocation(doc, pmLocation5);

        expect(result4).toMatchInlineSnapshot(`
          {
            "id": "block4",
            "offset": -1,
          }
        `);
        expect(result5).toMatchInlineSnapshot(`
          {
            "id": "block4",
            "offset": 14,
          }
        `);
      });
    });

    describe("Range conversion (different blocks)", () => {
      it("should convert PMLocation to Range when anchor and head are different", () => {
        const pmLocation = { anchor: 8, head: 20 }; // From block1 to block2
        const result = resolvePMToLocation(doc, pmLocation);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "block1",
              "offset": 5,
            },
            "head": {
              "id": "block2",
              "offset": 2,
            },
          }
        `);
      });

      it("should handle ranges spanning multiple blocks", () => {
        const pmLocation = { anchor: 8, head: 45 }; // From block1 to block3
        const result = resolvePMToLocation(doc, pmLocation);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "block1",
              "offset": 5,
            },
            "head": {
              "id": "block3",
              "offset": 6,
            },
          }
        `);
      });

      it("should handle ranges from list items to paragraphs", () => {
        const pmLocation = { anchor: 82, head: 45 }; // From block4 to block3
        const result = resolvePMToLocation(doc, pmLocation);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "block4",
              "offset": -1,
            },
            "head": {
              "id": "block3",
              "offset": 6,
            },
          }
        `);
      });

      it("should handle ranges where head is before anchor", () => {
        const pmLocation = { anchor: 45, head: 8 }; // From block3 to block1 (reversed)
        const result = resolvePMToLocation(doc, pmLocation);

        expect(result).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "block3",
              "offset": 6,
            },
            "head": {
              "id": "block1",
              "offset": 5,
            },
          }
        `);
      });
    });

    describe("Nested blocks with resolvePMToLocation", () => {
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

      it("should convert PMLocation to Point within nested blocks", () => {
        // Point within parent block
        const parentPM = { anchor: 9, head: 9 };
        const parentResult = resolvePMToLocation(nestedDoc, parentPM);

        expect(parentResult).toMatchInlineSnapshot(`
          {
            "id": "parent-bullet",
            "offset": 6,
          }
        `);

        // Point within child block
        const childPM = { anchor: 28, head: 28 };
        const childResult = resolvePMToLocation(nestedDoc, childPM);

        expect(childResult).toMatchInlineSnapshot(`
          {
            "id": "child-bullet-1",
            "offset": 3,
          }
        `);

        // Point within grandchild block
        const grandchildPM = { anchor: 72, head: 72 };
        const grandchildResult = resolvePMToLocation(nestedDoc, grandchildPM);

        expect(grandchildResult).toMatchInlineSnapshot(`
          {
            "id": "grandchild-bullet",
            "offset": 2,
          }
        `);
      });

      it("should convert PMLocation to Range across nested blocks", () => {
        // Range from parent to child
        const parentToChildPM = { anchor: 9, head: 28 };
        const parentToChildResult = resolvePMToLocation(
          nestedDoc,
          parentToChildPM,
        );

        expect(parentToChildResult).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "parent-bullet",
              "offset": 6,
            },
            "head": {
              "id": "child-bullet-1",
              "offset": 3,
            },
          }
        `);

        // Range from child to grandchild
        const childToGrandchildPM = { anchor: 28, head: 72 };
        const childToGrandchildResult = resolvePMToLocation(
          nestedDoc,
          childToGrandchildPM,
        );

        expect(childToGrandchildResult).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "child-bullet-1",
              "offset": 3,
            },
            "head": {
              "id": "grandchild-bullet",
              "offset": 2,
            },
          }
        `);

        // Range from nested block to simple block
        const nestedToSimplePM = { anchor: 72, head: 95 };
        const nestedToSimpleResult = resolvePMToLocation(
          nestedDoc,
          nestedToSimplePM,
        );

        expect(nestedToSimpleResult).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "grandchild-bullet",
              "offset": 2,
            },
            "head": {
              "id": "simple-paragraph",
              "offset": 0,
            },
          }
        `);
      });

      it("should handle whole block selections in nested structures", () => {
        // Whole parent block
        const parentWholePM = { anchor: 2, head: 22 };
        const parentWholeResult = resolvePMToLocation(nestedDoc, parentWholePM);

        expect(parentWholeResult).toMatchInlineSnapshot(`
          {
            "id": "parent-bullet",
            "offset": -1,
          }
        `);

        // Whole child block
        const childWholePM = { anchor: 24, head: 44 };
        const childWholeResult = resolvePMToLocation(nestedDoc, childWholePM);

        expect(childWholeResult).toMatchInlineSnapshot(`
          {
            "id": "child-bullet-1",
            "offset": -1,
          }
        `);
      });
    });

    describe("Round-trip conversion tests", () => {
      it("should maintain consistency in round-trip conversions", () => {
        // Test Point -> PMLocation -> Point
        const originalPoint: Point = { id: "block1", offset: 5 };
        const pmLocation = resolvePointToPM(doc, originalPoint);
        expect(pmLocation).toMatchInlineSnapshot(`
          {
            "anchor": 8,
            "head": 8,
          }
        `);
        const convertedLocation = resolvePMToLocation(doc, pmLocation);

        expect(convertedLocation).toEqual(originalPoint);
      });

      it("should maintain consistency for ranges in round-trip conversions", () => {
        // Test Range -> PMLocation -> Range
        const originalRange: Range = {
          anchor: { id: "block1", offset: 2 },
          head: { id: "block3", offset: 5 },
        };
        const pmLocation = resolveRangeToPM(doc, originalRange);
        const convertedLocation = resolvePMToLocation(doc, pmLocation);

        expect(convertedLocation).toEqual(originalRange);
      });

      it("should handle nested block round-trip conversions", () => {
        const nestedEditor = BlockNoteEditor.create({
          initialContent: [
            {
              id: "parent",
              type: "bulletListItem",
              content: "Parent",
              children: [
                {
                  id: "child",
                  type: "bulletListItem",
                  content: "Child",
                },
              ],
            },
          ],
        });

        const nestedDoc = nestedEditor._tiptapEditor.state.doc;

        // Test nested Point round-trip
        const originalPoint: Point = { id: "child", offset: 2 };
        const pmLocation = resolvePointToPM(nestedDoc, originalPoint);
        const convertedLocation = resolvePMToLocation(nestedDoc, pmLocation);

        expect(convertedLocation).toEqual(originalPoint);

        // Test nested Point round-trip
        const originalPoint2: Point = { id: "child", offset: 0 };
        const pmLocation2 = resolvePointToPM(nestedDoc, originalPoint2);
        const convertedLocation2 = resolvePMToLocation(nestedDoc, pmLocation2);

        expect(convertedLocation2).toEqual(originalPoint2);

        // Test nested Point round-trip
        const originalPoint3: Point = { id: "child", offset: 5 };
        const pmLocation3 = resolvePointToPM(nestedDoc, originalPoint3);
        const convertedLocation3 = resolvePMToLocation(nestedDoc, pmLocation3);

        expect(convertedLocation3).toEqual(originalPoint3);

        // Test nested Point round-trip
        const originalPoint4: Point = { id: "child", offset: -1 };
        const pmLocation4 = resolvePointToPM(nestedDoc, originalPoint4);
        expect(pmLocation4).toMatchInlineSnapshot(`
          {
            "anchor": 12,
            "head": 19,
          }
        `);
        const convertedLocation4 = resolvePMToLocation(nestedDoc, pmLocation4);

        expect(convertedLocation4).toEqual(originalPoint4);

        // Test nested Range round-trip
        const originalRange: Range = {
          anchor: { id: "parent", offset: 0 },
          head: { id: "child", offset: 5 },
        };
        const pmRange = resolveRangeToPM(nestedDoc, originalRange);
        expect(pmRange).toMatchInlineSnapshot(`
          {
            "anchor": 3,
            "head": 18,
          }
        `);

        const convertedRangeLocation = resolvePMToLocation(nestedDoc, pmRange);

        expect(convertedRangeLocation).toEqual(originalRange);

        nestedEditor._tiptapEditor.destroy();
      });
    });

    describe("Edge cases for resolvePMToLocation", () => {
      it("should handle positions at document boundaries", () => {
        const startPM = { anchor: 0, head: 0 };
        const endPM = { anchor: doc.content.size, head: doc.content.size };

        const startResult = resolvePMToLocation(doc, startPM);
        const endResult = resolvePMToLocation(doc, endPM);

        expect(startResult).toMatchInlineSnapshot(`
          {
            "id": "block1",
            "offset": -1,
          }
        `);
        expect(endResult).toMatchInlineSnapshot(`
          {
            "id": "block5",
            "offset": 15,
          }
        `);
      });

      it("should show position increment behavior at block edges", () => {
        // Get the position range for block1 (from the existing test data)
        const block1PM = resolveBlockToPM(doc, "block1");
        const blockStart = block1PM.anchor;
        const blockEnd = block1PM.head;

        // Test positions around the block edges: -2, -1, 0, +1, +2 from block boundaries
        const positions = [
          { pos: blockStart - 2, desc: "2 positions before block start" },
          { pos: blockStart - 1, desc: "1 position before block start" },
          { pos: blockStart, desc: "at block start" },
          { pos: blockStart + 1, desc: "1 position after block start" },
          { pos: blockStart + 2, desc: "2 positions after block start" },
          { pos: blockEnd - 2, desc: "2 positions before block end" },
          { pos: blockEnd - 1, desc: "1 position before block end" },
          { pos: blockEnd, desc: "at block end" },
          { pos: blockEnd + 1, desc: "1 position after block end" },
          { pos: blockEnd + 2, desc: "2 positions after block end" },
          { pos: blockEnd + 3, desc: "3 positions after block end" },
        ];

        const results = positions.map(({ pos, desc }) => {
          const pmLocation = { anchor: pos, head: pos };
          const result = resolvePMToLocation(doc, pmLocation);
          return { pos, desc, result };
        });

        // The results show the position increment behavior at block edges

        // Verify that positions before the block map to the block with negative offsets
        expect(results).toMatchInlineSnapshot(`
          [
            {
              "desc": "2 positions before block start",
              "pos": 0,
              "result": {
                "id": "block1",
                "offset": -1,
              },
            },
            {
              "desc": "1 position before block start",
              "pos": 1,
              "result": {
                "id": "block1",
                "offset": -1,
              },
            },
            {
              "desc": "at block start",
              "pos": 2,
              "result": {
                "id": "block1",
                "offset": -1,
              },
            },
            {
              "desc": "1 position after block start",
              "pos": 3,
              "result": {
                "id": "block1",
                "offset": 0,
              },
            },
            {
              "desc": "2 positions after block start",
              "pos": 4,
              "result": {
                "id": "block1",
                "offset": 1,
              },
            },
            {
              "desc": "2 positions before block end",
              "pos": 13,
              "result": {
                "id": "block1",
                "offset": 10,
              },
            },
            {
              "desc": "1 position before block end",
              "pos": 14,
              "result": {
                "id": "block1",
                "offset": 11,
              },
            },
            {
              "desc": "at block end",
              "pos": 15,
              "result": {
                "id": "block1",
                "offset": 12,
              },
            },
            {
              "desc": "1 position after block end",
              "pos": 16,
              "result": {
                "id": "block2",
                "offset": -1,
              },
            },
            {
              "desc": "2 positions after block end",
              "pos": 17,
              "result": {
                "id": "block2",
                "offset": -1,
              },
            },
            {
              "desc": "3 positions after block end",
              "pos": 18,
              "result": {
                "id": "block2",
                "offset": 0,
              },
            },
          ]
        `);
      });

      it("should handle positions between blocks", () => {
        // Position between block1 and block2
        const betweenPM = { anchor: 16, head: 16 };
        const result = resolvePMToLocation(doc, betweenPM);

        expect(result).toMatchInlineSnapshot(`
          {
            "id": "block2",
            "offset": -1,
          }
        `);
      });

      it("should handle complex nested structures", () => {
        const complexEditor = BlockNoteEditor.create({
          initialContent: [
            {
              id: "root",
              type: "bulletListItem",
              content: "Root",
              children: [
                {
                  id: "level1",
                  type: "bulletListItem",
                  content: "Level 1",
                  children: [
                    {
                      id: "level2",
                      type: "numberedListItem",
                      content: "Level 2",
                      children: [
                        {
                          id: "level3",
                          type: "paragraph",
                          content: "Level 3",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        });

        const complexDoc = complexEditor._tiptapEditor.state.doc;

        // Test deep nesting
        const deepPM = { anchor: 45, head: 45 }; // Within level3
        const deepResult = resolvePMToLocation(complexDoc, deepPM);

        expect(deepResult).toMatchInlineSnapshot(`
          {
            "id": "level1",
            "offset": 9,
          }
        `);

        // Test range across multiple levels
        const crossLevelPM = { anchor: 4, head: 40 };
        const crossLevelResult = resolvePMToLocation(complexDoc, crossLevelPM);

        expect(crossLevelResult).toMatchInlineSnapshot(`
          {
            "anchor": {
              "id": "root",
              "offset": 1,
            },
            "head": {
              "id": "level3",
              "offset": 7,
            },
          }
        `);

        complexEditor._tiptapEditor.destroy();
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

describe("getBlocksAt", () => {
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
          children: [
            {
              id: "block2-child-1",
              type: "paragraph",
              content: "This is a child paragraph",
            },
            {
              id: "block2-child-2",
              type: "paragraph",
              content: "This is another child paragraph",
            },
          ],
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

  it("should return the blocks at the given location", () => {
    const blocks = getBlocksAt(doc, { id: "block1", offset: 5 });
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "Hello World",
              "type": "text",
            },
          ],
          "id": "block1",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
      ]
    `);
  });

  it("should return the blocks at the given id object", () => {
    const blocks = getBlocksAt(doc, { id: "block1" });
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "Hello World",
              "type": "text",
            },
          ],
          "id": "block1",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
      ]
    `);
  });

  it("should return the blocks at the given id", () => {
    const blocks = getBlocksAt(doc, "block1");
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "Hello World",
              "type": "text",
            },
          ],
          "id": "block1",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
      ]
    `);
  });

  it("should return the blocks at the given location with children", () => {
    const blocks = getBlocksAt(
      doc,
      {
        anchor: { id: "block2", offset: -1 },
        head: { id: "block3", offset: -1 },
      },
      { includeChildren: true },
    );
    expect(blocks.map((block) => block.id)).toEqual([
      "block2",
      "block2-child-1",
      "block2-child-2",
      "block3",
    ]);
  });

  it("should exclude children when includeChildren is false", () => {
    const blocks = getBlocksAt(
      doc,
      {
        anchor: { id: "block2", offset: -1 },
        head: { id: "block3", offset: -1 },
      },
      { includeChildren: false },
    );
    expect(blocks.map((block) => block.id)).toEqual(["block2", "block3"]);
  });

  it("should return the blocks at the given location even if the location's head is before the anchor", () => {
    const blocks = getBlocksAt(
      doc,
      {
        anchor: { id: "block3", offset: -1 },
        head: { id: "block2", offset: -1 },
      },
      { includeChildren: true },
    );
    expect(blocks.map((block) => block.id)).toEqual([
      "block2",
      "block2-child-1",
      "block2-child-2",
      "block3",
    ]);
  });

  it("should return the blocks at the given location even if the location's head is before the anchor and includeChildren is false", () => {
    const blocks = getBlocksAt(
      doc,
      {
        anchor: { id: "block3", offset: -1 },
        head: { id: "block2", offset: -1 },
      },
      { includeChildren: false },
    );
    expect(blocks.map((block) => block.id)).toEqual(["block2", "block3"]);
  });
});

describe("getSelectionLocation", () => {
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
      ],
    });

    doc = editor.prosemirrorState.doc;
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  it("should return undefined if the selection is empty", () => {
    const blocks = getSelectionLocation(editor.prosemirrorState.tr);
    expect(blocks).toMatchInlineSnapshot(`undefined`);
  });

  it("should return the blocks at the given location", () => {
    editor.exec((state, dispatch) => {
      if (dispatch) {
        const tr = state.tr;
        setSelectionLocation(tr, { id: "block1", offset: 5 });
        dispatch(tr);
      }
      return true;
    });
    expect(editor.prosemirrorState.selection.toJSON()).toMatchInlineSnapshot(`
      {
        "anchor": 8,
        "head": 8,
        "type": "text",
      }
    `);
    const blocks = getSelectionLocation(editor.prosemirrorState.tr);
    expect(blocks).toMatchInlineSnapshot(`
      {
        "blocks": [
          {
            "children": [],
            "content": [
              {
                "styles": {},
                "text": "Hello World",
                "type": "text",
              },
            ],
            "id": "block1",
            "props": {
              "backgroundColor": "default",
              "textAlignment": "left",
              "textColor": "default",
            },
            "type": "paragraph",
          },
        ],
        "isPointingToBlock": false,
        "range": {
          "anchor": {
            "id": "block1",
            "offset": 5,
          },
          "head": {
            "id": "block1",
            "offset": 5,
          },
        },
      }
    `);
  });
});
