import { Selection, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { getBlockInfo } from "../../../api/getBlockInfoFromPos.js";
import { getNodeById } from "../../../api/nodeUtil.js";
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

describe("KeyboardShortcutsExtension Mod-a (select all)", () => {
  // BlockNote disables TipTap's core extensions, so it has no default `Mod-a`
  // binding and select-all used to rely on the browser's native behaviour. That
  // native select-all collapses to a cursor when the editor's first element is
  // non-editable - e.g. the checkbox `<div>` of a check list item as the first
  // block - so `Mod-a` is now handled explicitly. These tests exercise the
  // keymap path (not native selection) and would collapse before the fix.
  function createSelectAllEditor(
    blocks: { type: "paragraph" | "checkListItem"; content: string }[],
  ) {
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: blocks.map((block, index) => ({
        id: `block-${index}`,
        ...block,
      })),
    });
    editor.mount(document.createElement("div"));
    return editor;
  }

  // Dispatches a real `Mod-a` keydown through ProseMirror's `handleKeyDown`, the
  // path browsers use to invoke the keymap. TipTap's `keyboardShortcut` command
  // doesn't reliably simulate modifier combos in jsdom, and prosemirror-keymap
  // resolves `Mod` to `Ctrl` outside of a Mac environment (jsdom reports none).
  function pressSelectAll(editor: BlockNoteEditor<any, any, any>) {
    const view = editor._tiptapEditor.view;
    const event = new KeyboardEvent("keydown", {
      key: "a",
      code: "KeyA",
      ctrlKey: true,
    });
    view.someProp("handleKeyDown", (handler) => handler(view, event));
  }

  function pressBackspace(editor: BlockNoteEditor<any, any, any>) {
    const view = editor._tiptapEditor.view;
    const event = new KeyboardEvent("keydown", {
      key: "Backspace",
      code: "Backspace",
    });
    view.someProp("handleKeyDown", (handler) => handler(view, event));
  }

  function expectWholeDocSelected(editor: BlockNoteEditor<any, any, any>) {
    const { selection, doc } = editor._tiptapEditor.state;
    // Select-all spans all content as a `TextSelection` (from the first
    // selectable position to the last), not an `AllSelection`.
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.from).toBe(Selection.atStart(doc).from);
    expect(selection.to).toBe(Selection.atEnd(doc).to);
  }

  function expectBlockContentSelected(
    editor: BlockNoteEditor<any, any, any>,
    blockId: string,
  ) {
    const { selection, doc } = editor._tiptapEditor.state;
    const blockInfo = getBlockInfo(getNodeById(blockId, doc)!);
    if (!blockInfo.isBlockContainer) {
      throw new Error(`Block ${blockId} is not a block container`);
    }
    // The current block's content is selected as a `TextSelection` spanning its
    // full content, without reaching into neighbouring blocks.
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.from).toBe(blockInfo.blockContent.beforePos + 1);
    expect(selection.to).toBe(blockInfo.blockContent.afterPos - 1);
  }

  // Each test walks the full Notion-style flow: the first `Mod-a` selects the
  // current block, the second expands to the whole document, and Backspace
  // clears it (issue #2973 - the bug was specific to documents starting with a
  // check list item).
  it("escalates the selection and clears a paragraph-first document", () => {
    const editor = createSelectAllEditor([
      { type: "paragraph", content: "First" },
      { type: "paragraph", content: "Second" },
    ]);
    editor.setTextCursorPosition("block-0", "end");

    pressSelectAll(editor);
    expectBlockContentSelected(editor, "block-0");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    pressBackspace(editor);
    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);

    editor._tiptapEditor.destroy();
  });

  it("escalates the selection and clears a check-list-first document", () => {
    const editor = createSelectAllEditor([
      { type: "checkListItem", content: "First" },
      { type: "paragraph", content: "Second" },
    ]);
    // Cursor starts in a later block to check select-all still spans the whole
    // document, not just the current block.
    editor.setTextCursorPosition("block-1", "end");

    pressSelectAll(editor);
    expectBlockContentSelected(editor, "block-1");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    pressBackspace(editor);
    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);

    editor._tiptapEditor.destroy();
  });

  it("escalates the selection and clears an all-check-list document", () => {
    const editor = createSelectAllEditor([
      { type: "checkListItem", content: "First" },
      { type: "checkListItem", content: "Second" },
    ]);
    editor.setTextCursorPosition("block-0", "end");

    pressSelectAll(editor);
    expectBlockContentSelected(editor, "block-0");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    pressBackspace(editor);
    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);

    editor._tiptapEditor.destroy();
  });

  it("escalates the selection and clears a document ending in a check list item", () => {
    const editor = createSelectAllEditor([
      { type: "paragraph", content: "First" },
      { type: "checkListItem", content: "Second" },
    ]);
    editor.setTextCursorPosition("block-0", "end");

    pressSelectAll(editor);
    expectBlockContentSelected(editor, "block-0");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    pressBackspace(editor);
    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);

    editor._tiptapEditor.destroy();
  });

  it("keeps the block type when clearing a single-block document", () => {
    const editor = createSelectAllEditor([
      { type: "checkListItem", content: "Only" },
    ]);
    editor.setTextCursorPosition("block-0", "end");

    pressSelectAll(editor);
    expectBlockContentSelected(editor, "block-0");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    // A single block can only ever have its content selected, so Backspace
    // clears the content but (correctly) leaves the block type unchanged.
    pressBackspace(editor);
    expect(editor.document).toEqual([
      expect.objectContaining({ type: "checkListItem", content: [] }),
    ]);

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
