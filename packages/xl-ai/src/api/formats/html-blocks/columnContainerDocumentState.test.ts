// @vitest-environment jsdom

import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { htmlBlockLLMFormat } from "./htmlBlocks.js";

const schema = withMultiColumn(BlockNoteSchema.create());

// Regression test for https://github.com/TypeCellOS/BlockNote/issues/2716
describe("htmlBlockLLMFormat.defaultDocumentStateBuilder with multi-column", () => {
  let editor: BlockNoteEditor<any, any, any>;
  const div = document.createElement("div");

  beforeEach(() => {
    editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          id: "column-list-0",
          type: "columnList",
          children: [
            {
              id: "column-0",
              type: "column",
              children: [
                {
                  id: "left-paragraph",
                  type: "paragraph",
                  content: "left column",
                },
              ],
            },
            {
              id: "column-1",
              type: "column",
              children: [
                {
                  id: "right-paragraph",
                  type: "paragraph",
                  content: "right column",
                },
              ],
            },
          ],
        },
      ],
    });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  it("builds the document state for a doc containing a columnList without throwing", async () => {
    const result = await htmlBlockLLMFormat.defaultDocumentStateBuilder({
      editor,
      streamTools: [],
      onStart: () => {
        // no-op
      },
    });

    if (result.selection !== false) {
      throw new Error("expected selection-less document state");
    }

    const idEntries = result.blocks.filter(
      (b): b is { id: string; block: string } => "id" in b,
    );

    const columnListEntry = idEntries.find((b) =>
      b.id.includes("column-list-0"),
    );
    expect(columnListEntry).toBeDefined();
    expect(columnListEntry!.block).toContain('data-node-type="columnList"');

    expect(idEntries.find((b) => b.id.includes("column-0"))).toBeDefined();
    expect(idEntries.find((b) => b.id.includes("column-1"))).toBeDefined();
    expect(
      idEntries.find((b) => b.id.includes("left-paragraph")),
    ).toBeDefined();
    expect(
      idEntries.find((b) => b.id.includes("right-paragraph")),
    ).toBeDefined();
  });

  it("builds the document state when invoked with selectedBlocks containing a columnList", async () => {
    const result = await htmlBlockLLMFormat.defaultDocumentStateBuilder({
      editor,
      selectedBlocks: editor.document,
      streamTools: [],
      onStart: () => {
        // no-op
      },
    });

    if (result.selection !== true) {
      throw new Error("expected selection-based document state");
    }
    expect(result.selectedBlocks.length).toBeGreaterThan(0);
  });
});
