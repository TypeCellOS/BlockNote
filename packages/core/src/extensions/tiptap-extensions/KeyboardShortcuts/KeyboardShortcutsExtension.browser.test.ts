import { closeHistory } from "@tiptap/pm/history";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../../tests/src/commands/browser/setupEditor.js";
import { mergeBlocksCommand } from "../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import {
  getBlockInfoAt,
  getBlockInfoFromSelection,
} from "../../../api/getBlockInfoFromPos.js";
import { getNodeById } from "../../../api/nodeUtil.js";
import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import {
  defaultBlockSpecs,
  type Block,
  type PartialBlock,
} from "../../../blocks/defaultBlocks.js";
import type {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../../../editor/BlockNoteEditor.js";
import { fr } from "../../../i18n/locales/index.js";
import { createBlockSpec } from "../../../schema/index.js";
import { MultipleNodeSelection } from "../../SideMenu/MultipleNodeSelection.js";

// Blocks configured with the deprecated `meta.hardBreakShortcut`, which still
// sets the default of `keyboard.enter` and `keyboard.shiftEnter`.
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

// The same blocks, configured with the `experimental_keyboard` settings that
// replace the
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
      experimental_keyboard: keyboard,
      render: () => {
        const dom = document.createElement("p");
        return {
          dom,
          contentDOM: dom,
        };
      },
    },
  )();

// A block whose keyboard function leaves settings `undefined` when a prop is
// off. Those settings must keep their defaults.
const conditionalKeyboardBlock = createBlockSpec(
  {
    type: "conditionalKeyboard",
    propSchema: { on: { default: false } },
    content: "inline",
  },
  {
    experimental_keyboard: (block) => ({
      enter: block.props.on ? "into-children" : undefined,
      resetsTo: block.props.on ? { type: "heading" } : undefined,
    }),
    render: () => {
      const dom = document.createElement("p");
      return { dom, contentDOM: dom };
    },
  },
)();

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    conditionalKeyboard: conditionalKeyboardBlock,
    keyboardEnter: createKeyboardTestBlockSpec(
      "keyboardEnter",
      { enter: "line-break" },
      "inline",
    ),
    keyboardNone: createKeyboardTestBlockSpec(
      "keyboardNone",
      { shiftEnter: "same-as-enter" },
      "inline",
    ),
    keyboardEnterPlain: createKeyboardTestBlockSpec(
      "keyboardEnterPlain",
      { enter: "line-break" },
      "plain",
    ),
    hardBreakEnter: createHardBreakTestBlockSpec(
      "hardBreakEnter",
      "enter",
      "inline",
    ),
    hardBreakNone: createHardBreakTestBlockSpec(
      "hardBreakNone",
      "none",
      "inline",
    ),
    // "plain" content (`text*`) can't hold a `hardBreak` node, so these blocks
    // insert a literal newline character instead - e.g. code/math/diagram source.
    hardBreakEnterPlain: createHardBreakTestBlockSpec(
      "hardBreakEnterPlain",
      "enter",
      "plain",
    ),
  },
});

type TestBlock = PartialBlock<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

