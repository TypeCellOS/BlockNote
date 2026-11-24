import { BlockNoteSchema } from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { describe, expect } from "vite-plus/test";

import { htmlBlockLLMFormat } from "./htmlBlocks.js";

const schema = withMultiColumn(BlockNoteSchema.create());

// Regression test for https://github.com/TypeCellOS/BlockNote/issues/2716
const editorOptions = {
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
} satisfies {
  schema: typeof schema;
  initialContent: (typeof schema.PartialBlock)[];
};

describe("htmlBlockLLMFormat.defaultDocumentStateBuilder with multi-column", () => {
  it("builds the document state for a doc containing a columnList without throwing", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      ...editorOptions,
      mountType: false,
    });
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
    // External HTML has no BlockNote markers; the column list is recognized
    // by its class (see the `parse` of the column blocks).
    expect(columnListEntry!.block).toContain('class="bn-block-column-list"');

    expect(idEntries.find((b) => b.id.includes("column-0"))).toBeDefined();
    expect(idEntries.find((b) => b.id.includes("column-1"))).toBeDefined();
    expect(
      idEntries.find((b) => b.id.includes("left-paragraph")),
    ).toBeDefined();
    expect(
      idEntries.find((b) => b.id.includes("right-paragraph")),
    ).toBeDefined();
  });

  it("builds the document state when invoked with selectedBlocks containing a columnList", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      ...editorOptions,
      mountType: false,
    });
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
