import { BlockNoteEditor, BlockNoteSchema, getNodeById } from "@blocknote/core";
import type { SideMenuExtension } from "@blocknote/core/extensions";
import "@blocknote/core/style.css";
import { TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { withMultiColumn } from "../../blocks/schema.js";
import { multiColumnDropCursor } from "../../extensions/DropCursor/multiColumnDropCursor.js";

// Drags through the side menu's drag API with synthetic drag events, as in
// core's `toggleBlocks.browser.test.ts`: an emulated mouse drag does not reach
// every target reliably.

const schema = withMultiColumn(BlockNoteSchema.create());

let editor: BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;
let root: HTMLElement;

function mount() {
  root = document.createElement("div");
  document.body.appendChild(root);
  editor = BlockNoteEditor.create({
    schema,
    dropCursor: multiColumnDropCursor,
    initialContent: [
      { id: "before", type: "paragraph", content: "Before" },
      {
        id: "list",
        type: "columnList",
        children: [
          {
            id: "col-a",
            type: "column",
            children: [{ id: "a", type: "paragraph", content: "A" }],
          },
          {
            id: "col-b",
            type: "column",
            children: [{ id: "b", type: "paragraph", content: "B" }],
          },
          {
            id: "col-c",
            type: "column",
            children: [{ id: "c", type: "paragraph", content: "C" }],
          },
        ],
      },
      { id: "after", type: "paragraph", content: "After" },
    ],
  });
  editor.mount(root);
}

afterEach(() => {
  sideMenu().blockDragEnd();
  editor._tiptapEditor.destroy();
  root.remove();
});

function sideMenu() {
  return editor.getExtension<typeof SideMenuExtension>("sideMenu")!;
}

function columnElement(id: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(
    `[data-node-type="column"][data-id="${id}"]`,
  );
  if (!element) {
    throw new Error(`Column "${id}" is not rendered`);
  }
  return element;
}

/**
 * Starts a drag of the block as its drag handle would: the handle's
 * `dragstart` goes through the side menu's `blockDragStart`, and then bubbles
 * up to the document, where every editor's side menu handles it. It starts
 * from the editor's container element, where the handle lives: `UniqueID` keeps the
 * ids of blocks dragged from there, and regenerates them for drops from
 * elsewhere.
 */
function startBlockDrag(id: string) {
  const dataTransfer = new DataTransfer();
  sideMenu().blockDragStart({ dataTransfer, clientY: 0 }, editor.getBlock(id)!);
  editor.prosemirrorView.dom.parentElement!.dispatchEvent(
    new DragEvent("dragstart", { bubbles: true, dataTransfer }),
  );
  return dataTransfer;
}

/** Drops the drag at the point: on the element there, as the browser does. */
function dropAt(dataTransfer: DataTransfer, clientX: number, clientY: number) {
  const init: DragEventInit = {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    dataTransfer,
  };
  const element = document.elementFromPoint(clientX, clientY)!;
  element.dispatchEvent(new DragEvent("dragenter", init));
  element.dispatchEvent(new DragEvent("dragover", init));
  document
    .elementFromPoint(clientX, clientY)!
    .dispatchEvent(new DragEvent("drop", init));
}

describe.each(["ltr", "rtl"] as const)("%s column edges", (dir) => {
  describe.each(["col-b", "after"] as const)("dropping beside %s", (id) => {
    it.each(["left", "right"] as const)(
      "lands on the %s side shown by the guide",
      (edge) => {
        mount();
        root.dir = dir;
        const dataTransfer = startBlockDrag("before");
        const target = root.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
        const rect = target.getBoundingClientRect();
        const clientX = edge === "left" ? rect.left : rect.right - 1;
        const clientY = rect.top + rect.height / 2;
        target.dispatchEvent(
          new DragEvent("dragover", {
            bubbles: true,
            clientX,
            clientY,
            dataTransfer,
          }),
        );
        const guide = document.querySelector(
          `.prosemirror-dropcursor-block-vertical-${edge}`,
        )!;
        const guideRect = guide.getBoundingClientRect();
        expect(
          Math.abs((guideRect.left + guideRect.right) / 2 - rect[edge]),
        ).toBeLessThan(2);
        dropAt(dataTransfer, clientX, clientY);
        const dropped = root.querySelector<HTMLElement>('[data-id="before"]')!;
        const targetAfter = root.querySelector<HTMLElement>(
          `[data-id="${id}"]`,
        )!;
        expect(
          dropped.getBoundingClientRect().left <
            targetAfter.getBoundingClientRect().left,
        ).toBe(edge === "left");
      },
    );
  });

  it("moves the resize boundary with a rightward drag", () => {
    mount();
    root.dir = dir;
    const column = columnElement("col-b");
    const before = column.getBoundingClientRect();
    const untouchedColumn = editor.getBlock(dir === "rtl" ? "col-c" : "col-a");
    const init = {
      bubbles: true,
      clientX: before.right - 1,
      clientY: before.top + before.height / 2,
    };
    column.dispatchEvent(new MouseEvent("mousedown", init));
    document.body.dispatchEvent(
      new MouseEvent("mousemove", { ...init, clientX: init.clientX + 40 }),
    );
    document.body.dispatchEvent(
      new MouseEvent("mouseup", { ...init, clientX: init.clientX + 40 }),
    );
    expect(
      columnElement("col-b").getBoundingClientRect().right,
    ).toBeGreaterThan(before.right + 20);
    expect(editor.getBlock(untouchedColumn!.id)).toEqual(untouchedColumn);
  });
});

describe("dragging a block selection that spans the column list", () => {
  // The sequence behind a flaky failure of the multi-column drop tests in CI:
  // the selection was left in the paragraph above the column list and
  // extended into a column, so the drag took the paragraph and the whole
  // list. Dropping on a column's edge removed the list before updating it,
  // which threw `Block with ID 1 not found` out of the drop handler.
  it("drops it as usual, without throwing", () => {
    mount();
    const doc = editor.prosemirrorState.doc;
    // From inside the paragraph above the list to inside a column's block.
    const anchor = getNodeById("before", doc)!.posBeforeNode + 2;
    const head = getNodeById("a", doc)!.posBeforeNode + 2;
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, anchor, head)),
    );
    const before = editor.document;

    const dataTransfer = startBlockDrag("a");
    // The paragraph and the whole column list.
    expect(editor.prosemirrorView.dragging!.slice.content.childCount).toBe(2);

    const rect = columnElement("col-c").getBoundingClientRect();
    dropAt(dataTransfer, rect.right - 1, rect.top + rect.height / 2);

    expect(editor.document).toEqual(before);
    expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
  });
});
