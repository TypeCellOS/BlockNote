// @vitest-environment node
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";

let editor: BlockNoteEditor<any, any, any>;

beforeAll(() => {
  editor = BlockNoteEditor.create() as any;
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
  it("nests under a childless block, creating the blockGroup", () => {
    expect(editor.getBlock("p-0")!.children).toHaveLength(0);

    editor.insertBlocks(
      [{ id: "first", type: "paragraph" }],
      "p-0",
      "first-child",
    );
    editor.insertBlocks(
      [{ id: "last", type: "paragraph" }],
      "p-0",
      "last-child",
    );

    expect(editor.getBlock("p-0")!.children.map((child) => child.id)).toEqual([
      "first",
      "last",
    ]);
  });

  it("prepends and appends around existing children", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "p-0",
        type: "paragraph",
        content: "Paragraph 0",
        children: [{ id: "existing", type: "paragraph", content: "Existing" }],
      },
    ]);

    editor.insertBlocks(
      [{ id: "first", type: "paragraph" }],
      "p-0",
      "first-child",
    );
    editor.insertBlocks(
      [{ id: "last", type: "paragraph" }],
      "p-0",
      "last-child",
    );

    expect(editor.getBlock("p-0")!.children.map((child) => child.id)).toEqual([
      "first",
      "existing",
      "last",
    ]);
  });

  it("still inserts siblings with the default and explicit placements", () => {
    editor.insertBlocks([{ id: "after", type: "paragraph" }], "p-0");
    editor.insertBlocks([{ id: "before", type: "paragraph" }], "p-0", "before");
    editor.insertBlocks([{ id: "sibling", type: "paragraph" }], "p-0", "after");

    expect(editor.document.map((block) => block.id)).toEqual([
      "after",
      "before",
      "p-0",
      "sibling",
    ]);
  });

  it("still inserts a batch that fits in full", () => {
    editor.insertBlocks(
      [
        { id: "one", type: "paragraph" },
        { id: "two", type: "paragraph" },
      ],
      "p-0",
      "last-child",
    );

    expect(editor.getBlock("p-0")!.children.map((child) => child.id)).toEqual([
      "one",
      "two",
    ]);
  });

  it("throws when the reference block does not exist", () => {
    expect(() =>
      editor.insertBlocks([{ type: "paragraph" }], "missing-id", "last-child"),
    ).toThrow(/Block with ID missing-id not found/);
  });
});
