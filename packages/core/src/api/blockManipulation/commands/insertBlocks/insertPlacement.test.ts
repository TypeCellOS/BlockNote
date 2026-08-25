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

// The editor stays headless, so these blocks are never rendered. `render`
// only has to exist for `createBlockSpec` to accept the spec.
const container = (type: string, config: Record<string, unknown>) =>
  createBlockSpec({ type, propSchema: {}, ...config } as any, {
    render: () => {
      throw new Error("not rendered in this suite");
    },
  })();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    // Why `"start"`/`"end"` exist: a container that may legally hold nothing
    // has no child block to address, so `"before"`/`"after"` cannot reach
    // inside it.
    box: container("box", {
      content: "none",
      children: { allow: "any", min: 0 },
    }),
    // A container that only accepts other containers, so an insertion has to
    // descend a level to find a place for a regular block.
    grid: container("grid", {
      content: "none",
      children: { allow: ["cell"], min: 2 },
    }),
    cell: container("cell", {
      content: "none",
      children: { allow: "any" },
      placement: "containerOnly",
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

describe('insertBlocks "start" / "end"', () => {
  it("inserts into a childless container", () => {
    editor.replaceBlocks(editor.document, [
      { id: "b-0", type: "box" },
      { id: "trailing", type: "paragraph", content: "" },
    ]);
    expect(editor.getBlock("b-0")!.children).toHaveLength(0);

    editor.insertBlocks([{ id: "first", type: "paragraph" }], "b-0", "start");
    editor.insertBlocks([{ id: "last", type: "paragraph" }], "b-0", "end");

    expect(editor.getBlock("b-0")!.children.map((child) => child.id)).toEqual([
      "first",
      "last",
    ]);
  });

  it("prepends and appends around existing children", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "b-0",
        type: "box",
        children: [{ id: "existing", type: "paragraph", content: "Existing" }],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.insertBlocks([{ id: "first", type: "paragraph" }], "b-0", "start");
    editor.insertBlocks([{ id: "last", type: "paragraph" }], "b-0", "end");

    expect(editor.getBlock("b-0")!.children.map((child) => child.id)).toEqual([
      "first",
      "existing",
      "last",
    ]);
  });

  it("descends into a nested container that accepts the block", () => {
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
    editor.insertBlocks([{ id: "first", type: "paragraph" }], "g-0", "start");
    editor.insertBlocks([{ id: "last", type: "paragraph" }], "g-0", "end");

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

    editor.insertBlocks([{ id: "existing", type: "paragraph" }], "p-0", "end");
    editor.insertBlocks([{ id: "first", type: "paragraph" }], "p-0", "start");

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
    ).toThrow(/its parent does not accept it/);
  });
});
