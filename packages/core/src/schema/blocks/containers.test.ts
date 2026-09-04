import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "./createSpec.js";

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

// A grid of cells: the same shape as a column list and its columns.
const Cell = createBlockSpec(
  {
    type: "cell" as const,
    propSchema: {},
    content: "none" as const,
    children: { allow: "any" as const },
    placement: "containerOnly" as const,
  },
  { render: renderDiv },
)();

const Grid = createBlockSpec(
  {
    type: "grid" as const,
    propSchema: { tone: { default: "plain" } },
    content: "none" as const,
    children: { allow: ["cell"] as const, min: 2 },
  },
  { render: renderDiv },
)();

// A container placeable anywhere, holding blocks directly.
const Box = createBlockSpec(
  {
    type: "box" as const,
    propSchema: {},
    content: "none" as const,
    children: { allow: "any" as const },
  },
  { render: renderDiv },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    cell: Cell,
    grid: Grid,
    box: Box,
  } as const,
});

function shape(blocks: any[]): string {
  return blocks
    .map((block) => {
      const text = Array.isArray(block.content)
        ? block.content.map((c: any) => c.text ?? "").join("")
        : "";
      const children = block.children?.length
        ? `[${shape(block.children)}]`
        : "";
      return `${block.type}${text ? `"${text}"` : ""}${children}`;
    })
    .join(", ");
}

function editorWith(initialContent: any[]) {
  const editor = BlockNoteEditor.create({ schema, initialContent } as any);
  editor.mount(document.createElement("div"));
  return editor;
}

const grid = (...cells: string[][]) => ({
  id: "g",
  type: "grid" as const,
  children: cells.map((paragraphs, i) => ({
    id: `c${i}`,
    type: "cell" as const,
    children: paragraphs.map((content, j) => ({
      id: `c${i}p${j}`,
      type: "paragraph" as const,
      content,
    })),
  })),
});

describe("container blocks", () => {
  it("builds a node that holds its children directly", () => {
    const editor = editorWith([grid(["A"], ["B"])]);
    expect(shape(editor.document)).toBe(
      'grid[cell[paragraph"A"], cell[paragraph"B"]]',
    );
    expect(editor.pmSchema.nodes["grid"].isInGroup("bnBlock")).toBe(true);
    expect(editor.pmSchema.nodes["grid"].isInGroup("childContainer")).toBe(
      true,
    );
    // A `containerOnly` block stays out of the group regular blocks live in,
    // so it can only ever appear inside a container that names it.
    expect(editor.pmSchema.nodes["cell"].isInGroup("blockGroupChild")).toBe(
      false,
    );
    expect(editor.pmSchema.nodes["box"].isInGroup("blockGroupChild")).toBe(
      true,
    );
    editor._tiptapEditor.destroy();
  });

  it("rejects a container inserted without the children it requires", () => {
    const editor = editorWith([{ id: "p", type: "paragraph", content: "P" }]);
    expect(() =>
      editor.insertBlocks([{ type: "grid" } as any], "p", "after"),
    ).toThrow();
    editor._tiptapEditor.destroy();
  });

  it("rejects children a container doesn't allow", () => {
    const editor = editorWith([grid(["A"], ["B"])]);
    expect(() =>
      editor.insertBlocks(
        [{ type: "paragraph", content: "nope" } as any],
        "c0",
        "before",
      ),
    ).toThrow();
    editor._tiptapEditor.destroy();
  });

  it("dissolves into the surviving child when emptied below its minimum", () => {
    const editor = editorWith([grid(["A"], ["B"])]);
    editor.removeBlocks(["c1p0"]);
    expect(shape(editor.document)).toBe('paragraph"A"');
    editor._tiptapEditor.destroy();
  });

  it("keeps a container that still has enough children", () => {
    const editor = editorWith([grid(["A"], ["B"], ["C"])]);
    editor.removeBlocks(["c2p0"]);
    expect(shape(editor.document)).toBe(
      'grid[cell[paragraph"A"], cell[paragraph"B"]]',
    );
    editor._tiptapEditor.destroy();
  });

  it("dissolves a container the user emptied out", () => {
    const editor = editorWith([
      {
        id: "b",
        type: "box",
        children: [
          { id: "b1", type: "paragraph", content: "" },
          { id: "b2", type: "paragraph", content: "Kept" },
        ],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    editor.removeBlocks(["b2"]);
    expect(shape(editor.document)).toBe('paragraph"After"');
    editor._tiptapEditor.destroy();
  });

  it("keeps a container that still holds something", () => {
    const editor = editorWith([
      {
        id: "b",
        type: "box",
        children: [
          { id: "b1", type: "paragraph", content: "" },
          { id: "b2", type: "paragraph", content: "Kept" },
        ],
      },
    ]);
    editor.removeBlocks(["b1"]);
    expect(shape(editor.document)).toBe('box[paragraph"Kept"]');
    editor._tiptapEditor.destroy();
  });

  it("round-trips through internal HTML", () => {
    const editor = editorWith([grid(["A"], ["B"])]);
    const html = editor.blocksToFullHTML(editor.document as any);
    expect(html).toContain('data-node-type="grid"');
    expect(shape(editor.tryParseHTMLToBlocks(html))).toBe(
      'grid[cell[paragraph"A"], cell[paragraph"B"]]',
    );
    editor._tiptapEditor.destroy();
  });

  it("round-trips a non-default prop", () => {
    const editor = editorWith([
      { ...grid(["A"], ["B"]), props: { tone: "loud" } },
    ]);
    const html = editor.blocksToFullHTML(editor.document as any);
    expect(html).toContain('data-tone="loud"');
    expect(editor.tryParseHTMLToBlocks(html)[0].props).toMatchObject({
      tone: "loud",
    });
    editor._tiptapEditor.destroy();
  });

  it("gives every container block an id", () => {
    const editor = editorWith([grid(["A"], ["B"])]);
    expect(editor.getBlock("g")).not.toBeUndefined();
    expect(editor.getBlock("c0")).not.toBeUndefined();
    editor._tiptapEditor.destroy();
  });
});
