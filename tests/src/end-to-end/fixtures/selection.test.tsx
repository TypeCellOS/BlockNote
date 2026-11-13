import { BlockNoteSchema, defaultStyleSpecs } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";

describe("selectText", () => {
  it("finds a substring across differently marked text nodes", async ({
    renderEditor,
    selectText,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Before sel", styles: {} },
            { type: "text", text: "ect", styles: { bold: true } },
            { type: "text", text: "ed after", styles: { italic: true } },
          ],
        },
      ],
    });
    const documentBefore = editor.document;

    selectText(editor, "selected");

    expect(editor.getSelectedText()).toBe("selected");
    expect(editor.document).toEqual(documentBefore);
  });

  it("resets the search at hard breaks and block boundaries", async ({
    renderEditor,
    selectText,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { type: "paragraph", content: "split\nword" },
        { type: "paragraph", content: "split" },
        { type: "paragraph", content: "word" },
        { id: "match", type: "paragraph", content: "splitword" },
      ],
    });

    selectText(editor, "splitword");

    expect(editor.getSelectedText()).toBe("splitword");
    expect(editor.getSelection()?.blocks.map((block) => block.id)).toEqual([
      "match",
    ]);
  });

  it("restricts matching to one block by default, or an inclusive block range", async ({
    renderEditor,
    selectText,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { id: "before", type: "paragraph", content: "Repeated text" },
        { id: "start", type: "paragraph", content: "Repeated text" },
        { id: "end", type: "paragraph", content: "Last text" },
        { id: "after", type: "paragraph", content: "Outside text" },
      ],
    });

    selectText(editor, "Repeated", { startBlockId: "start" });

    expect(editor.getSelectedText()).toBe("Repeated");
    expect(editor.getSelection()?.blocks.map((block) => block.id)).toEqual([
      "start",
    ]);
    expect(() => selectText(editor, "Last", { startBlockId: "start" })).toThrow(
      'selectText could not find "Last"',
    );

    selectText(editor, "Last", { startBlockId: "start", endBlockId: "end" });

    expect(editor.getSelectedText()).toBe("Last");
    expect(editor.getSelection()?.blocks.map((block) => block.id)).toEqual([
      "end",
    ]);
    expect(() =>
      selectText(editor, "Outside", {
        startBlockId: "start",
        endBlockId: "end",
      }),
    ).toThrow('selectText could not find "Outside"');
  });

  it("supports an editor with a custom schema", async ({
    renderEditor,
    selectText,
  }) => {
    const { editor } = await renderEditor({
      schema: BlockNoteSchema.create({
        styleSpecs: { italic: defaultStyleSpecs.italic },
      }),
      initialContent: [{ type: "paragraph", content: "Custom schema" }],
    });

    selectText(editor, "schema");

    expect(editor.getSelectedText()).toBe("schema");
  });

  it("fails clearly for invalid input without changing the selection", async ({
    renderEditor,
    selectText,
  }) => {
    const { editor } = await renderEditor({
      initialContent: [
        { id: "first", type: "paragraph", content: "First" },
        { id: "last", type: "paragraph", content: "Last" },
      ],
    });
    selectText(editor, "First");
    const selectionBefore = editor.prosemirrorState.selection.toJSON();

    expect(() => selectText(editor, "")).toThrow("non-empty substring");
    expect(() => selectText(editor, "Missing")).toThrow(
      'selectText could not find "Missing"',
    );
    expect(() =>
      selectText(editor, "First", { startBlockId: "missing" }),
    ).toThrow("could not find the requested block range");
    expect(() =>
      selectText(editor, "First", {
        startBlockId: "last",
        endBlockId: "first",
      }),
    ).toThrow("blocks in document order");
    expect(editor.prosemirrorState.selection.toJSON()).toEqual(selectionBefore);
  });
});
