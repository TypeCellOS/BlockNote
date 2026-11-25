import {
  BlockNoteSchema,
  type BlockNoteEditor,
  type BlockNoteEditorOptions,
} from "@blocknote/core";
import type { SideMenuExtension } from "@blocknote/core/extensions";
import "@blocknote/core/style.css";
import { describe, expect } from "vite-plus/test";

import { withMultiColumn } from "../../blocks/schema.js";
import { multiColumnDropCursor } from "../../extensions/DropCursor/multiColumnDropCursor.js";

// Drags through the side menu's drag API with synthetic drag events, as in
// core's `toggleBlocks.browser.test.ts`: an emulated mouse drag does not reach
// every target reliably.

const schema = withMultiColumn(BlockNoteSchema.create());

type Editor = BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;

const editorOptions = {
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
} satisfies Partial<
  BlockNoteEditorOptions<
    typeof schema.blockSchema,
    typeof schema.inlineContentSchema,
    typeof schema.styleSchema
  >
>;

function sideMenu(editor: Editor) {
  return editor.getExtension<typeof SideMenuExtension>("sideMenu")!;
}

function columnElement(editor: Editor, id: string): HTMLElement {
  const element = editor.domElement!.querySelector<HTMLElement>(
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
function startBlockDrag(editor: Editor, id: string) {
  const dataTransfer = new DataTransfer();
  sideMenu(editor).blockDragStart(
    { dataTransfer, clientY: 0 },
    editor.getBlock(id)!,
  );
  editor.domElement!.parentElement!.dispatchEvent(
    new DragEvent("dragstart", { bubbles: true, dataTransfer }),
  );
  return dataTransfer;
}

/** Dispatches to the hit-tested element, rather than assuming the target. */
function dispatchDragAt(
  type: "dragenter" | "dragover" | "drop",
  dataTransfer: DataTransfer,
  clientX: number,
  clientY: number,
) {
  document.elementFromPoint(clientX, clientY)!.dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      dataTransfer,
    }),
  );
}

describe("dragging a block selection that spans the column list", () => {
  // The sequence behind a flaky failure of the multi-column drop tests in CI:
  // the selection was left in the paragraph above the column list and
  // extended into a column, so the drag took the paragraph and the whole
  // list. Dropping on a column's edge removed the list before updating it,
  // which threw `Block with ID 1 not found` out of the drop handler.
  it("leaves the document unchanged when dropped on its own column edge", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...editorOptions,
    });
    // From inside the paragraph above the list to inside a column's block.
    editor.setSelection("before", "a");
    const before = editor.document;

    try {
      const dataTransfer = startBlockDrag(editor, "a");
      // The drag payload contains the preceding paragraph and every column,
      // not just the column in which the text selection ends.
      const payload = document.createElement("template");
      payload.innerHTML = dataTransfer.getData("blocknote/html");
      for (const id of ["before", "list", "col-a", "col-b", "col-c"]) {
        expect(
          payload.content.querySelector(`[data-id="${id}"]`),
        ).not.toBeNull();
      }
      expect(payload.content.querySelector('[data-id="after"]')).toBeNull();

      const rect = columnElement(editor, "col-c").getBoundingClientRect();
      const x = rect.right - 1;
      const y = rect.top + rect.height / 2;
      dispatchDragAt("dragenter", dataTransfer, x, y);
      dispatchDragAt("dragover", dataTransfer, x, y);
      const cursor = editor.domElement?.offsetParent?.querySelector(
        ".prosemirror-dropcursor-block-vertical-right",
      );
      if (!cursor) {
        throw new Error("The drag did not reach a right-edge drop zone");
      }
      const cursorRect = cursor.getBoundingClientRect();
      expect(
        Math.abs(cursorRect.left + cursorRect.width / 2 - rect.right),
      ).toBeLessThanOrEqual(1);
      expect(Math.abs(cursorRect.top - rect.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(cursorRect.bottom - rect.bottom)).toBeLessThanOrEqual(1);

      dispatchDragAt("drop", dataTransfer, x, y);
      expect(editor.document).toEqual(before);
    } finally {
      sideMenu(editor).blockDragEnd();
    }
  });
});
