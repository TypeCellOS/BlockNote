import { createChainableState } from "@tiptap/core";
import { TextSelection } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { getBlockInfoFromNode } from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";
import { layoutSchema } from "../../layoutBlocks/layoutBlocks.fixture.js";
import { testDocument } from "../../setupTestEnv.js";
import { splitBlockCommand } from "./splitBlock.js";

function splitBlock(
  editor: Pick<BlockNoteEditor, "exec">,
  posInBlock: number,
  keepType?: boolean,
  keepProps?: boolean,
  keepChildren?: boolean,
) {
  return editor.exec((state, dispatch) => {
    // Tiptap passes a shared transaction to the command and commits it after
    // the command returns; the dispatch argument only signals write mode.
    const transaction = state.tr;
    const handled = splitBlockCommand(
      posInBlock,
      keepType,
      keepProps,
      keepChildren,
    )({
      state: createChainableState({ state, transaction }),
      dispatch: dispatch && (() => {}),
    });
    dispatch?.(transaction);
    return handled;
  });
}

function setSelectionWithOffset(
  editor: BlockNoteEditor,
  targetBlockId: string,
  offset: number,
) {
  editor.transact((tr) => {
    const posInfo = getNodeById(targetBlockId, tr.doc);
    if (!posInfo) {
      throw new Error(`Block with ID ${targetBlockId} not found`);
    }
    const info = getBlockInfoFromNode(posInfo.node, posInfo.posBeforeNode);
    if (!info.hasContent) {
      throw new Error("Target block is not a block container");
    }
    tr.setSelection(TextSelection.create(tr.doc, info.contentStart + offset));
  });
}

