/**
 * @vitest-environment jsdom
 */

import { closeHistory } from "@tiptap/pm/history";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { mergeBlocksCommand } from "../../../api/blockManipulation/commands/mergeBlocks/mergeBlocks.js";
import { getBlockInfoFromSelection } from "../../../api/getBlockInfoFromPos.js";
import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import {
  defaultBlockSpecs,
  PartialBlock,
} from "../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../../schema/index.js";

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

describe("KeyboardShortcutsExtension backspaceBehavior", () => {
  let editor: BlockNoteEditor | undefined;

  afterEach(() => {
    editor?._tiptapEditor.destroy();
    editor = undefined;
  });

  function createEditor(
    backspaceBehavior: "unindent" | "merge" | undefined,
    content: string,
    type:
      | "paragraph"
      | "bulletListItem"
      | "numberedListItem"
      | "checkListItem" = "paragraph",
  ) {
    const instance = BlockNoteEditor.create({
      backspaceBehavior,
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
    editor = instance;
    instance.mount(document.createElement("div"));
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
    it.each([undefined, "unindent"] as const)(
      "unindents with backspaceBehavior=%s",
      (behavior) => {
        const instance = createEditor(behavior, content);
        pressKey(instance, "Backspace");
        expectUnindented(instance);
        expect(instance.getBlock("current")?.content).toEqual(
          content ? [{ type: "text", text: content, styles: {} }] : [],
        );
      },
    );

    it("merges without changing following siblings' nesting", () => {
      const instance = createEditor("merge", content);
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

  it("still unindents with Shift-Tab in merge mode", () => {
    const instance = createEditor("merge", "Current");
    pressKey(instance, "Shift-Tab");
    expectUnindented(instance);
  });

  it.each(["bulletListItem", "numberedListItem", "checkListItem"] as const)(
    "converts %s to a paragraph before merging",
    (type) => {
      const instance = createEditor("merge", "Current", type);
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

  it("does not merge when the cursor is inside the block", () => {
    const instance = createEditor("merge", "Current");
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

  function createScenario(initialContent: PartialBlock[]) {
    const instance = createEditor("merge", "");
    instance.replaceBlocks(instance.document, initialContent);
    instance.setTextCursorPosition("current", "start");
    return instance;
  }

  describe.each(["paragraph", "image", "table"] as const)(
    "first child of %s",
    (type) => {
      it.each([false, true])(
        "deletes an empty first child (only child: %s)",
        (onlyChild) => {
          const instance = createScenario([
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

      it("preserves descendants when removing an empty first child", () => {
        const instance = createScenario([
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

  it("merges into a paragraph nested under a non-text previous sibling", () => {
    const instance = createScenario([
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

  it("keeps the only root block", () => {
    const instance = createScenario([{ id: "current", content: "" }]);
    pressKey(instance, "Backspace");
    expect(instance.document.map((block) => block.id)).toEqual(["current"]);
  });

  it.each(["", "Parent"])(
    "merges the first child's text into parent %j",
    (content) => {
      const instance = createScenario([
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

  it("unindents nonempty first children of non-text parents without losing text", () => {
    const instance = createScenario([
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

  it.each(["", "Current"])(
    "handles an empty previous sibling with current text %j",
    (content) => {
      const instance = createScenario([
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

  it("unindents nonempty blocks after a table when merging is impossible", () => {
    const instance = createScenario([
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

  it.each(["image", "table"] as const)(
    "deletes empty blocks after %s while preserving descendants",
    (type) => {
      const previous: PartialBlock =
        type === "table"
          ? {
              id: "previous",
              type,
              content: { type: "tableContent", rows: [{ cells: ["Cell"] }] },
            }
          : { id: "previous", type };
      const instance = createScenario([
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

  it("merges a deeply nested only child and can undo the operation", () => {
    const instance = createScenario([
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

  it.each(["", "Current"])(
    "the merge command handles a first child with text %j directly",
    (content) => {
      const instance = createScenario([
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
        .bnBlock.beforePos;
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

  it("the merge command rejects incompatible parents without mutating", () => {
    const instance = createScenario([
      {
        id: "parent",
        type: "image",
        children: [{ id: "current", content: "Keep" }],
      },
    ]);
    const pos = getBlockInfoFromSelection(instance.prosemirrorView.state)
      .bnBlock.beforePos;
    const before = instance.document;
    expect(
      instance._tiptapEditor.commands.command(mergeBlocksCommand(pos)),
    ).toBe(false);
    expect(instance.document).toEqual(before);
  });

  it.each(["image", "table"] as const)(
    "the merge command rejects %s on either side and as a parent",
    (type) => {
      const nonText: PartialBlock =
        type === "image"
          ? { id: "non-text", type }
          : {
              id: "non-text",
              type,
              content: { type: "tableContent", rows: [{ cells: ["Cell"] }] },
            };
      const instance = createScenario([{ id: "current", content: "" }]);
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

  it("replaces a preceding image with a nonempty paragraph and keeps its descendants", () => {
    const instance = createScenario([
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

  it("deletes selected text before attempting to merge or unindent", () => {
    const instance = createEditor("merge", "Current");
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

  it.each(["unindent", "merge"] as const)(
    "Delete still merges forward with backspaceBehavior=%s",
    (behavior) => {
      const instance = createEditor(behavior, "Current");
      instance.setTextCursorPosition("before", "end");
      pressKey(instance, "Delete");
      expect(instance.getBlock("current")).toBeUndefined();
      expect(instance.getBlock("before")?.content).toEqual([
        { type: "text", text: "BeforeCurrent", styles: {} },
      ]);
      expect(
        instance.getBlock("parent")?.children.map((block) => block.id),
      ).toEqual(["before", "after"]);
    },
  );

  it.each(["image", "table"] as const)(
    "promotes descendants of an empty only child under %s and supports undo",
    (type) => {
      const instance = createScenario([
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

  it("selects the last cell of a deeply nested preceding table", () => {
    const instance = createScenario([
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

  it("preserves inline styles and target properties when merging into the parent", () => {
    const instance = createScenario([
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
});
