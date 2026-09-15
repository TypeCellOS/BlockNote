import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../../schema/index.js";

/**
 * @vitest-environment jsdom
 */

// The `hardBreakShortcut` setting lives on the block spec's implementation
// (`schema.blockSpecs[type].implementation.meta`), not on the block config in
// `schema.blockSchema`. These blocks verify that the Enter / Shift-Enter
// handlers read it from the right place — a previous regression read it from
// `blockSchema`, which never contains `meta`, so custom settings were silently
// ignored and every block behaved as "shift+enter".
const createHardBreakTestBlockSpec = <
  const T extends string,
  const S extends "shift+enter" | "enter" | "none",
  const C extends "inline" | "plain",
>(
  type: T,
  hardBreakShortcut: S,
  content: C = "inline" as C,
) =>
  createBlockSpec(
    {
      type,
      propSchema: {},
      content,
    },
    {
      meta: {
        hardBreakShortcut,
      },
      render: () => {
        const dom = document.createElement("p");
        return {
          dom,
          contentDOM: dom,
        };
      },
    },
  )();

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    hardBreakEnter: createHardBreakTestBlockSpec("hardBreakEnter", "enter"),
    hardBreakNone: createHardBreakTestBlockSpec("hardBreakNone", "none"),
    // "plain" content (`text*`) can't hold a `hardBreak` node, so these blocks
    // insert a literal newline character instead - e.g. code/math/diagram source.
    hardBreakEnterPlain: createHardBreakTestBlockSpec(
      "hardBreakEnterPlain",
      "enter",
      "plain",
    ),
  },
});

function createEditor(
  blockType:
    | "paragraph"
    | "hardBreakEnter"
    | "hardBreakNone"
    | "hardBreakEnterPlain",
) {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      {
        id: "block-0",
        type: blockType,
        content: "Hello world",
      },
    ],
  });
  editor.mount(document.createElement("div"));
  editor.setTextCursorPosition("block-0", "end");
  return editor;
}

/**
 * Simulates a keyboard shortcut by dispatching a keydown event through the
 * editor's `handleKeyDown` props, which is how ProseMirror invokes the
 * keymap plugins created by `addKeyboardShortcuts`.
 */
function pressKeys(editor: BlockNoteEditor<any, any, any>, keys: string) {
  editor._tiptapEditor.commands.keyboardShortcut(keys);
}

function countHardBreaks(editor: BlockNoteEditor<any, any, any>) {
  let count = 0;
  editor._tiptapEditor.state.doc.descendants((node) => {
    if (node.type.name === "hardBreak") {
      count += 1;
    }
  });
  return count;
}

function getTextContent(editor: BlockNoteEditor<any, any, any>) {
  let text = "";
  editor._tiptapEditor.state.doc.descendants((node) => {
    if (node.isText) {
      text += node.text;
    }
  });
  return text;
}

/**
 * Characterization tests for the Backspace/Delete/Enter/Tab handlers: they pin
 * the current document transformations so the BlockInfo migration inside the
 * handlers is provably behavior-preserving.
 */
function createEditorWithBlocks(
  initialContent: any[],
  cursor: { id: string; placement: "start" | "end" },
) {
  const editor = BlockNoteEditor.create({ schema, initialContent });
  editor.mount(document.createElement("div"));
  editor.setTextCursorPosition(cursor.id, cursor.placement);
  return editor;
}

/** Compact structural view of the document for snapshotting. */
function outline(blocks: any[]): any[] {
  return blocks.map((b) => ({
    type: b.type,
    text: Array.isArray(b.content)
      ? b.content.map((c: any) => c.text ?? "").join("")
      : undefined,
    ...(b.children.length > 0 ? { children: outline(b.children) } : {}),
  }));
}

describe("KeyboardShortcutsExtension Backspace", () => {
  it("merges a block into the previous one at block start", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "a", type: "paragraph", content: "Hello" },
        { id: "b", type: "paragraph", content: "World" },
      ],
      { id: "b", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "HelloWorld",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("merges into the previous block's deepest descendant", () => {
    const editor = createEditorWithBlocks(
      [
        {
          id: "a",
          type: "paragraph",
          content: "Parent",
          children: [{ id: "a1", type: "paragraph", content: "Nested" }],
        },
        { id: "b", type: "paragraph", content: "World" },
      ],
      { id: "b", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "text": "NestedWorld",
              "type": "paragraph",
            },
          ],
          "text": "Parent",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("lifts a nested first child at block start", () => {
    const editor = createEditorWithBlocks(
      [
        {
          id: "a",
          type: "paragraph",
          content: "Parent",
          children: [{ id: "a1", type: "paragraph", content: "Nested" }],
        },
      ],
      { id: "a1", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "Parent",
          "type": "paragraph",
        },
        {
          "text": "Nested",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("deletes an empty block, moving its children out", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "a", type: "paragraph", content: "Before" },
        {
          id: "b",
          type: "paragraph",
          content: "",
          children: [{ id: "b1", type: "paragraph", content: "Child" }],
        },
      ],
      { id: "b", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "Before",
          "type": "paragraph",
        },
        {
          "text": "Child",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });
});

describe("KeyboardShortcutsExtension Delete", () => {
  it("merges the next block in at block end", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "a", type: "paragraph", content: "Hello" },
        { id: "b", type: "paragraph", content: "World" },
      ],
      { id: "a", placement: "end" },
    );

    pressKeys(editor, "Delete");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "HelloWorld",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("merges a next block that has children, un-nesting them", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "a", type: "paragraph", content: "Hello" },
        {
          id: "b",
          type: "paragraph",
          content: "World",
          children: [
            { id: "b1", type: "paragraph", content: "Child 1" },
            { id: "b2", type: "paragraph", content: "Child 2" },
          ],
        },
      ],
      { id: "a", placement: "end" },
    );

    pressKeys(editor, "Delete");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "HelloWorld",
          "type": "paragraph",
        },
        {
          "text": "Child 1",
          "type": "paragraph",
        },
        {
          "text": "Child 2",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("removes an empty next block, adopting its children", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "a", type: "paragraph", content: "Hello" },
        {
          id: "b",
          type: "paragraph",
          content: "",
          children: [{ id: "b1", type: "paragraph", content: "Child" }],
        },
      ],
      { id: "a", placement: "end" },
    );

    pressKeys(editor, "Delete");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "Hello",
          "type": "paragraph",
        },
        {
          "text": "Child",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("removes an empty current block on Delete", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "a", type: "paragraph", content: "" },
        { id: "b", type: "paragraph", content: "After" },
      ],
      { id: "a", placement: "start" },
    );

    pressKeys(editor, "Delete");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "After",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });
});

