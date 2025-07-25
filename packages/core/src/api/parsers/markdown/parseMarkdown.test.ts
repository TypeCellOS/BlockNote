import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { BlockNoteSchema } from "../../../editor/BlockNoteSchema.js";

describe("Markdown blockquote parsing", () => {
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create(),
  });

  it("should parse blockquotes without including adjacent paragraphs", async () => {
    const markdown = `> This is a blockquote

This is not a blockquote`;

    const blocks = await editor.tryParseMarkdownToBlocks(markdown);

    // Should have exactly 2 blocks
    expect(blocks).toHaveLength(2);

    // First block should be a quote
    expect(blocks[0].type).toBe("quote");
    expect(blocks[0].props).toMatchObject({});
    expect(blocks[0].content).toEqual([
      {
        type: "text",
        text: "This is a blockquote",
        styles: {},
      },
    ]);

    // Second block should be a regular paragraph
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].content).toEqual([
      {
        type: "text",
        text: "This is not a blockquote",
        styles: {},
      },
    ]);

    // Neither block should have children
    expect(blocks[0].children).toEqual([]);
    expect(blocks[1].children).toEqual([]);
  });

  it("should handle multiple blockquotes correctly", async () => {
    const markdown = `> First quote

> Second quote

Regular paragraph`;

    const blocks = await editor.tryParseMarkdownToBlocks(markdown);

    // Should have exactly 3 blocks
    expect(blocks).toHaveLength(3);

    // All blocks should be at the top level with no children
    blocks.forEach((block) => {
      expect(block.children).toEqual([]);
    });
  });

  it("should handle nested content in blockquotes", async () => {
    const markdown = `> This is a quote with **bold** and *italic* text`;

    const blocks = await editor.tryParseMarkdownToBlocks(markdown);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("quote");
    expect(blocks[0].content).toMatchObject([
      {
        type: "text",
        text: "This is a quote with ",
        styles: {},
      },
      {
        type: "text",
        text: "bold",
        styles: { bold: true },
      },
      {
        type: "text",
        text: " and ",
        styles: {},
      },
      {
        type: "text",
        text: "italic",
        styles: { italic: true },
      },
      {
        type: "text",
        text: " text",
        styles: {},
      },
    ]);
  });
});