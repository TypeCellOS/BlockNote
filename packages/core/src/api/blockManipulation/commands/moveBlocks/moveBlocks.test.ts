import { NodeSelection, TextSelection } from "prosemirror-state";
import { CellSelection } from "prosemirror-tables";
import { describe, expect } from "vite-plus/test";

import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import {
  getBlockInfoNearPos,
  getBlockInfoFromSelection,
  getNodeId,
} from "../../../getBlockInfoFromPos.js";
import { getNodeById } from "../../../nodeUtil.js";
import { layoutSchema } from "../../layoutBlocks/layoutBlocks.fixture.js";
import { testDocument } from "../../setupTestEnv.js";
import {
  moveBlocksDown,
  moveBlocksUp,
  moveSelectedBlocksAndSelection,
} from "./moveBlocks.js";

type LayoutEditor = BlockNoteEditor<
  typeof layoutSchema.blockSchema,
  typeof layoutSchema.inlineContentSchema,
  typeof layoutSchema.styleSchema
>;

let editor: LayoutEditor;
it.beforeEach(async ({ setupEditor }) => {
  ({ editor } = await setupEditor({
    schema: layoutSchema,
    initialContent: testDocument,
  }));
});

function getEditor() {
  return editor;
}

type EditorDocument = LayoutEditor["document"];
type SiblingOrders = {
  // These replace the root siblings before paragraph-3 and from
  // heading-with-everything onward, respectively.
  start?: readonly string[];
  end?: readonly string[];
  children?: Readonly<Partial<Record<string, readonly string[]>>>;
};

function documentInOrder(
  before: EditorDocument,
  orders: SiblingOrders,
): EditorDocument {
  const byId = new Map<string, EditorDocument[number]>();
  function indexBlocks(blocks: EditorDocument) {
    for (const block of blocks) {
      byId.set(block.id, block);
      indexBlocks(block.children);
    }
  }
  indexBlocks(structuredClone(before));

  function buildBlock(id: string): EditorDocument[number] {
    const block = byId.get(id);
    if (!block) {
      throw new Error(`Unknown block in expected document: ${id}`);
    }
    const childIds =
      orders.children?.[id] ?? block.children.map((child) => child.id);
    return { ...block, children: childIds.map(buildBlock) };
  }

  const rootIds = before.map((block) => block.id);
  const middleStart = rootIds.indexOf("paragraph-3");
  const middleEnd = rootIds.indexOf("heading-with-everything");
  if (middleStart < 0 || middleEnd <= middleStart) {
    throw new Error("Expected document is missing its unchanged middle range");
  }
  return [
    ...(orders.start ?? rootIds.slice(0, middleStart)),
    ...rootIds.slice(middleStart, middleEnd),
    ...(orders.end ?? rootIds.slice(middleEnd)),
  ].map(buildBlock);
}

function makeSelectionSpanContent(selectionType: "text" | "cell") {
  const blockInfo = getEditor().transact((tr) => getBlockInfoFromSelection(tr));
  if (!blockInfo.hasContent) {
    throw new Error(
      `Selection points to a ${blockInfo.blockNoteType} node, not a blockContainer node`,
    );
  }
  const { content } = blockInfo;

  const editor = getEditor();
  if (selectionType === "cell") {
    editor.transact((tr) =>
      tr.setSelection(
        CellSelection.create(
          tr.doc,
          tr.doc.resolve(content.beforePos + 3).before(),
          tr.doc.resolve(content.afterPos - 3).before(),
        ),
      ),
    );
  } else {
    editor.transact((tr) =>
      tr.setSelection(
        TextSelection.create(
          tr.doc,
          content.beforePos + 1,
          content.afterPos - 1,
        ),
      ),
    );
  }
}

