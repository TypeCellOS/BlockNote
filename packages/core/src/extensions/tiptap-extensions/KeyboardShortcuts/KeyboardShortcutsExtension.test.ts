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

/** Creates a mounted editor with the cursor at the end of the first block. */
function createEditorWithBlocks(
  blocks: ((typeof schema)["PartialBlock"] & { id: string })[],
) {
  const editor = BlockNoteEditor.create({ schema, initialContent: blocks });
  editor.mount(document.createElement("div"));
  editor.setTextCursorPosition(blocks[0].id, "end");
  return editor;
}

/**
 * Simulates a keyboard shortcut (e.g. "Enter", "Mod-a") via ProseMirror's
 * `handleKeyDown` prop, and returns whether it was handled. Can't go via
 * TipTap's `keyboardShortcut` command, which replays only the shortcut's steps
 * - so it drops shortcuts that just move the selection.
 */
function pressKeys(editor: BlockNoteEditor<any, any, any>, keys: string) {
  const lastSeparatorIndex = keys.lastIndexOf("-");
  const modifiers = keys.slice(0, lastSeparatorIndex);
  const event = new KeyboardEvent("keydown", {
    key: keys.slice(lastSeparatorIndex + 1),
    // `Mod` is Cmd on macOS and Ctrl elsewhere - tests run in jsdom, which
    // isn't macOS.
    ctrlKey: modifiers.includes("Mod") || modifiers.includes("Ctrl"),
    shiftKey: modifiers.includes("Shift"),
    cancelable: true,
  });

  const view = editor._tiptapEditor.view;

  return view.someProp("handleKeyDown", (f) => f(view, event)) ?? false;
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

describe("KeyboardShortcutsExtension select all", () => {
  // Select-all used to have no keybinding, so it fell through to the browser.
  // ProseMirror couldn't map the resulting DOM selection onto a document
  // starting with a check list item (which renders its checkbox before its
  // content), so it stayed unselected and Backspace only edited one block.
  const checkListItemFirst = [
    { id: "block-0", type: "checkListItem", content: "Check 1" },
    { id: "block-1", type: "checkListItem", content: "Check 2" },
    { id: "block-2", type: "paragraph", content: "Hello world" },
  ] as const;

  it("selects the whole document on Mod-a", () => {
    const editor = createEditorWithBlocks([...checkListItemFirst]);

    expect(pressKeys(editor, "Mod-a")).toBe(true);

    const { selection, doc } = editor._tiptapEditor.state;
    expect(selection.from).toBe(0);
    expect(selection.to).toBe(doc.content.size);

    editor._tiptapEditor.destroy();
  });

  it.each([
    ["starting with check list items", [...checkListItemFirst]],
    [
      "of only check list items",
      [
        { id: "block-0", type: "checkListItem", content: "Check 1" },
        { id: "block-1", type: "checkListItem", content: "Check 2" },
      ] as const,
    ],
    [
      "of paragraphs",
      [
        { id: "block-0", type: "paragraph", content: "Hello" },
        { id: "block-1", type: "paragraph", content: "World" },
      ] as const,
    ],
  ])("clears a document %s on Mod-a + Backspace", (_, blocks) => {
    const editor = createEditorWithBlocks([...blocks]);

    pressKeys(editor, "Mod-a");
    pressKeys(editor, "Backspace");

    // The schema refills the emptied doc with a single default block.
    expect(editor.document.map((block) => block.type)).toEqual(["paragraph"]);
    expect(editor.document[0].content).toEqual([]);

    editor._tiptapEditor.destroy();
  });

  // A whole-document selection's endpoints lie outside any block, which
  // `getNearestBlockPos` still has to resolve.
  it("returns every block from getSelection while everything is selected", () => {
    const editor = createEditorWithBlocks([
      { id: "block-0", type: "checkListItem", content: "Check 1" },
      { id: "block-1", type: "paragraph", content: "Hello world" },
    ]);

    pressKeys(editor, "Mod-a");

    expect(editor.getSelection()?.blocks.map((block) => block.type)).toEqual([
      "checkListItem",
      "paragraph",
    ]);

    editor._tiptapEditor.destroy();
  });
});