async function createEditor(
  setupEditor: SetupEditor,
  blockType:
    | "paragraph"
    | "hardBreakEnter"
    | "hardBreakNone"
    | "hardBreakEnterPlain"
    | "keyboardEnter"
    | "keyboardNone"
    | "keyboardEnterPlain",
) {
  const { editor } = await setupEditor<
    typeof schema.blockSchema,
    typeof schema.inlineContentSchema,
    typeof schema.styleSchema
  >({
    mountType: "dom",
    schema,
    initialContent: [
      {
        id: "block-0",
        type: blockType,
        content: "Hello world",
      },
    ],
  });
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

describe("KeyboardShortcutsExtension Mod-a (select all)", () => {
  // BlockNote disables TipTap's core extensions, so it has no default `Mod-a`
  // binding and select-all used to rely on the browser's native behaviour. That
  // native select-all collapses to a cursor when the editor's first element is
  // non-editable - e.g. the checkbox `<div>` of a check list item as the first
  // block - so `Mod-a` is now handled explicitly. These tests exercise the
  // keymap path (not native selection) and would collapse before the fix.
  async function createSelectAllEditor(
    setupEditor: SetupEditor,
    blocks: TestBlock[],
    selectAllBehavior?: BlockNoteEditorOptions<
      typeof schema.blockSchema,
      typeof schema.inlineContentSchema,
      typeof schema.styleSchema
    >["selectAllBehavior"],
  ) {
    const { editor } = await setupEditor<
      typeof schema.blockSchema,
      typeof schema.inlineContentSchema,
      typeof schema.styleSchema
    >({
      mountType: "dom",
      schema,
      selectAllBehavior,
      initialContent: blocks.map((block, index) => ({
        id: `block-${index}`,
        ...block,
      })),
    });
    return editor;
  }

  // Dispatches a real `Mod-a` keydown through ProseMirror's `handleKeyDown`, the
  // path browsers use to invoke the keymap. TipTap's `keyboardShortcut` command
  // doesn't reliably simulate modifier combos, and prosemirror-keymap
  // resolves `Mod` to `Ctrl` in the Linux browser runner.
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
    // Whole-document selection covers the root group's complete blocks.
    expect(selection).toBeInstanceOf(MultipleNodeSelection);
    expect(selection.from).toBe(1);
    expect(selection.to).toBe(doc.content.size - 1);
  }

  function expectBlockContentSelected(
    editor: BlockNoteEditor<any, any, any>,
    blockId: string,
  ) {
    const { selection, doc } = editor._tiptapEditor.state;
    const blockInfo = getBlockInfoAt(
      doc,
      getNodeById(blockId, doc)!.posBeforeNode,
    );
    if (!blockInfo.hasContent) {
      throw new Error(`Block ${blockId} is not a block container`);
    }
    // The current block's content is selected as a `TextSelection` spanning its
    // full content, without reaching into neighbouring blocks.
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.from).toBe(blockInfo.contentStart);
    expect(selection.to).toBe(blockInfo.contentEnd);
  }

  // Like `expectBlockContentSelected`, but for blocks whose content isn't
  // directly inline (e.g. tables), where the selection snaps inward to the
  // nearest inline positions rather than sitting exactly on the content bounds.
  function expectSelectionWithinBlock(
    editor: BlockNoteEditor<any, any, any>,
    blockId: string,
  ) {
    const { selection, doc } = editor._tiptapEditor.state;
    const blockInfo = getBlockInfoAt(
      doc,
      getNodeById(blockId, doc)!.posBeforeNode,
    );
    if (!blockInfo.hasContent) {
      throw new Error(`Block ${blockId} is not a block container`);
    }
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.empty).toBe(false);
    // The selection stays inside the block's content, without reaching into
    // neighbouring blocks.
    expect(selection.from).toBeGreaterThanOrEqual(blockInfo.contentStart);
    expect(selection.to).toBeLessThanOrEqual(blockInfo.contentEnd);
  }

  it("selects the block first when explicitly configured", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(
      setupEditor,
      [
        { type: "paragraph", content: "First" },
        { type: "paragraph", content: "Second" },
      ],
      "block-first",
    );
    editor.setTextCursorPosition("block-0", "end");

    pressSelectAll(editor);
    expectBlockContentSelected(editor, "block-0");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);
  });

  it("selects the whole document immediately when configured", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(
      setupEditor,
      [
        { type: "checkListItem", content: "First" },
        { type: "paragraph", content: "Second" },
      ],
      "document",
    );
    editor.setTextCursorPosition("block-1", "end");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    pressBackspace(editor);
    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);
  });

  // Each test walks the full Notion-style flow: the first `Mod-a` selects the
  // current block, the second expands to the whole document, and Backspace
  // clears it (issue #2973 - the bug was specific to documents starting with a
  // check list item).
  it("escalates the selection and clears a paragraph-first document", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(setupEditor, [
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
  });

  it("escalates the selection and clears a check-list-first document", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(setupEditor, [
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
  });

  it("escalates the selection and clears an all-check-list document", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(setupEditor, [
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
  });

  it("escalates the selection and clears a document ending in a check list item", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(setupEditor, [
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
  });

  it.for(["", "After"])(
    "includes a leading image when selecting all with trailing text %j (#2016)",
    async (content, { setupEditor }) => {
      const editor = await createSelectAllEditor(setupEditor, [
        { type: "image", props: { url: "https://example.com/image.png" } },
        { type: "paragraph", content },
      ]);
      editor.setTextCursorPosition("block-1", "end");

      pressSelectAll(editor);
      pressSelectAll(editor);

      const { selection, doc } = editor.prosemirrorState;
      expect(selection.content().content.eq(doc.firstChild!.content)).toBe(
        true,
      );
    },
  );

  it("clears the whole block after select-all expands in a single-block document", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(setupEditor, [
      { type: "checkListItem", content: "Only" },
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
  });

  it("escalates the selection and clears a document containing a table", async ({
    setupEditor,
  }) => {
    const editor = await createSelectAllEditor(setupEditor, [
      { type: "paragraph", content: "Before" },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1"] }, { cells: ["A2", "B2"] }],
        },
      },
      { type: "paragraph", content: "After" },
    ]);
    editor.setTextCursorPosition("block-1", "start");

    // A table's content node isn't directly inline, so the first `Mod-a` selects
    // across its cells rather than producing an invalid whole-block selection.
    pressSelectAll(editor);
    expectSelectionWithinBlock(editor, "block-1");

    pressSelectAll(editor);
    expectWholeDocSelected(editor);

    pressBackspace(editor);
    expect(editor.document).toEqual([
      expect.objectContaining({ type: "paragraph", content: [] }),
    ]);
  });
});

/**
 * Characterization tests for the Backspace/Delete/Enter/Tab handlers: they pin
 * the current document transformations so the BlockInfo migration inside the
 * handlers is provably behavior-preserving.
 */
async function createEditorWithBlocks(
  setupEditor: SetupEditor,
  initialContent: any[],
  cursor: { id: string; placement: "start" | "end" },
) {
  const { editor } = await setupEditor({
    mountType: "dom",
    schema,
    initialContent,
  });
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
  // The block above isn't rich text, but its last child is: the text joins
  // that child, as after any block with children.
  it("merges into the last child of a block above whose own content isn't inline", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });

  it("does not merge rich text into a code block above", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });

  // #2566: the caret used to jump to the end of the top-level block above,
  // instead of the last block nested under it.
  it("in an empty block moves the caret to the end of the deepest last block above", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });

  // #605: Backspace in an empty block below an image used to delete the image
  // too.
  it("in an empty block below a block without content deletes only the empty block", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
      [
        { id: "image", type: "image" },
        { id: "empty", type: "paragraph" },
      ],
      { id: "empty", placement: "start" },
    );

    pressKeys(editor, "Backspace");

    expect(editor.document.map((block) => block.id)).toEqual(["image"]);
  });
  it("keeps the default of a keyboard setting given as undefined", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
      [{ id: "a", type: "conditionalKeyboard", content: "Text" }],
      { id: "a", placement: "start" },
    );

    // `resetsTo` is undefined for this block, so the default applies.
    pressKeys(editor, "Backspace");

    expect(editor.getBlock("a")!.type).toBe("paragraph");
  });
});