describe("Test splitBlocks", () => {
  let editor: BlockNoteEditor;
  it.beforeEach(async ({ setupEditor }) => {
    ({ editor } = await setupEditor({ initialContent: testDocument }));
  });

  function getEditor() {
    return editor;
  }

  it("Basic", () => {
    setSelectionWithOffset(getEditor(), "paragraph-0", 4);

    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("End of content", () => {
    setSelectionWithOffset(getEditor(), "paragraph-0", 11);

    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Block has children", () => {
    setSelectionWithOffset(getEditor(), "paragraph-with-children", 4);

    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Keep type", () => {
    setSelectionWithOffset(getEditor(), "heading-0", 4);
    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
      true,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep type", () => {
    setSelectionWithOffset(getEditor(), "heading-0", 4);
    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
      false,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it.skip("Keep props", () => {
    setSelectionWithOffset(getEditor(), "paragraph-with-props", 4);
    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
      false,
      true,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Don't keep props", () => {
    setSelectionWithOffset(getEditor(), "paragraph-with-props", 4);
    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
      false,
      false,
    );

    expect(getEditor().document).toMatchSnapshot();
  });

  it("Selection is set", () => {
    setSelectionWithOffset(getEditor(), "paragraph-0", 4);
    splitBlock(
      getEditor(),
      getEditor().transact((tr) => tr.selection.anchor),
    );

    const newBlock = getEditor().document[1];
    expect(newBlock.id).toBe("0");
    expect(getEditor().getTextCursorPosition().block.id).toBe(newBlock.id);
    expect(
      getEditor().transact((tr) => tr.selection.$anchor.parentOffset),
    ).toBe(0);
  });
});

// `splitBlockTr` splits two levels deep (`blockContent` and its
// `blockContainer`), which assumes the block's parent is a children holder that
// accepts another `blockContainer`. A layout block's children holder is a
// different node type than `blockGroup`, so these pin that the split lands
// inside the layout block rather than tearing it open.
describe("Test splitBlocks inside layout blocks", () => {
  type LayoutEditor = typeof layoutSchema.BlockNoteEditor;
  const editorOptions: {
    schema: typeof layoutSchema;
    initialContent: (typeof layoutSchema.PartialBlock)[];
  } = {
    schema: layoutSchema,
    initialContent: [
      { id: "before", type: "paragraph", content: "Before" },
      {
        id: "callout-0",
        type: "callout",
        children: [
          {
            id: "callout-child-0",
            type: "paragraph",
            content: "Callout child",
          },
          {
            id: "callout-child-1",
            type: "heading",
            content: "Callout heading",
            children: [
              {
                id: "nested-child",
                type: "paragraph",
                content: "Nested child",
              },
            ],
          },
        ],
      },
      {
        id: "grid-0",
        type: "grid",
        children: [
          {
            id: "cell-0",
            type: "gridCell",
            children: [
              { id: "cell-0-p", type: "paragraph", content: "Cell zero" },
            ],
          },
          {
            id: "cell-1",
            type: "gridCell",
            children: [
              { id: "cell-1-p", type: "paragraph", content: "Cell one" },
            ],
          },
        ],
      },
    ],
  };

  let layoutEditor: LayoutEditor;
  it.beforeEach(async ({ setupEditor }) => {
    ({ editor: layoutEditor } = await setupEditor(editorOptions));
  });

  function getLayoutEditor() {
    return layoutEditor;
  }

  function splitLayoutBlock(
    editor: LayoutEditor,
    blockId: string,
    offset: number,
    keepChildren = false,
  ) {
    const posInBlock = editor.transact((tr) => {
      const posInfo = getNodeById(blockId, tr.doc);
      if (!posInfo) {
        throw new Error(`Block with ID ${blockId} not found`);
      }

      const info = getBlockInfoFromNode(posInfo.node, posInfo.posBeforeNode);

      // A layout block has no content to offset into, so we aim at the node
      // itself, which is where a `NodeSelection` on it would put the anchor.
      return info.hasContent
        ? info.content.beforePos + offset + 1
        : info.block.beforePos;
    });

    return splitBlock(editor, posInBlock, true, undefined, keepChildren);
  }

  function textOf(block: { content?: any }) {
    return (block.content as { text: string }[]).map((c) => c.text).join("");
  }

  it("Splits a block inside a layout block in place", () => {
    expect(splitLayoutBlock(getLayoutEditor(), "callout-child-0", 7)).toBe(
      true,
    );

    const document = getLayoutEditor().document;

    expect(document.map((block) => block.id)).toEqual([
      "before",
      "callout-0",
      "grid-0",
    ]);

    const callout = document[1];
    expect(callout.type).toBe("callout");
    expect(callout.children.map(textOf)).toEqual([
      "Callout",
      " child",
      "Callout heading",
    ]);

    expect(() =>
      getLayoutEditor().transact((tr) => tr.doc.check()),
    ).not.toThrow();
  });

  it("Moves the block's children to the second half of the split", () => {
    expect(splitLayoutBlock(getLayoutEditor(), "callout-child-1", 7)).toBe(
      true,
    );

    const callout = getLayoutEditor().document[1];

    expect(callout.children.map(textOf)).toEqual([
      "Callout child",
      "Callout",
      " heading",
    ]);
    // The children follow the second half, as they do at the top level.
    expect(callout.children[1].children).toEqual([]);
    expect(callout.children[2].children.map((child) => child.id)).toEqual([
      "nested-child",
    ]);

    expect(() =>
      getLayoutEditor().transact((tr) => tr.doc.check()),
    ).not.toThrow();
  });

  it("Keeps the block's children on the first half with `keepChildren`", () => {
    expect(
      splitLayoutBlock(getLayoutEditor(), "callout-child-1", 7, true),
    ).toBe(true);

    const callout = getLayoutEditor().document[1];

    expect(callout.children.map(textOf)).toEqual([
      "Callout child",
      "Callout",
      " heading",
    ]);
    expect(callout.children[2].children).toEqual([]);
    expect(callout.children[1].children.map((child) => child.id)).toEqual([
      "nested-child",
    ]);

    expect(() =>
      getLayoutEditor().transact((tr) => tr.doc.check()),
    ).not.toThrow();
  });

  it("Splits a block inside a nested layout block", () => {
    expect(splitLayoutBlock(getLayoutEditor(), "cell-0-p", 4)).toBe(true);

    const grid = getLayoutEditor().document[2];

    expect(grid.type).toBe("grid");
    expect(grid.children.map((cell) => cell.id)).toEqual(["cell-0", "cell-1"]);
    expect(grid.children[0].children.map(textOf)).toEqual(["Cell", " zero"]);
    expect(grid.children[1].children.map(textOf)).toEqual(["Cell one"]);

    expect(() =>
      getLayoutEditor().transact((tr) => tr.doc.check()),
    ).not.toThrow();
  });

  it("Does not split a layout block itself", () => {
    const before = getLayoutEditor().document;

    expect(splitLayoutBlock(getLayoutEditor(), "callout-0", 0)).toBe(false);

    expect(getLayoutEditor().document).toEqual(before);
  });
});

// By default the children follow the text after the caret into the second
// block. `keepChildren` (a closed toggle) keeps them with the first half,
// except at the start, where the whole content moves down.
describe("split child ownership", () => {
  let editor: BlockNoteEditor;
  it.beforeEach(async ({ setupEditor }) => {
    ({ editor } = await setupEditor({ initialContent: testDocument }));
  });

  function getEditor() {
    return editor;
  }

  it.each([
    ["start", false, "second"],
    ["middle", false, "second"],
    ["end", false, "second"],
    ["start", true, "second"],
    ["middle", true, "first"],
    ["end", true, "first"],
  ] as const)(
    "splitting at the %s with keepChildren %s leaves the children with the %s block",
    (where, keepChildren, owner) => {
      const editor = getEditor();
      const id = "paragraph-with-children";
      const children = editor.getBlock(id)!.children;
      const target = editor.transact((tr) => getNodeById(id, tr.doc))!;
      const info = getBlockInfoFromNode(target.node, target.posBeforeNode);
      if (!info.hasContent) {
        throw new Error("Expected content block");
      }
      const offset =
        where === "start"
          ? 0
          : where === "end"
            ? info.contentEnd - info.contentStart
            : 4;
      setSelectionWithOffset(editor, id, offset);
      splitBlock(
        editor,
        editor.transact((tr) => tr.selection.from),
        undefined,
        undefined,
        keepChildren,
      );
      const index = editor.document.findIndex((block) => block.id === id);
      const [first, second] = editor.document.slice(index, index + 2);
      expect((owner === "first" ? first : second).children).toEqual(children);
      expect((owner === "first" ? second : first).children).toEqual([]);
      expect(editor.getTextCursorPosition().block.id).toBe(second.id);
      expect(() => editor.transact((tr) => tr.doc.check())).not.toThrow();
    },
  );
});