describe("Test moveSelectedBlockAndSelection", () => {
  it("Text selection", () => {
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    expect(
      getEditor()
        .document.slice(0, 2)
        .map((block) => block.id),
    ).toEqual(["paragraph-1", "paragraph-0"]);
    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });

  it.each([
    { type: "image", offset: 1 },
    { type: "callout", offset: 0 },
  ] as const)("Node selection: $type", ({ type, offset }) => {
    const editor = getEditor();
    editor.insertBlocks([{ id: "selected", type }], "paragraph-1", "after");
    editor.transact((tr) => {
      const block = getNodeById("selected", tr.doc)!;
      tr.setSelection(
        NodeSelection.create(tr.doc, block.posBeforeNode + offset),
      );
    });

    moveSelectedBlocksAndSelection(editor, "paragraph-0", "before");

    expect(editor.document[0].id).toBe("selected");
    editor.transact((tr) => {
      const moved = getNodeById("selected", tr.doc)!;
      expect(
        tr.selection.eq(
          NodeSelection.create(tr.doc, moved.posBeforeNode + offset),
        ),
      ).toBe(true);
    });
  });

  it("Cell selection", () => {
    getEditor().setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    expect(
      getEditor()
        .document.slice(0, 2)
        .map((block) => block.id),
    ).toEqual(["table-0", "paragraph-0"]);
    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setTextCursorPosition("table-0");
    makeSelectionSpanContent("cell");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });

  it("Multiple block selection", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    expect(
      getEditor()
        .document.slice(0, 4)
        .map((block) => block.id),
    ).toEqual([
      "paragraph-1",
      "paragraph-with-children",
      "paragraph-2",
      "paragraph-0",
    ]);
    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setSelection("paragraph-1", "paragraph-2");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });

  it("Multiple block selection with table", () => {
    getEditor().setSelection("paragraph-6", "table-0");

    moveSelectedBlocksAndSelection(getEditor(), "paragraph-0", "before");

    expect(
      getEditor()
        .document.slice(0, 3)
        .map((block) => block.id),
    ).toEqual(["paragraph-6", "table-0", "paragraph-0"]);
    const selection = getEditor().transact((tr) => tr.selection);
    getEditor().setSelection("paragraph-6", "table-0");

    expect(
      selection.eq(getEditor().transact((tr) => tr.selection)),
    ).toBeTruthy();
  });
});

describe("Test moveBlocksUp", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-1");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-1",
        "paragraph-0",
        "paragraph-with-children",
        "paragraph-2",
        "paragraph-with-props",
      ],
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Into children", () => {
    getEditor().setTextCursorPosition("paragraph-2");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-with-props",
      ],
      children: {
        "paragraph-with-children": ["nested-paragraph-0", "paragraph-2"],
      },
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Out of children", () => {
    getEditor().setTextCursorPosition("nested-paragraph-1");
    const expected = documentInOrder(getEditor().document, {
      end: ["nested-paragraph-1", "heading-with-everything", "paragraph-9"],
      children: { "heading-with-everything": [] },
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("First block", () => {
    getEditor().setTextCursorPosition("paragraph-0");
    const documentBefore = structuredClone(getEditor().document);

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(documentBefore);
  });

  it("Multiple blocks", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-2",
        "paragraph-0",
        "paragraph-with-props",
      ],
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks starting in block with children", () => {
    getEditor().setSelection("paragraph-with-children", "paragraph-2");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-with-children",
        "paragraph-2",
        "paragraph-1",
        "paragraph-with-props",
      ],
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks starting in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "paragraph-2");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "nested-paragraph-0",
        "paragraph-2",
        "paragraph-with-children",
        "paragraph-with-props",
      ],
      children: { "paragraph-with-children": [] },
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks ending in block with children", () => {
    getEditor().setSelection("paragraph-1", "paragraph-with-children");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-0",
        "paragraph-2",
        "paragraph-with-props",
      ],
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks ending in nested block", () => {
    getEditor().setSelection("paragraph-1", "nested-paragraph-0");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-0",
        "paragraph-2",
        "paragraph-with-props",
      ],
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks starting and ending in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "nested-paragraph-1");
    // This cross-parent move also sends the original parent near the end.
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "nested-paragraph-0",
        "paragraph-2",
        "paragraph-with-props",
      ],
      end: [
        "heading-with-everything",
        "paragraph-with-children",
        "paragraph-9",
      ],
      children: { "paragraph-with-children": [] },
    });

    moveBlocksUp(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Explicit block argument moves the given block", () => {
    getEditor().setTextCursorPosition("paragraph-0");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-with-props",
      ],
      children: {
        "paragraph-with-children": ["nested-paragraph-0", "paragraph-2"],
      },
    });

    moveBlocksUp(getEditor(), "paragraph-2");

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Explicit block argument does not change the selection", () => {
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    moveBlocksUp(getEditor(), "paragraph-2");

    const { anchorBlockId, headBlockId } = getEditor().transact((tr) => ({
      anchorBlockId: getNodeId(
        getBlockInfoNearPos(tr, tr.selection.anchor).block.node,
        tr.doc,
      ),
      headBlockId: getNodeId(
        getBlockInfoNearPos(tr, tr.selection.head).block.node,
        tr.doc,
      ),
    }));
    expect(anchorBlockId).toBe("paragraph-1");
    expect(headBlockId).toBe("paragraph-1");
  });

  it("Explicit block argument with first block is a no-op", () => {
    const documentBefore = getEditor().document;

    moveBlocksUp(getEditor(), "paragraph-0");

    expect(getEditor().document).toEqual(documentBefore);
  });

  it("Explicit block argument with nested block", () => {
    const expected = documentInOrder(getEditor().document, {
      end: ["nested-paragraph-1", "heading-with-everything", "paragraph-9"],
      children: { "heading-with-everything": [] },
    });

    moveBlocksUp(getEditor(), "nested-paragraph-1");

    expect(getEditor().document).toStrictEqual(expected);
  });
});