describe("KeyboardShortcutsExtension Delete", () => {
  it("merges the next block in at block end", async ({ setupEditor }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });

  it("merges a next block that has children, un-nesting them", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });

  it("removes an empty next block, adopting its children", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });

  it("removes an empty current block on Delete", async ({ setupEditor }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });
});

describe("KeyboardShortcutsExtension Enter", () => {
  it("lifts an empty nested block on Enter", async ({ setupEditor }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });
});

describe("KeyboardShortcutsExtension Shift-Tab", () => {
  it("un-nests a nested block", async ({ setupEditor }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });
});

// #2812: Tab indentation must announce the resulting level to screen readers.
describe("KeyboardShortcutsExtension Tab announcements", () => {
  const initialContent: PartialBlock[] = [
    { id: "a", type: "paragraph", content: "Parent" },
    { id: "b", type: "paragraph", content: "Child" },
  ];

  function liveRegion(editor: BlockNoteEditor) {
    return editor.domElement?.parentElement?.querySelector("[aria-live]");
  }

  function pressTab(editor: BlockNoteEditor, shiftKey = false) {
    const view = editor.prosemirrorView;
    view.someProp("handleKeyDown", (handler) =>
      handler(
        view,
        new KeyboardEvent("keydown", { key: "Tab", code: "Tab", shiftKey }),
      ),
    );
  }

  function ids(blocks: Block[]) {
    return blocks.map((block) => block.id);
  }

  it("renders a polite live region outside the contenteditable", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom", initialContent });
    const region = liveRegion(editor);

    expect(region).not.toBeNull();
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.getAttribute("role")).toBe("status");
    expect(editor.domElement?.contains(region ?? null)).toBe(false);
    expect(region?.textContent).toBe("");
  });

  it("announces the new level on Tab and Shift-Tab", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom", initialContent });
    editor.setTextCursorPosition("b", "start");

    pressTab(editor);
    expect(ids(editor.document[0].children)).toEqual(["b"]);
    expect(liveRegion(editor)?.textContent).toBe("Indented, level 2");

    pressTab(editor, true);
    expect(ids(editor.document)).toEqual(["a", "b"]);
    expect(liveRegion(editor)?.textContent).toBe("Outdented, level 1");
  });

  it.for([false, true])(
    "does not announce a rejected nesting change (shift: %s)",
    async (shift, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: "dom",
        initialContent,
      });
      editor.setTextCursorPosition("b", "start");
      if (shift) {
        editor.nestBlock();
      }
      const before = editor.transact((tr) => tr.doc);
      let rejected = false;
      editor.onBeforeChange(() => {
        rejected = true;
        return false;
      });

      pressTab(editor, shift);

      expect(rejected).toBe(true);
      expect(editor.transact((tr) => tr.doc)).toBe(before);
      expect(liveRegion(editor)?.textContent).toBe("");
    },
  );

  it("announces the moved blocks' level for a whole-block selection", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [
        ...initialContent,
        { id: "c", type: "paragraph", content: "Second child" },
      ],
    });
    editor.transact((tr) => {
      const first = getNodeById("b", tr.doc)!;
      const last = getNodeById("c", tr.doc)!;
      tr.setSelection(
        MultipleNodeSelection.create(
          tr.doc,
          first.posBeforeNode,
          last.posBeforeNode + last.node.nodeSize,
        ),
      );
    });

    pressTab(editor);
    expect(ids(editor.document[0].children)).toEqual(["b", "c"]);
    expect(liveRegion(editor)?.textContent).toBe("Indented, level 2");

    pressTab(editor, true);
    expect(ids(editor.document)).toEqual(["a", "b", "c"]);
    expect(liveRegion(editor)?.textContent).toBe("Outdented, level 1");
  });

  it("announces nothing when the block can't be indented", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom", initialContent });
    editor.setTextCursorPosition("a", "start");

    pressTab(editor);
    pressTab(editor, true);

    expect(ids(editor.document)).toEqual(["a", "b"]);
    expect(liveRegion(editor)?.textContent).toBe("");
  });

  it("announces deeper levels", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [
        {
          ...initialContent[0],
          children: [
            initialContent[1],
            { id: "c", type: "paragraph", content: "Grandchild" },
          ],
        },
      ],
    });
    editor.setTextCursorPosition("c", "start");

    pressTab(editor);

    expect(ids(editor.document[0].children[0].children)).toEqual(["c"]);
    expect(liveRegion(editor)?.textContent).toBe("Indented, level 3");
  });

  it("uses the editor's dictionary", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent,
      dictionary: fr,
    });
    editor.setTextCursorPosition("b", "start");

    pressTab(editor);

    expect(liveRegion(editor)?.textContent).toBe("Retrait augmenté, niveau 2");
  });

  it("removes the live region when the editor unmounts", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom", initialContent });
    const host = editor.domElement?.parentElement;
    expect(host?.querySelector("[aria-live]")).toBeTruthy();

    editor.unmount();

    expect(host?.querySelector("[aria-live]")).toBeNull();
  });
});

