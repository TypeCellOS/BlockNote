// @vitest-environment node
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { contentContainerSchema } from "./contentContainers.fixture.js";

// Document-model behaviour of content-bearing containers (the "toggle" shape:
// a container with its own inline content as well as children): repair,
// childless handling, `updateBlock` and selection. Everything is `Block` JSON
// in and out, so the editor runs headless with no DOM.
//
// The keymap is tested in `contentContainers.browser.test.ts`, since tiptap
// can only reach `handleKeyDown` through a mounted view.

const schema = contentContainerSchema;

let editor: BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

beforeAll(() => {
  editor = BlockNoteEditor.create({ schema });
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

describe("content-bearing container: repair", () => {
  // Unwrapping the container discards its node, and with it the title text
  // the user typed, so repair must refuse rather than silently destroy it.
  it("does not unwrap a container whose title has content", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "titledGrid",
        id: "g-0",
        content: "Kept title",
        children: [
          { id: "g-p-0", type: "paragraph", content: "A" },
          { id: "g-p-1", type: "paragraph", content: "B" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["g-p-0"]);

    const grid = editor.getBlock("g-0");
    expect(grid).toBeDefined();
    expect(grid!.content).toEqual([
      { type: "text", text: "Kept title", styles: {} },
    ]);
    // `min: 2`, so ProseMirror refills the removed child rather than letting
    // the container drop below what its content expression requires.
    expect(grid!.children).toHaveLength(2);
    expect(grid!.children.map((child) => child.id)).toContain("g-p-1");
  });

  // The pure-container version of this unwrap is covered in
  // `containers.test.ts` ("unwraps a repair-configured container...").
  it("unwraps a container whose title is empty", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "titledGrid",
        id: "g-0",
        content: "",
        children: [
          { id: "g-p-0", type: "paragraph", content: "A" },
          { id: "g-p-1", type: "paragraph", content: "B" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["g-p-0"]);

    expect(editor.getBlock("g-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "g-p-1",
      "trailing",
    ]);
  });

  it("deletes a titleless container that empties out completely", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "titledGrid",
        id: "g-0",
        content: "",
        children: [
          { id: "g-p-0", type: "paragraph", content: "A" },
          { id: "g-p-1", type: "paragraph", content: "B" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    editor.removeBlocks(["g-p-0", "g-p-1"]);

    expect(editor.getBlock("g-0")).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual(["trailing"]);
  });
});

describe("content-bearing container: childless container", () => {
  it("setTextCursorPosition on a childless pure container does not throw", () => {
    // A pure container that allows zero children has no child to descend into.
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "Paragraph 0" },
    ]);
    editor.insertBlocks(
      [{ type: "emptyBox", id: "b-0", children: [] } as any],
      "p-0",
      "after",
    );

    expect(() => editor.setTextCursorPosition("b-0", "start")).not.toThrow();
    expect(() => editor.setTextCursorPosition("b-0", "end")).not.toThrow();
  });

  it("setTextCursorPosition on a childless content-bearing container works", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "optionalToggle",
        id: "t-0",
        content: "Title",
        children: [],
      },
    ]);

    editor.setTextCursorPosition("t-0", "end");
    expect(editor.getTextCursorPosition().block.id).toBe("t-0");
  });
});

describe("content-bearing container: updateBlock", () => {
  it("updates the title or props in place, leaving the rest untouched", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [{ id: "t-p-0", type: "paragraph", content: "Child" }],
      },
    ]);

    editor.updateBlock("t-0", { content: "New title" });
    editor.updateBlock("t-0", { props: { open: false } });

    const toggle = editor.getBlock("t-0")!;
    expect((toggle.props as any).open).toBe(false);
    expect(toggle.content).toEqual([
      { type: "text", text: "New title", styles: {} },
    ]);
    expect(toggle.children.map((child) => child.id)).toEqual(["t-p-0"]);
  });

  it("carries content and children from a paragraph into a container", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "p-0",
        type: "paragraph",
        content: "Title",
        children: [{ id: "p-c-0", type: "paragraph", content: "Child" }],
      },
    ]);

    editor.updateBlock("p-0", { type: "toggle" });

    // The full-replace path builds a fresh node, so the block is addressed by
    // position rather than by id here.
    const toggle = editor.document[0];
    expect(toggle.type).toBe("toggle");
    expect(toggle.content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(toggle.children.map((child) => child.id)).toEqual(["p-c-0"]);
  });

  it("carries content and children from a container back to a paragraph", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [{ id: "t-p-0", type: "paragraph", content: "Child" }],
      },
    ]);

    editor.updateBlock("t-0", { type: "paragraph" });

    const paragraph = editor.document[0];
    expect(paragraph.type).toBe("paragraph");
    expect(paragraph.content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(paragraph.children.map((child) => child.id)).toEqual(["t-p-0"]);
  });

  it("carries content into a pure container's first child", () => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "Some text" },
    ]);

    editor.updateBlock("p-0", { type: "callout" });

    const callout = editor.document[0];
    expect(callout.type).toBe("callout");
    expect(callout.children).toHaveLength(1);
    expect(callout.children[0].content).toEqual([
      { type: "text", text: "Some text", styles: {} },
    ]);
  });

  it("an explicit `content` in the update wins over the carried one", () => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "Old" },
    ]);

    editor.updateBlock("p-0", { type: "toggle", content: "New" });

    expect(editor.document[0].content).toEqual([
      { type: "text", text: "New", styles: {} },
    ]);
  });

  it("treats `children: []` as inert, not as a clear", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [{ id: "t-p-0", type: "paragraph", content: "Child" }],
      },
    ]);

    editor.updateBlock("t-0", { children: [], props: { open: false } });

    const toggle = editor.getBlock("t-0")!;
    expect((toggle.props as any).open).toBe(false);
    expect(toggle.children.map((child) => child.id)).toEqual(["t-p-0"]);
  });
});

describe("content-bearing container: selection", () => {
  it("getSelectionCutBlocks handles a selection reaching into the container", () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [
          { id: "t-p-0", type: "paragraph", content: "First" },
          { id: "t-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);
    editor.setSelection("before", "t-p-0");

    const result = editor.getSelectionCutBlocks();
    // The container is partially covered, so its included children are
    // spliced in rather than the container being returned whole.
    expect(result.blocks.map((block) => block.id)).toEqual(["before", "t-p-0"]);
  });

  it("getSelectionCutBlocks handles a selection ending inside the title", () => {
    editor.replaceBlocks(editor.document, [
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "toggle",
        id: "t-0",
        content: "Title",
        children: [
          { id: "t-p-0", type: "paragraph", content: "First" },
          { id: "t-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);
    editor.setSelection("before", "t-0");

    // The selection ends inside the container's own title, before any of its
    // children, so the generated `__children` node is absent from the slice.
    // Converting the container must not throw. It comes back as a cut block
    // (its title, no children) rather than recursing into its content node.
    const result = editor.getSelectionCutBlocks();
    expect(result.blocks.map((block) => block.id)).toEqual(["before", "t-0"]);
    expect(result.blockCutAtEnd).toBe("t-0");
    const toggle = result.blocks.find((block) => block.id === "t-0")!;
    expect(toggle.children).toEqual([]);
  });
});