describe("KeyboardShortcutsExtension Enter", () => {
  it("inserts an empty block above when Enter is pressed at the start", () => {
    const editor = createEditorWithBlocks(
      [{ id: "a", type: "paragraph", content: "Hello" }],
      { id: "a", placement: "start" },
    );

    pressKeys(editor, "Enter");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "",
          "type": "paragraph",
        },
        {
          "text": "Hello",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("lifts an empty nested block on Enter", () => {
    const editor = createEditorWithBlocks(
      [
        {
          id: "a",
          type: "paragraph",
          content: "Parent",
          children: [{ id: "a1", type: "paragraph", content: "" }],
        },
      ],
      { id: "a1", placement: "start" },
    );

    pressKeys(editor, "Enter");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "Parent",
          "type": "paragraph",
        },
        {
          "text": "",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });
});

describe("KeyboardShortcutsExtension Shift-Tab", () => {
  it("un-nests a nested block", () => {
    const editor = createEditorWithBlocks(
      [
        {
          id: "a",
          type: "paragraph",
          content: "Parent",
          children: [{ id: "a1", type: "paragraph", content: "Nested" }],
        },
      ],
      { id: "a1", placement: "start" },
    );

    pressKeys(editor, "Shift-Tab");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "Parent",
          "type": "paragraph",
        },
        {
          "text": "Nested",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });
});

describe("KeyboardShortcutsExtension hardBreakShortcut", () => {
  it("inserts a hard break on Shift-Enter by default", () => {
    const editor = createEditor("paragraph");

    pressKeys(editor, "Shift-Enter");

    expect(countHardBreaks(editor)).toBe(1);
    expect(editor.document.length).toBe(1);

    editor._tiptapEditor.destroy();
  });

  it("splits the block on Enter by default", () => {
    const editor = createEditor("paragraph");

    pressKeys(editor, "Enter");

    expect(countHardBreaks(editor)).toBe(0);
    expect(editor.document.length).toBe(2);

    editor._tiptapEditor.destroy();
  });

  it('inserts a hard break on Enter when hardBreakShortcut is "enter"', () => {
    const editor = createEditor("hardBreakEnter");

    pressKeys(editor, "Enter");

    expect(countHardBreaks(editor)).toBe(1);
    expect(editor.document.length).toBe(1);

    editor._tiptapEditor.destroy();
  });

  it('inserts a hard break on Shift-Enter when hardBreakShortcut is "enter"', () => {
    const editor = createEditor("hardBreakEnter");

    pressKeys(editor, "Shift-Enter");

    expect(countHardBreaks(editor)).toBe(1);
    expect(editor.document.length).toBe(1);

    editor._tiptapEditor.destroy();
  });

  it('does not insert a hard break on Shift-Enter when hardBreakShortcut is "none"', () => {
    const editor = createEditor("hardBreakNone");

    pressKeys(editor, "Shift-Enter");

    expect(countHardBreaks(editor)).toBe(0);

    editor._tiptapEditor.destroy();
  });

  it('splits the block on Enter when hardBreakShortcut is "none"', () => {
    const editor = createEditor("hardBreakNone");

    pressKeys(editor, "Enter");

    expect(countHardBreaks(editor)).toBe(0);
    expect(editor.document.length).toBe(2);

    editor._tiptapEditor.destroy();
  });

  it('inserts a newline character on Enter when content is "plain"', () => {
    const editor = createEditor("hardBreakEnterPlain");

    pressKeys(editor, "Enter");

    // A "plain" block can't hold a `hardBreak` node, so no node is inserted and
    // the block is not split - a literal newline is added to its text instead.
    expect(countHardBreaks(editor)).toBe(0);
    expect(editor.document.length).toBe(1);
    expect(getTextContent(editor)).toBe("Hello world\n");

    editor._tiptapEditor.destroy();
  });

  it('inserts a newline character on Shift-Enter when content is "plain"', () => {
    const editor = createEditor("hardBreakEnterPlain");

    pressKeys(editor, "Shift-Enter");

    expect(countHardBreaks(editor)).toBe(0);
    expect(editor.document.length).toBe(1);
    expect(getTextContent(editor)).toBe("Hello world\n");

    editor._tiptapEditor.destroy();
  });
});
