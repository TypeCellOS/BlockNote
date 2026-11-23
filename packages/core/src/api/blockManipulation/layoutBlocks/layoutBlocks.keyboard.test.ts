import { describe, expect } from "vite-plus/test";

import {
  installHeadlessPlugins,
  pressHeadlessKey,
} from "../../../extensions/testHeadlessEditor.js";
import { layoutSchema } from "./layoutBlocks.fixture.js";

const schema = layoutSchema;

const it = globalThis.it.extend<{
  withEditor: (
    initialContent: (typeof schema.PartialBlock)[],
  ) => Promise<typeof schema.BlockNoteEditor>;
}>({
  withEditor: async ({ setupEditor }, use) => {
    await use(async (initialContent) => {
      const { editor } = await setupEditor({ schema, initialContent });
      installHeadlessPlugins(editor);
      return editor;
    });
  },
});

/** Puts the caret at the given position and presses the key. */
function pressKey(
  editor: typeof schema.BlockNoteEditor,
  key: "Tab" | "Enter" | "Backspace" | "Delete",
  block: string,
  placement: "start" | "end",
) {
  editor.setTextCursorPosition(block, placement);
  expect(pressHeadlessKey(editor, { key })).toBe(true);
}

describe("children keyboard handling", () => {
  // The previous sibling's children end in a layout block, which Tab used to
  // throw on ("Cannot join blockContainer onto callout"). The block now nests
  // after the layout block.
  it("Tab after a layout block at the end of the previous sibling's children nests after it", async ({
    withEditor,
  }) => {
    const editor = await withEditor([
      {
        id: "p-0",
        type: "paragraph",
        content: "Paragraph 0",
        children: [
          {
            id: "c-0",
            type: "callout",
            children: [{ type: "paragraph", content: "In callout" }],
          },
        ],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    pressKey(editor, "Tab", "after", "start");

    expect(editor.getBlock("p-0")!.children.map((child) => child.id)).toEqual([
      "c-0",
      "after",
    ]);
    expect(editor.getTextCursorPosition().block.id).toBe("after");
  });

  it("Enter on an empty last child escapes the layout block", async ({
    withEditor,
  }) => {
    const editor = await withEditor([
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "Hello" },
          { id: "c-p-1", type: "paragraph", content: "" },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    pressKey(editor, "Enter", "c-p-1", "end");

    const callout = editor.getBlock("c-0")!;
    expect(callout.children.map((child) => child.id)).toEqual(["c-p-0"]);
    expect(editor.document.map((block) => block.type)).toEqual([
      "callout",
      "paragraph",
      "paragraph",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "c-0",
      "c-p-1",
      "trailing",
    ]);
    // The caret moves out with the block.
    expect(editor.getTextCursorPosition().block.id).toBe("c-p-1");
  });

  it("Enter escape ascends past levels that can't hold the block", async ({
    withEditor,
  }) => {
    // A grid holds only cells, so a block escaping the last cell can't stop
    // at the grid level. It lands below the grid itself.
    const editor = await withEditor([
      {
        type: "grid",
        id: "g-0",
        children: [
          {
            type: "gridCell",
            id: "g-c-0",
            children: [{ id: "g-p-0", type: "paragraph", content: "A" }],
          },
          {
            type: "gridCell",
            id: "g-c-1",
            children: [
              { id: "g-p-1", type: "paragraph", content: "B" },
              { id: "g-p-2", type: "paragraph", content: "" },
            ],
          },
        ],
      },
      { id: "trailing", type: "paragraph", content: "" },
    ]);

    pressKey(editor, "Enter", "g-p-2", "end");

    expect(editor.getBlock("g-c-1")!.children.map((child) => child.id)).toEqual(
      ["g-p-1"],
    );
    expect(editor.document.map((block) => block.id)).toEqual([
      "g-0",
      "g-p-2",
      "trailing",
    ]);
    expect(editor.getTextCursorPosition().block.id).toBe("g-p-2");
  });

  it("Enter on an empty block mid-layout-block stays inside", async ({
    withEditor,
  }) => {
    // The escape only fires at the end of the layout block. An empty block with
    // siblings after it never ejects.
    const editor = await withEditor([
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "Hello" },
          { id: "c-p-1", type: "paragraph", content: "" },
          { id: "c-p-2", type: "paragraph", content: "World" },
        ],
      },
    ]);

    pressKey(editor, "Enter", "c-p-1", "end");

    expect(editor.document.map((block) => block.id)).toEqual(["c-0"]);
    expect(editor.getBlock("c-0")!.children).toHaveLength(4);
  });

  it("Backspace at the start of a layout block's first child moves it out", async ({
    withEditor,
  }) => {
    const editor = await withEditor([
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "First" },
          { id: "c-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    pressKey(editor, "Backspace", "c-p-0", "start");

    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-1",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual([
      "before",
      "c-p-0",
      "c-0",
    ]);
    expect(editor.getBlock("c-p-0")!.content).toEqual([
      { type: "text", text: "First", styles: {} },
    ]);
  });

  it("Backspace at the start of a block after a layout block moves it inside", async ({
    withEditor,
  }) => {
    const editor = await withEditor([
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "In callout" }],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    pressKey(editor, "Backspace", "after", "start");

    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-0",
      "after",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual(["c-0"]);
    expect(editor.getBlock("after")!.content).toEqual([
      { type: "text", text: "After", styles: {} },
    ]);
  });

  it("Delete at the end of a block before a layout block pulls its first child out", async ({
    withEditor,
  }) => {
    const editor = await withEditor([
      { id: "before", type: "paragraph", content: "Before" },
      {
        type: "callout",
        id: "c-0",
        children: [
          { id: "c-p-0", type: "paragraph", content: "First" },
          { id: "c-p-1", type: "paragraph", content: "Second" },
        ],
      },
    ]);

    pressKey(editor, "Delete", "before", "end");

    expect(editor.document.map((block) => block.id)).toEqual([
      "before",
      "c-p-0",
      "c-0",
    ]);
    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-1",
    ]);
  });

  it("Delete at the end of a layout block's last child pulls the next block in", async ({
    withEditor,
  }) => {
    const editor = await withEditor([
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "In callout" }],
      },
      { id: "after", type: "paragraph", content: "After" },
    ]);

    pressKey(editor, "Delete", "c-p-0", "end");

    expect(editor.getBlock("c-0")!.children.map((child) => child.id)).toEqual([
      "c-p-0",
      "after",
    ]);
    expect(editor.document.map((block) => block.id)).toEqual(["c-0"]);
  });
});
