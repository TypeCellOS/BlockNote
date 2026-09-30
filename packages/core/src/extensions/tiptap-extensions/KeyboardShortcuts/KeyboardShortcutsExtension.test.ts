import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import {
  type PartialBlock,
  defaultBlockSpecs,
} from "../../../blocks/defaultBlocks.js";
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

// The same blocks, configured with the `keyboard` settings that replace the
// deprecated `meta.hardBreakShortcut`.
const createKeyboardTestBlockSpec = <
  const T extends string,
  const C extends "inline" | "plain",
>(
  type: T,
  keyboard: {
    enter?: "split" | "into-children" | "line-break";
    shiftEnter?: "line-break" | "same-as-enter";
  },
  content: C = "inline" as C,
) =>
  createBlockSpec(
    {
      type,
      propSchema: {},
      content,
    },
    {
      keyboard,
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
    keyboardEnter: createKeyboardTestBlockSpec("keyboardEnter", {
      enter: "line-break",
    }),
    keyboardNone: createKeyboardTestBlockSpec("keyboardNone", {
      shiftEnter: "same-as-enter",
    }),
    keyboardEnterPlain: createKeyboardTestBlockSpec(
      "keyboardEnterPlain",
      { enter: "line-break" },
      "plain",
    ),
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
    | "hardBreakEnterPlain"
    | "keyboardEnter"
    | "keyboardNone"
    | "keyboardEnterPlain",
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

/**
 * Dispatches a keydown event straight to the view's handlers. Unlike
 * `pressKeys`, whose command loses the selection and stored marks the handler
 * sets, this leaves the state as a real key press does. Use it for tests that
 * check the caret or the styles of what is typed next.
 */
function keyDown(
  editor: BlockNoteEditor<any, any, any>,
  init: KeyboardEventInit,
) {
  const view = editor._tiptapEditor.view;
  view.someProp("handleKeyDown", (handler) =>
    handler(view, new KeyboardEvent("keydown", init)),
  );
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
  // The block above isn't rich text, but its last child is: the text joins
  // that child, as after any block with children.
  it("merges into the last child of a block above whose own content isn't inline", () => {
    const editor = createEditorWithBlocks(
      [
        {
          id: "code",
          type: "codeBlock",
          content: "x",
          children: [{ id: "child", type: "paragraph", content: "Child" }],
        },
        { id: "after", type: "paragraph", content: "After" },
      ],
      { id: "after", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "children": [
            {
              "text": "ChildAfter",
              "type": "paragraph",
            },
          ],
          "text": "x",
          "type": "codeBlock",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  it("does not merge rich text into a code block above", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "code", type: "codeBlock", content: "x" },
        { id: "after", type: "paragraph", content: "After" },
      ],
      { id: "after", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(outline(editor.document)).toMatchInlineSnapshot(`
      [
        {
          "text": "x",
          "type": "codeBlock",
        },
        {
          "text": "After",
          "type": "paragraph",
        },
      ]
    `);
    editor._tiptapEditor.destroy();
  });

  // #2566: the caret used to jump to the end of the top-level block above,
  // instead of the last block nested under it.
  it("in an empty block moves the caret to the end of the deepest last block above", () => {
    const editor = createEditorWithBlocks(
      [
        {
          id: "list",
          type: "bulletListItem",
          content: "One",
          children: [
            { id: "nested", type: "bulletListItem", content: "Two" },
            { id: "last", type: "bulletListItem" },
          ],
        },
        { id: "empty", type: "paragraph" },
      ],
      { id: "empty", placement: "start" },
    );

    keyDown(editor, { key: "Backspace", keyCode: 8 });

    expect(editor.getBlock("empty")).toBeUndefined();
    expect(editor.getTextCursorPosition().block.id).toBe("last");
    editor._tiptapEditor.destroy();
  });

  // #605: Backspace in an empty block below an image used to delete the image
  // too.
  it("in an empty block below a block without content deletes only the empty block", () => {
    const editor = createEditorWithBlocks(
      [
        { id: "image", type: "image" },
        { id: "empty", type: "paragraph" },
      ],
      { id: "empty", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(editor.document.map((block) => block.id)).toEqual(["image"]);
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

  // #1672: text typed after the line break used to lose the styles of the
  // text before it.
  it("keeps the styles of the text before the line break", () => {
    const editor = createEditorWithBlocks(
      [
        {
          id: "p",
          type: "paragraph",
          content: [
            { type: "text", text: "Red", styles: { textColor: "red" } },
          ],
        },
      ],
      { id: "p", placement: "end" },
    );

    keyDown(editor, { key: "Enter", keyCode: 13, shiftKey: true });
    // Typing: `insertText` takes the stored marks, as the browser input does.
    const view = editor._tiptapEditor.view;
    view.dispatch(view.state.tr.insertText("x"));

    expect(editor.getBlock("p")!.content).toEqual([
      { type: "text", text: "Red\nx", styles: { textColor: "red" } },
    ]);
    editor._tiptapEditor.destroy();
  });

  it("splits the block on Enter by default", () => {
    const editor = createEditor("paragraph");

    pressKeys(editor, "Enter");

    expect(countHardBreaks(editor)).toBe(0);
    expect(editor.document.length).toBe(2);

    editor._tiptapEditor.destroy();
  });
});

describe.each([
  {
    setting: "meta.hardBreakShortcut (deprecated)",
    enter: "hardBreakEnter",
    none: "hardBreakNone",
    plain: "hardBreakEnterPlain",
  },
  {
    setting: "keyboard",
    enter: "keyboardEnter",
    none: "keyboardNone",
    plain: "keyboardEnterPlain",
  },
] as const)(
  "hard breaks configured with $setting",
  ({ enter, none, plain }) => {
    it('inserts a hard break on Enter when hardBreakShortcut is "enter"', () => {
      const editor = createEditor(enter);

      pressKeys(editor, "Enter");

      expect(countHardBreaks(editor)).toBe(1);
      expect(editor.document.length).toBe(1);

      editor._tiptapEditor.destroy();
    });

    it('inserts a hard break on Shift-Enter when hardBreakShortcut is "enter"', () => {
      const editor = createEditor(enter);

      pressKeys(editor, "Shift-Enter");

      expect(countHardBreaks(editor)).toBe(1);
      expect(editor.document.length).toBe(1);

      editor._tiptapEditor.destroy();
    });

    it('does not insert a hard break on Shift-Enter when hardBreakShortcut is "none"', () => {
      const editor = createEditor(none);

      pressKeys(editor, "Shift-Enter");

      expect(countHardBreaks(editor)).toBe(0);

      editor._tiptapEditor.destroy();
    });

    it('splits the block on Enter when hardBreakShortcut is "none"', () => {
      const editor = createEditor(none);

      pressKeys(editor, "Enter");

      expect(countHardBreaks(editor)).toBe(0);
      expect(editor.document.length).toBe(2);

      editor._tiptapEditor.destroy();
    });

    it('inserts a newline character on Enter when content is "plain"', () => {
      const editor = createEditor(plain);

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
  },
);

describe("Delete preserves the caret before appended text", () => {
  function paragraph(id: string, children: PartialBlock[] = []): PartialBlock {
    return { id, type: "paragraph", content: id, children };
  }

  it.each([
    {
      name: "sole child",
      initialContent: [paragraph("selected", [paragraph("removed")])],
    },
    {
      name: "following shallower block",
      initialContent: [
        paragraph("parent", [paragraph("selected")]),
        paragraph("removed"),
      ],
    },
  ])("$name", ({ initialContent }) => {
    const editor = BlockNoteEditor.create({ initialContent });
    editor.mount(document.createElement("div"));
    editor.setTextCursorPosition("selected", "end");

    const view = editor.prosemirrorView;
    const event = new KeyboardEvent("keydown", {
      key: "Delete",
      code: "Delete",
      keyCode: 46,
    });
    view.someProp("handleKeyDown", (handler) => handler(view, event));

    expect(editor.getBlock("removed")).toBeUndefined();
    expect(editor.getTextCursorPosition().block.id).toBe("selected");
    expect(editor.prosemirrorState.selection.$from.parentOffset).toBe(
      "selected".length,
    );
    editor._tiptapEditor.destroy();
  });
});
