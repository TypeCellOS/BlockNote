// @vitest-environment node
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { BlockNoteSchema } from "../../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../../../schema/blocks/createSpec.js";

// The editor stays headless, so these blocks are never rendered.
// `renderFrame` only has to exist for `createBlockSpec` to accept the spec.
const layoutBlock = (type: string, config: Record<string, unknown>) =>
  createBlockSpec({ type, propSchema: {}, ...config } as any, {
    renderFrame: () => {
      throw new Error("not rendered in this suite");
    },
  })();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    // A layout block of any blocks. `"first-child"`/`"last-child"` insert at
    // the start or end of its children.
    box: layoutBlock("box", {
      content: "none",
      layoutOnly: true,
    }),
    // A layout block that only accepts other layout blocks, so an insertion has to
    // descend a level to find a place for a regular block.
    grid: layoutBlock("grid", {
      content: "none",
      layoutOnly: true,
      children: { allow: ["cell"], min: 2 },
    }),
    cell: layoutBlock("cell", {
      content: "none",
      layoutOnly: true,
      placeable: "namedOnly",
    }),
  } as const,
});

let editor: BlockNoteEditor<any, any, any>;

beforeAll(() => {
  editor = BlockNoteEditor.create({ schema }) as any;
});

afterAll(() => {
  editor._tiptapEditor.destroy();
  editor = undefined as any;
});

beforeEach(() => {
  editor.replaceBlocks(editor.document, [
    { id: "p-0", type: "paragraph", content: "Paragraph 0" },
  ]);
});

describe('insertBlocks "first-child" / "last-child"', () => {
  it("prepends and appends around existing children", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "b-0",
        type: "box",
        children: [{ id: "existing", type: "paragraph", content: "Existing" }],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.insertBlocks(
      [{ id: "first", type: "paragraph" }],
      "b-0",
      "first-child",
    );
    editor.insertBlocks(
      [{ id: "last", type: "paragraph" }],
      "b-0",
      "last-child",
    );

    expect(editor.getBlock("b-0")!.children.map((child) => child.id)).toEqual([
      "first",
      "existing",
      "last",
    ]);
  });

  it("descends into a nested layout block that accepts the block", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "g-0",
        type: "grid",
        children: [
          { id: "c-0", type: "cell" },
          { id: "c-1", type: "cell" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    // `grid` itself only accepts `cell`s, so both placements have to find the
    // leading/trailing cell rather than giving up.
    editor.insertBlocks(
      [{ id: "first", type: "paragraph" }],
      "g-0",
      "first-child",
    );
    editor.insertBlocks(
      [{ id: "last", type: "paragraph" }],
      "g-0",
      "last-child",
    );

    const grid = editor.getBlock("g-0")!;
    expect(grid.children[0].children.map((child: any) => child.id)).toContain(
      "first",
    );
    expect(grid.children[1].children.map((child: any) => child.id)).toContain(
      "last",
    );
  });

  it("nests under a regular block, with or without existing children", () => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "Paragraph 0" },
    ]);

    editor.insertBlocks(
      [{ id: "existing", type: "paragraph" }],
      "p-0",
      "last-child",
    );
    editor.insertBlocks(
      [{ id: "first", type: "paragraph" }],
      "p-0",
      "first-child",
    );

    expect(editor.getBlock("p-0")!.children.map((child) => child.id)).toEqual([
      "first",
      "existing",
    ]);
  });

  it("throws when a sibling placement isn't allowed either", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "g-0",
        type: "grid",
        children: [
          { id: "c-0", type: "cell" },
          { id: "c-1", type: "cell" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    // `grid`'s children are `cell`s only, so a paragraph can't become one's
    // sibling. Previously this threw a raw ProseMirror `ReplaceError`.
    expect(() =>
      editor.insertBlocks([{ type: "paragraph" }], "c-0", "after"),
    ).toThrow(/at "after" of block "c-0": no valid position/);
  });

  it("throws when only the first of several blocks would fit", () => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "Paragraph 0" },
    ]);

    // Nesting under a childless regular block wraps the batch in a fresh
    // `blockGroup`, which takes the paragraph but not the `namedOnly`
    // cell. Validating only the first node used to let the batch through and
    // fail later with a raw ProseMirror `ReplaceError`.
    expect(() =>
      editor.insertBlocks(
        [{ type: "paragraph" }, { type: "cell" }],
        "p-0",
        "last-child",
      ),
    ).toThrow(/at "last-child" of block "p-0": .* doesn't accept them/);

    expect(editor.getBlock("p-0")!.children).toEqual([]);
  });

  it("still inserts a batch that fits in full", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "b-0",
        type: "box",
        children: [{ id: "existing", type: "paragraph" }],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.insertBlocks(
      [
        { id: "one", type: "paragraph" },
        { id: "two", type: "paragraph" },
      ],
      "b-0",
      "last-child",
    );

    expect(editor.getBlock("b-0")!.children.map((child) => child.id)).toEqual([
      "existing",
      "one",
      "two",
    ]);
  });
});