describe("Test moveBlocksDown", () => {
  it("Basic", () => {
    getEditor().setTextCursorPosition("paragraph-0");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-1",
        "paragraph-0",
        "paragraph-with-children",
        "paragraph-2",
        "paragraph-with-props",
      ],
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Into children", () => {
    getEditor().setTextCursorPosition("paragraph-1");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-with-children",
        "paragraph-2",
        "paragraph-with-props",
      ],
      children: {
        "paragraph-with-children": ["paragraph-1", "nested-paragraph-0"],
      },
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Out of children", () => {
    getEditor().setTextCursorPosition("nested-paragraph-1");
    const expected = documentInOrder(getEditor().document, {
      end: ["heading-with-everything", "nested-paragraph-1", "paragraph-9"],
      children: { "heading-with-everything": [] },
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Last block", () => {
    getEditor().setTextCursorPosition("paragraph-9");
    const documentBefore = structuredClone(getEditor().document);

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(documentBefore);
  });

  it("Multiple blocks", () => {
    getEditor().setSelection("paragraph-1", "paragraph-2");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-with-props",
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-2",
      ],
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks starting in block with children", () => {
    getEditor().setSelection("paragraph-with-children", "paragraph-2");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "paragraph-with-props",
        "paragraph-with-children",
        "paragraph-2",
      ],
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks starting in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "paragraph-2");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-with-props",
        "nested-paragraph-0",
        "paragraph-2",
      ],
      children: { "paragraph-with-children": [] },
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks ending in block with children", () => {
    getEditor().setSelection("paragraph-1", "paragraph-with-children");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-2",
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-with-props",
      ],
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks ending in nested block", () => {
    getEditor().setSelection("paragraph-1", "nested-paragraph-0");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-2",
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-with-props",
      ],
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Multiple blocks starting and ending in nested block", () => {
    getEditor().setSelection("nested-paragraph-0", "nested-paragraph-1");
    // This cross-parent move also brings the former last block to the front.
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "paragraph-with-children",
        "paragraph-9",
        "nested-paragraph-0",
        "paragraph-2",
        "paragraph-with-props",
      ],
      end: ["heading-with-everything"],
      children: { "paragraph-with-children": [] },
    });

    moveBlocksDown(getEditor());

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Explicit block argument moves the given block", () => {
    getEditor().setTextCursorPosition("paragraph-9");
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-1",
        "paragraph-0",
        "paragraph-with-children",
        "paragraph-2",
        "paragraph-with-props",
      ],
    });

    moveBlocksDown(getEditor(), "paragraph-0");

    expect(getEditor().document).toStrictEqual(expected);
  });

  it("Explicit block argument does not change the selection", () => {
    getEditor().setTextCursorPosition("paragraph-1");
    makeSelectionSpanContent("text");

    moveBlocksDown(getEditor(), "paragraph-0");

    const { anchorBlockId, headBlockId } = getEditor().transact((tr) => ({
      anchorBlockId: getNodeId(
        getBlockInfoNearPos(tr, tr.selection.anchor).block.node,
        tr.doc,
      ),
      headBlockId: getNodeId(
        getBlockInfoNearPos(tr, tr.selection.head).block.node,
        tr.doc,
      ),
    }));
    expect(anchorBlockId).toBe("paragraph-1");
    expect(headBlockId).toBe("paragraph-1");
  });

  it("Explicit block argument with last block is a no-op", () => {
    const documentBefore = getEditor().document;
    const lastBlock = documentBefore.at(-1)!;

    moveBlocksDown(getEditor(), lastBlock);

    expect(getEditor().document).toEqual(documentBefore);
  });

  it("Explicit block argument with nested block", () => {
    const expected = documentInOrder(getEditor().document, {
      start: [
        "paragraph-0",
        "paragraph-1",
        "paragraph-with-children",
        "nested-paragraph-0",
        "paragraph-2",
        "paragraph-with-props",
      ],
      children: { "paragraph-with-children": [] },
    });

    moveBlocksDown(getEditor(), "nested-paragraph-0");

    expect(getEditor().document).toStrictEqual(expected);
  });
});
