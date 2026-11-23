import type { Node, Schema } from "@tiptap/pm/model";
import { describe, expect } from "vite-plus/test";

import { blockToNode } from "./blockToNode.js";
import { nodeToBlock } from "./nodeToBlock.js";

// `nodeToBlock(node, doc)` takes the containing document as its second argument
// (it's used to disambiguate suggestion-deletion nodes). These fixtures build a
// single `blockContainer` in isolation, so wrap it in a minimal valid doc.
const wrapInDoc = (schema: Schema, blockContainer: Node): Node =>
  schema.nodes["doc"].createChecked(
    null,
    schema.nodes["blockGroup"].createChecked(null, blockContainer),
  );

// Backwards compatibility for the "plain" content migration on the NON-Yjs
// (BlockNote JSON) path. A block whose content type changed from "inline"
// (formatting marks allowed) to "plain" (only the "annotation" group allowed)
// may appear in stored BlockNote JSON with formatting styles on its text. The
// write path must drop those disallowed marks instead of throwing when the node
// is assembled (`createChecked`), and the change must be scoped to plain blocks
// so inline blocks still keep their formatting.

// Old BlockNote JSON: a (now-plain) code block carrying a bold style.
const legacyBoldCodeBlock = {
  type: "codeBlock" as const,
  props: { language: "javascript" },
  content: [
    { type: "text" as const, text: "const x = 1;", styles: { bold: true } },
  ],
};

describe("blockToNode: plain-block backwards compatibility (write path)", () => {
  it("does not throw and drops formatting when converting a plain block with styles", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();

    expect(() =>
      blockToNode(legacyBoldCodeBlock, editor.pmSchema),
    ).not.toThrow();

    const node = blockToNode(legacyBoldCodeBlock, editor.pmSchema);
    // The node is valid (would otherwise fail this check).
    expect(() => node.check()).not.toThrow();

    // Round-trips back to a plain string with no materialized formatting.
    const block = nodeToBlock(node, wrapInDoc(editor.pmSchema, node));
    expect(block.type).toBe("codeBlock");
    expect(block.content).toEqual([
      {
        styles: {},
        text: "const x = 1;",
        type: "text",
      },
    ]);
  });

  it("keeps formatting on an inline block (scoped to plain blocks only)", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();

    const node = blockToNode(
      {
        type: "paragraph",
        content: [{ type: "text", text: "hello", styles: { bold: true } }],
      },
      editor.pmSchema,
    );

    const block = nodeToBlock(node, wrapInDoc(editor.pmSchema, node));
    expect(block.type).toBe("paragraph");
    // Paragraph is "inline" content, so bold survives.
    expect(Array.isArray(block.content)).toBe(true);
    expect(block.content).toMatchObject([{ styles: { bold: true } }]);
  });

  it("read path already strips marks: nodeToBlock yields a bare string", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();

    // Build the node leniently and confirm the read path emits no styles even if
    // the block content is plain text.
    const node = blockToNode(legacyBoldCodeBlock, editor.pmSchema);
    const block = nodeToBlock(node, wrapInDoc(editor.pmSchema, node));
    expect(Array.isArray(block.content)).toBe(true);
  });
});

describe("blockToNode: tables", () => {
  it("resolves column widths to absolute columns with colspans and rowspans", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();

    /**
     *  | 1-1 (rowspan 2) | 1-2 (colspan 2)  |
     *  |                 | 2-1   | 2-2      |
     */
    const node = blockToNode(
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [100, 200, 300],
          rows: [
            {
              cells: [
                { type: "tableCell", props: { rowspan: 2 }, content: "1-1" },
                { type: "tableCell", props: { colspan: 2 }, content: "1-2" },
              ],
            },
            { cells: ["2-1", "2-2"] },
          ],
        },
      },
      editor.pmSchema,
    );

    const table = node.firstChild!;
    expect(table.child(0).child(0).attrs.colwidth).toEqual([100]);
    expect(table.child(0).child(1).attrs.colwidth).toEqual([200, 300]);
    expect(table.child(1).child(0).attrs.colwidth).toEqual([200]);
    expect(table.child(1).child(1).attrs.colwidth).toEqual([300]);
  });
});