describe("KeyboardShortcutsExtension line breaks", () => {
  it("inserts a hard break on Shift-Enter by default", async ({
    setupEditor,
  }) => {
    const editor = await createEditor(setupEditor, "paragraph");

    pressKeys(editor, "Shift-Enter");

    expect(countHardBreaks(editor)).toBe(1);
    expect(editor.document.length).toBe(1);
  });

  // #1672: text typed after the line break used to lose the styles of the
  // text before it.
  it("keeps the styles of the text before the line break", async ({
    setupEditor,
  }) => {
    const editor = await createEditorWithBlocks(
      setupEditor,
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
  });

  it("splits the block on Enter by default", async ({ setupEditor }) => {
    const editor = await createEditor(setupEditor, "paragraph");

    pressKeys(editor, "Enter");

    expect(countHardBreaks(editor)).toBe(0);
    expect(editor.document.length).toBe(2);
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
    it("inserts a hard break on Enter when Enter makes line breaks", async ({
      setupEditor,
    }) => {
      const editor = await createEditor(setupEditor, enter);

      pressKeys(editor, "Enter");

      expect(countHardBreaks(editor)).toBe(1);
      expect(editor.document.length).toBe(1);
    });

    it("inserts a hard break on Shift-Enter when Enter makes line breaks", async ({
      setupEditor,
    }) => {
      const editor = await createEditor(setupEditor, enter);

      pressKeys(editor, "Shift-Enter");

      expect(countHardBreaks(editor)).toBe(1);
      expect(editor.document.length).toBe(1);
    });

    it("does not insert a hard break on Shift-Enter when it acts as Enter", async ({
      setupEditor,
    }) => {
      const editor = await createEditor(setupEditor, none);

      pressKeys(editor, "Shift-Enter");

      expect(countHardBreaks(editor)).toBe(0);
    });

    it("splits the block on Enter when Shift-Enter acts as Enter", async ({
      setupEditor,
    }) => {
      const editor = await createEditor(setupEditor, none);

      pressKeys(editor, "Enter");

      expect(countHardBreaks(editor)).toBe(0);
      expect(editor.document.length).toBe(2);
    });

    it('inserts a newline character on Enter when content is "plain"', async ({
      setupEditor,
    }) => {
      const editor = await createEditor(setupEditor, plain);

      pressKeys(editor, "Enter");

      // A "plain" block can't hold a `hardBreak` node, so no node is inserted and
      // the block is not split - a literal newline is added to its text instead.
      expect(countHardBreaks(editor)).toBe(0);
      expect(editor.document.length).toBe(1);
      expect(getTextContent(editor)).toBe("Hello world\n");
    });

    it('inserts a newline character on Shift-Enter when content is "plain"', async ({
      setupEditor,
    }) => {
      const editor = await createEditor(setupEditor, plain);

      pressKeys(editor, "Shift-Enter");

      expect(countHardBreaks(editor)).toBe(0);
      expect(editor.document.length).toBe(1);
      expect(getTextContent(editor)).toBe("Hello world\n");
    });
  },
);

describe("Delete preserves the caret before appended text", () => {
  function paragraph(id: string, children: PartialBlock[] = []): PartialBlock {
    return { id, type: "paragraph", content: id, children };
  }

  it.for([
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
  ])("$name", async ({ initialContent }, { setupEditor }) => {
    const { editor } = await setupEditor({ mountType: "dom", initialContent });
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
  });
});

describe("KeyboardShortcutsExtension Backspace", () => {
  async function createEditor(
    setupEditor: SetupEditor,
    content: string,
    type:
      | "paragraph"
      | "bulletListItem"
      | "numberedListItem"
      | "checkListItem" = "paragraph",
  ) {
    const { editor: instance } = await setupEditor({
      mountType: "dom",
      trailingBlock: false,
      initialContent: [
        {
          id: "parent",
          content: "Parent",
          children: [
            { id: "before", content: "Before" },
            { id: "current", type, content },
            { id: "after", content: "After" },
          ],
        },
      ],
    });
    instance.setTextCursorPosition("current", "start");
    return instance;
  }

  function pressKey(
    instance: BlockNoteEditor,
    key: "Backspace" | "Shift-Tab" | "Delete",
  ) {
    const event = new KeyboardEvent("keydown", {
      key: key === "Shift-Tab" ? "Tab" : key,
      shiftKey: key === "Shift-Tab",
      bubbles: true,
      cancelable: true,
    });
    const view = instance.prosemirrorView;
    view.someProp("handleKeyDown", (handler) => handler(view, event));
  }

  function expectUnindented(instance: BlockNoteEditor) {
    expect(instance.document.map((block) => block.id)).toEqual([
      "parent",
      "current",
    ]);
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["before"]);
    expect(
      instance.getBlock("current")?.children.map((block) => block.id),
    ).toEqual(["after"]);
  }

  describe.each(["", "Current"])("Backspace with content %j", (content) => {
    it("merges without changing following siblings' nesting", async ({
      setupEditor,
    }) => {
      const instance = await createEditor(setupEditor, content);
      pressKey(instance, "Backspace");

      expect(instance.document.map((block) => block.id)).toEqual(["parent"]);
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["before", "after"]);
      expect(instance.getBlock("current")).toBeUndefined();
      expect(instance.getBlock("before")?.content).toEqual([
        { type: "text", text: `Before${content}`, styles: {} },
      ]);
      expect(instance.getTextCursorPosition().block.id).toBe("before");
    });
  });

  it("still unindents with Shift-Tab", async ({ setupEditor }) => {
    const instance = await createEditor(setupEditor, "Current");
    pressKey(instance, "Shift-Tab");
    expectUnindented(instance);
  });

  it.for(["bulletListItem", "numberedListItem", "checkListItem"] as const)(
    "converts %s to a paragraph before merging",
    async (type, { setupEditor }) => {
      const instance = await createEditor(setupEditor, "Current", type);
      pressKey(instance, "Backspace");
      expect(instance.getBlock("current")?.type).toBe("paragraph");
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["before", "current", "after"]);
      pressKey(instance, "Backspace");
      expect(instance.getBlock("current")).toBeUndefined();
      expect(instance.getBlock("before")?.content).toEqual([
        { type: "text", text: "BeforeCurrent", styles: {} },
      ]);
    },
  );

  it("does not merge when the cursor is inside the block", async ({
    setupEditor,
  }) => {
    const instance = await createEditor(setupEditor, "Current");
    instance.setTextCursorPosition("current", "end");
    // The shortcut must leave normal character deletion to the browser.
    pressKey(instance, "Backspace");
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["before", "current", "after"]);
    expect(instance.getBlock("current")?.content).toEqual([
      { type: "text", text: "Current", styles: {} },
    ]);
  });

  async function createScenario(
    setupEditor: SetupEditor,
    initialContent: PartialBlock[],
  ) {
    const instance = await createEditor(setupEditor, "");
    instance.replaceBlocks(instance.document, initialContent);
    instance.setTextCursorPosition("current", "start");
    return instance;
  }

  describe.each(["paragraph", "image", "table"] as const)(
    "first child of %s",
    (type) => {
      it.for([false, true])(
        "deletes an empty first child (only child: %s)",
        async (onlyChild, { setupEditor }) => {
          const instance = await createScenario(setupEditor, [
            {
              id: "parent",
              ...parentSpec(type),
              children: [
                { id: "current", content: "" },
                ...(onlyChild ? [] : [{ id: "after", content: "After" }]),
              ],
            },
          ]);
          pressKey(instance, "Backspace");
          expect(instance.getBlock("current")).toBeUndefined();
          expect(
            instance.getBlock("parent")?.children.map((block) => block.id),
          ).toEqual(onlyChild ? [] : ["after"]);
          expect(instance.getBlock("parent")?.type).toBe(type);
          expectSelectionAtEnd(instance, "parent", type);
          instance.prosemirrorView.state.doc.check();
        },
      );

      it("preserves descendants when removing an empty first child", async ({
        setupEditor,
      }) => {
        const instance = await createScenario(setupEditor, [
          {
            id: "parent",
            ...parentSpec(type),
            children: [
              {
                id: "current",
                children: [{ id: "grandchild", content: "Keep me" }],
              },
              { id: "after", content: "After" },
            ],
          },
        ]);
        pressKey(instance, "Backspace");
        expect(instance.getBlock("current")).toBeUndefined();
        expect(
          instance.getBlock("parent")?.children.map((block) => block.id),
        ).toEqual(["grandchild", "after"]);
        expect(instance.getBlock("grandchild")?.content).toEqual([
          { type: "text", text: "Keep me", styles: {} },
        ]);
        instance.prosemirrorView.state.doc.check();
        expectSelectionAtEnd(instance, "parent", type);
      });
    },
  );

  it("merges into a paragraph nested under a non-text previous sibling", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        content: "Parent",
        children: [
          {
            id: "image",
            type: "image",
            children: [{ id: "target", content: "Target" }],
          },
          { id: "current", content: "Current" },
          { id: "after", content: "After" },
        ],
      },
    ]);
    pressKey(instance, "Backspace");
    expect(instance.getBlock("current")).toBeUndefined();
    expect(instance.getBlock("target")?.content).toEqual([
      { type: "text", text: "TargetCurrent", styles: {} },
    ]);
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["image", "after"]);
  });

  it("keeps the only root block", async ({ setupEditor }) => {
    const instance = await createScenario(setupEditor, [
      { id: "current", content: "" },
    ]);
    pressKey(instance, "Backspace");
    expect(instance.document.map((block) => block.id)).toEqual(["current"]);
  });

  it.for(["", "Parent"])(
    "merges the first child's text into parent %j",
    async (content, { setupEditor }) => {
      const instance = await createScenario(setupEditor, [
        {
          id: "parent",
          content,
          children: [
            {
              id: "current",
              content: "Current",
              children: [{ id: "grandchild", content: "Keep" }],
            },
            { id: "after", content: "After" },
          ],
        },
      ]);
      pressKey(instance, "Backspace");
      expect(instance.getBlock("current")).toBeUndefined();
      expect(instance.getBlock("parent")?.content).toEqual([
        { type: "text", text: `${content}Current`, styles: {} },
      ]);
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["grandchild", "after"]);
      expect(instance.getTextCursorPosition().block.id).toBe("parent");
      expect(instance.prosemirrorView.state.selection.$from.parentOffset).toBe(
        content.length,
      );
    },
  );

  it("unindents nonempty first children of non-text parents without losing text", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        type: "image",
        children: [{ id: "current", content: "Keep" }],
      },
    ]);
    pressKey(instance, "Backspace");
    expect(instance.document.map((block) => block.id)).toEqual([
      "parent",
      "current",
    ]);
    expect(instance.getBlock("current")?.content).toEqual([
      { type: "text", text: "Keep", styles: {} },
    ]);
  });

  it.for(["", "Current"])(
    "handles an empty previous sibling with current text %j",
    async (content, { setupEditor }) => {
      const instance = await createScenario(setupEditor, [
        {
          id: "parent",
          content: "Parent",
          children: [
            { id: "before", content: "", props: { textAlignment: "right" } },
            { id: "current", content },
            { id: "after", content: "After" },
          ],
        },
      ]);
      pressKey(instance, "Backspace");
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["before", "after"]);
      instance.prosemirrorView.state.doc.check();
      expect(instance.getTextCursorPosition().block.id).toBe("before");
      expect(instance.getBlock("before")?.props).toMatchObject({
        textAlignment: "right",
      });
      expect(instance.getBlock("before")?.content).toEqual(
        content ? [{ type: "text", text: content, styles: {} }] : [],
      );
      expect(instance.prosemirrorView.state.selection.$from.parentOffset).toBe(
        0,
      );
    },
  );

  it("unindents nonempty blocks after a table when merging is impossible", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        content: "Parent",
        children: [
          {
            id: "table",
            type: "table",
            content: { type: "tableContent", rows: [{ cells: ["Cell"] }] },
          },
          { id: "current", content: "Keep" },
        ],
      },
    ]);
    pressKey(instance, "Backspace");
    expect(instance.document.map((block) => block.id)).toEqual([
      "parent",
      "current",
    ]);
    expect(instance.getBlock("table")?.type).toBe("table");
    expect(instance.getBlock("current")?.content).toEqual([
      { type: "text", text: "Keep", styles: {} },
    ]);
  });

  it.for(["image", "table"] as const)(
    "deletes empty blocks after %s while preserving descendants",
    async (type, { setupEditor }) => {
      const previous: PartialBlock =
        type === "table"
          ? {
              id: "previous",
              type,
              content: { type: "tableContent", rows: [{ cells: ["Cell"] }] },
            }
          : { id: "previous", type };
      const instance = await createScenario(setupEditor, [
        {
          id: "parent",
          content: "Parent",
          children: [
            previous,
            {
              id: "current",
              children: [{ id: "grandchild", content: "Keep" }],
            },
            { id: "after", content: "After" },
          ],
        },
      ]);
      pressKey(instance, "Backspace");
      expect(instance.getBlock("current")).toBeUndefined();
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["previous", "grandchild", "after"]);
      expectSelectionAtEnd(instance, "previous", type);
      expect(instance.getBlock("grandchild")?.content).toEqual([
        { type: "text", text: "Keep", styles: {} },
      ]);
      instance.prosemirrorView.state.doc.check();
    },
  );

  it("merges a deeply nested only child and can undo the operation", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "root",
        content: "Root",
        children: [
          {
            id: "parent",
            content: "Parent",
            children: [{ id: "current", content: "Current" }],
          },
        ],
      },
    ]);
    const before = instance.document;
    instance.prosemirrorView.dispatch(
      closeHistory(instance.prosemirrorView.state.tr),
    );
    pressKey(instance, "Backspace");
    expect(instance.getBlock("current")).toBeUndefined();
    expect(instance.getBlock("parent")?.children).toEqual([]);
    expect(instance.getBlock("parent")?.content).toEqual([
      { type: "text", text: "ParentCurrent", styles: {} },
    ]);
    expect(instance.prosemirrorView.state.selection.$from.parentOffset).toBe(6);
    instance.undo();
    expect(instance.document).toEqual(before);
  });

  it.for(["", "Current"])(
    "the merge command handles a first child with text %j directly",
    async (content, { setupEditor }) => {
      const instance = await createScenario(setupEditor, [
        {
          id: "parent",
          content: "Parent",
          children: [
            { id: "current", content },
            { id: "after", content: "After" },
          ],
        },
      ]);
      const pos = getBlockInfoFromSelection(instance.prosemirrorView.state)
        .block.beforePos;
      const command = mergeBlocksCommand(pos);
      const before = instance.document;
      expect(instance._tiptapEditor.can().command(command)).toBe(true);
      expect(instance.document).toEqual(before);
      expect(instance._tiptapEditor.commands.command(command)).toBe(true);
      expect(instance.getBlock("current")).toBeUndefined();
      expect(instance.getBlock("parent")?.content).toEqual([
        { type: "text", text: `Parent${content}`, styles: {} },
      ]);
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["after"]);
    },
  );

  it("the merge command rejects incompatible parents without mutating", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        type: "image",
        children: [{ id: "current", content: "Keep" }],
      },
    ]);
    const pos = getBlockInfoFromSelection(instance.prosemirrorView.state).block
      .beforePos;
    const before = instance.document;
    expect(
      instance._tiptapEditor.commands.command(mergeBlocksCommand(pos)),
    ).toBe(false);
    expect(instance.document).toEqual(before);
  });

  it.for(["image", "table"] as const)(
    "the merge command rejects %s on either side and as a parent",
    async (type, { setupEditor }) => {
      const nonText: PartialBlock =
        type === "image"
          ? { id: "non-text", type }
          : {
              id: "non-text",
              type,
              content: { type: "tableContent", rows: [{ cells: ["Cell"] }] },
            };
      const instance = await createScenario(setupEditor, [
        { id: "current", content: "" },
      ]);
      for (const content of ["", "Text"]) {
        for (const blocks of [
          [nonText, { id: "current", content }],
          [
            { id: "text", content },
            { ...nonText, id: "current" },
          ],
          [{ ...nonText, children: [{ id: "current", content }] }],
        ]) {
          instance.replaceBlocks(instance.document, blocks);
          const pos = instance.prosemirrorView.state.doc;
          let beforePos: number | undefined;
          pos.descendants((node, position) => {
            if (node.attrs.id === "current") {
              beforePos = position;
            }
          });
          if (beforePos === undefined) {
            throw new Error("Missing test block");
          }
          const before = instance.document;
          const command = mergeBlocksCommand(beforePos);
          expect(instance._tiptapEditor.can().command(command)).toBe(false);
          expect(instance._tiptapEditor.commands.command(command)).toBe(false);
          expect(instance.document).toEqual(before);
        }
      }
    },
  );

  function expectSelectionAtEnd(
    instance: BlockNoteEditor,
    id: string,
    type: "paragraph" | "image" | "table",
  ) {
    expect(instance.getTextCursorPosition().block.id).toBe(id);
    const selection = instance.prosemirrorView.state.selection;
    if (type === "image") {
      expect(selection).toBeInstanceOf(NodeSelection);
    } else {
      expect(selection).toBeInstanceOf(TextSelection);
      expect(selection.empty).toBe(true);
      expect(selection.$from.parentOffset).toBe(
        selection.$from.parent.content.size,
      );
      if (type === "table") {
        expect(["Cell", "Last"]).toContain(selection.$from.parent.textContent);
        expect(
          selection.$from.node(selection.$from.depth - 1).type.name,
        ).toMatch(/table.*Cell/i);
      }
    }
  }

  it("replaces a preceding image with a nonempty paragraph and keeps its descendants", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        content: "Parent",
        children: [
          { id: "image", type: "image" },
          {
            id: "current",
            content: "Keep",
            children: [{ id: "child", content: "Child" }],
          },
          { id: "after", content: "After" },
        ],
      },
    ]);
    const current = instance.getBlock("current");
    pressKey(instance, "Backspace");
    expect(instance.getBlock("image")).toBeUndefined();
    expect(instance.getBlock("current")).toEqual(current);
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["current", "after"]);
    expect(instance.getTextCursorPosition().block.id).toBe("current");
    expect(instance.prosemirrorView.state.selection.$from.parentOffset).toBe(0);
  });

  it("deletes selected text before attempting to merge or unindent", async ({
    setupEditor,
  }) => {
    const instance = await createEditor(setupEditor, "Current");
    const start = instance.prosemirrorView.state.selection.from;
    instance.prosemirrorView.dispatch(
      instance.prosemirrorView.state.tr.setSelection(
        TextSelection.create(
          instance.prosemirrorView.state.doc,
          start,
          start + 3,
        ),
      ),
    );
    pressKey(instance, "Backspace");
    expect(instance.getBlock("current")?.content).toEqual([
      { type: "text", text: "rent", styles: {} },
    ]);
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["before", "current", "after"]);
  });

  it("Delete still merges forward", async ({ setupEditor }) => {
    const instance = await createEditor(setupEditor, "Current");
    instance.setTextCursorPosition("before", "end");
    pressKey(instance, "Delete");
    expect(instance.getBlock("current")).toBeUndefined();
    expect(instance.getBlock("before")?.content).toEqual([
      { type: "text", text: "BeforeCurrent", styles: {} },
    ]);
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["before", "after"]);
  });

  it.for(["image", "table"] as const)(
    "promotes descendants of an empty only child under %s and supports undo",
    async (type, { setupEditor }) => {
      const instance = await createScenario(setupEditor, [
        {
          id: "parent",
          ...parentSpec(type),
          children: [
            {
              id: "current",
              children: [
                {
                  id: "child",
                  content: "Keep",
                  children: [{ id: "grandchild", content: "Deep" }],
                },
              ],
            },
          ],
        },
      ]);
      const before = instance.document;
      const child = instance.getBlock("child");
      instance.prosemirrorView.dispatch(
        closeHistory(instance.prosemirrorView.state.tr),
      );
      pressKey(instance, "Backspace");
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["child"]);
      expect(instance.getBlock("child")).toEqual(child);
      expectSelectionAtEnd(instance, "parent", type);
      instance.prosemirrorView.state.doc.check();
      instance.undo();
      expect(instance.document).toEqual(before);
    },
  );

  function parentSpec(type: "paragraph" | "image" | "table"): PartialBlock {
    if (type === "table") {
      return {
        type,
        content: { type: "tableContent", rows: [{ cells: ["First", "Last"] }] },
      };
    }
    return { type };
  }

  it("selects the last cell of a deeply nested preceding table", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        content: "Parent",
        children: [
          {
            id: "before",
            content: "Before",
            children: [
              {
                id: "table",
                type: "table",
                content: {
                  type: "tableContent",
                  rows: [{ cells: ["A", "B"] }, { cells: ["C", "Last"] }],
                },
              },
            ],
          },
          { id: "current" },
          { id: "after", content: "After" },
        ],
      },
    ]);
    pressKey(instance, "Backspace");
    expect(instance.getBlock("current")).toBeUndefined();
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["before", "after"]);
    expectSelectionAtEnd(instance, "table", "table");
  });

  it("preserves inline styles and target properties when merging into the parent", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        props: { textAlignment: "right" },
        content: [{ type: "text", text: "Parent", styles: { bold: true } }],
        children: [
          {
            id: "current",
            props: { textAlignment: "center" },
            content: [
              { type: "text", text: "Child", styles: { italic: true } },
            ],
          },
        ],
      },
    ]);
    pressKey(instance, "Backspace");
    expect(instance.getBlock("parent")?.props).toMatchObject({
      textAlignment: "right",
    });
    expect(instance.getBlock("parent")?.content).toEqual([
      { type: "text", text: "Parent", styles: { bold: true } },
      { type: "text", text: "Child", styles: { italic: true } },
    ]);
    expect(instance.getBlock("current")).toBeUndefined();
  });

  it.for([false, true])(
    "matches PR examples 2 and 4 (previous block has children: %s)",
    async (nestedTarget, { setupEditor }) => {
      const instance = await createScenario(setupEditor, [
        {
          id: "parent",
          content: "Parent",
          children: nestedTarget ? [{ id: "target", content: "Target" }] : [],
        },
        {
          id: "current",
          content: "Current",
          children: [{ id: "child", content: "Child" }],
        },
      ]);
      pressKey(instance, "Backspace");
      expect(instance.document.map((block) => block.id)).toEqual([
        "parent",
        "child",
      ]);
      const target = nestedTarget ? "target" : "parent";
      expect(instance.getBlock(target)?.content).toEqual([
        {
          type: "text",
          text: `${nestedTarget ? "Target" : "Parent"}Current`,
          styles: {},
        },
      ]);
      expect(instance.getTextCursorPosition().block.id).toBe(target);
      expect(instance.prosemirrorView.state.selection.$from.parentOffset).toBe(
        6,
      );
      expect(instance.getBlock("child")?.content).toEqual([
        { type: "text", text: "Child", styles: {} },
      ]);
    },
  );

  it("deletes a selected nested image", async ({ setupEditor }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        content: "Parent",
        children: [
          { id: "current", type: "image" },
          { id: "after", content: "After" },
        ],
      },
    ]);
    const info = getBlockInfoFromSelection(instance.prosemirrorView.state);
    if (!info.hasContent) {
      throw new Error("Expected image block");
    }
    instance.prosemirrorView.dispatch(
      instance.prosemirrorView.state.tr.setSelection(
        NodeSelection.create(
          instance.prosemirrorView.state.doc,
          info.content.beforePos,
        ),
      ),
    );
    pressKey(instance, "Backspace");
    expect(instance.getBlock("current")).toBeUndefined();
    expect(
      instance.getBlock("parent")?.children.map((block) => block.id),
    ).toEqual(["after"]);
  });

  it("does nothing at the start of a nested table cell", async ({
    setupEditor,
  }) => {
    const instance = await createScenario(setupEditor, [
      {
        id: "parent",
        content: "Parent",
        children: [
          { id: "current", ...parentSpec("table") },
          { id: "after", content: "After" },
        ],
      },
    ]);
    let pos: number | undefined;
    instance.prosemirrorView.state.doc.descendants((node, nodePos) => {
      if (node.isText && node.text === "First") {
        pos = nodePos;
      }
    });
    if (pos === undefined) {
      throw new Error("Expected table cell text");
    }
    instance.prosemirrorView.dispatch(
      instance.prosemirrorView.state.tr.setSelection(
        TextSelection.create(instance.prosemirrorView.state.doc, pos),
      ),
    );
    const before = instance.document;
    pressKey(instance, "Backspace");
    expect(instance.document).toEqual(before);
    expect(instance.prosemirrorView.state.selection.from).toBe(pos);
  });
});
