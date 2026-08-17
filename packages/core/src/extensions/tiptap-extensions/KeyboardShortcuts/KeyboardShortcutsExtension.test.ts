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
