import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../schema/index.js";
import { TableHandlesExtension } from "./TableHandles.js";

// Unit tests for the mouse handling in `TableHandlesView`, which decides
// whether the row/column handles should be attached to the cell under the
// cursor. It reads the DOM (`getBoundingClientRect`, node views, hit testing),
// so it runs in the browser suite rather than as a node unit test.

// A custom block which renders a real `<table>` of its own, without having any
// table content in the document. Table cells like these are indistinguishable
// from a table block's cells when only looking at the DOM.
const fakeTableBlock = createBlockSpec(
  {
    type: "fakeTable",
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      const dom = document.createElement("div");
      dom.className = "fake-table";
      dom.innerHTML =
        "<table><tbody><tr><td>Not a real cell</td></tr></tbody></table>";

      return { dom };
    },
  },
);

// A custom block which embeds a second editor, itself containing a table. The
// nested editor's cells live inside the outer editor's DOM, so they reach the
// outer editor's mouse handlers, but its block IDs are unknown to the outer
// document.
const nestedEditorBlock = createBlockSpec(
  {
    type: "nestedEditor",
    propSchema: {},
    content: "none",
  },
  {
    render: () => {
      const dom = document.createElement("div");
      dom.className = "nested-editor";
      dom.contentEditable = "false";

      const nestedEditor = BlockNoteEditor.create({
        initialContent: [
          {
            id: "nested-table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [{ cells: ["Nested cell"] }],
            },
          },
        ],
      });
      nestedEditor.mount(dom);
      // The nested editor's UI renders at the body, outside its own DOM tree.
      nestedEditor.registerPortalElement(document.body);

      return { dom, destroy: () => nestedEditor.unmount() };
    },
  },
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    fakeTable: fakeTableBlock(),
    nestedEditor: nestedEditorBlock(),
  },
});

describe("TableHandlesView mouse handling", () => {
  let editor: BlockNoteEditor<any, any, any>;
  let mountPoint: HTMLElement;

  beforeEach(() => {
    mountPoint = document.createElement("div");
    document.body.appendChild(mountPoint);

    editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          id: "table-0",
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              { cells: ["Cell 1", "Cell 2", "Cell 3"] },
              { cells: ["Cell 4", "Cell 5", "Cell 6"] },
            ],
          },
        },
        { id: "paragraph-0", type: "paragraph", content: "Paragraph" },
        { id: "fake-table-0", type: "fakeTable" },
        { id: "nested-editor-0", type: "nestedEditor" },
      ],
    }) as BlockNoteEditor<any, any, any>;
    editor.mount(mountPoint);
  });

  afterEach(() => {
    editor.unmount();
    editor._tiptapEditor.destroy();
    mountPoint.remove();
  });

  function tableHandlesState() {
    return editor.getExtension(TableHandlesExtension)!.store.state;
  }

  function queryElement(selector: string) {
    const element = mountPoint.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`No element matching "${selector}"`);
    }
    return element;
  }

  // The cell in the (only) real table block, at the given row and column.
  function tableCell(rowIndex: number, colIndex: number) {
    const cell = queryElement(
      `[data-id="table-0"] tbody tr:nth-child(${rowIndex + 1})`,
    ).children[colIndex];
    if (!(cell instanceof HTMLElement)) {
      throw new Error(`No cell at row ${rowIndex}, column ${colIndex}`);
    }
    return cell;
  }

  function dispatchMouseEvent(
    type: "mousemove" | "mousedown",
    el: HTMLElement,
  ) {
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    );
  }

  // Moves the mouse over `el` and asserts the handler survived it. An event
  // listener that throws doesn't propagate the error to `dispatchEvent`'s
  // caller - the browser reports it as an `error` event on `window` instead -
  // so the error has to be picked up from there to be visible to the test.
  function moveMouseOver(el: HTMLElement) {
    const errors: unknown[] = [];
    const collectError = (event: ErrorEvent) => {
      errors.push(event.error ?? event.message);
    };

    window.addEventListener("error", collectError);
    try {
      dispatchMouseEvent("mousemove", el);
    } finally {
      window.removeEventListener("error", collectError);
    }

    expect(errors).toEqual([]);
  }

  it("attaches the handles to the hovered cell", () => {
    moveMouseOver(tableCell(1, 1));

    expect(tableHandlesState()).toMatchObject({
      show: true,
      rowIndex: 1,
      colIndex: 1,
      block: { id: "table-0" },
    });
  });

  it("only offers the add/remove buttons on the last row and column", () => {
    moveMouseOver(tableCell(0, 0));

    expect(tableHandlesState()).toMatchObject({
      showAddOrRemoveRowsButton: false,
      showAddOrRemoveColumnsButton: false,
    });

    moveMouseOver(tableCell(1, 2));

    expect(tableHandlesState()).toMatchObject({
      showAddOrRemoveRowsButton: true,
      showAddOrRemoveColumnsButton: true,
    });
  });

  it("hides the handles when the mouse leaves the table", () => {
    moveMouseOver(tableCell(0, 0));
    expect(tableHandlesState()?.show).toBe(true);

    moveMouseOver(queryElement('[data-id="paragraph-0"]'));

    expect(tableHandlesState()?.show).toBe(false);
  });

  it("hides the handles while text is being selected with the mouse", () => {
    moveMouseOver(tableCell(0, 0));
    expect(tableHandlesState()?.show).toBe(true);

    dispatchMouseEvent("mousedown", tableCell(0, 0));
    moveMouseOver(tableCell(0, 1));

    expect(tableHandlesState()?.show).toBe(false);
  });

  it("keeps the handles on the same cell while frozen", () => {
    moveMouseOver(tableCell(0, 0));
    editor.getExtension(TableHandlesExtension)!.freezeHandles();

    moveMouseOver(tableCell(1, 2));

    expect(tableHandlesState()).toMatchObject({
      show: true,
      rowIndex: 0,
      colIndex: 0,
    });

    editor.getExtension(TableHandlesExtension)!.unfreezeHandles();
    moveMouseOver(tableCell(1, 2));

    expect(tableHandlesState()).toMatchObject({
      show: true,
      rowIndex: 1,
      colIndex: 2,
    });
  });

  it("does not show the handles when the editor is not editable", () => {
    editor.isEditable = false;

    moveMouseOver(tableCell(0, 0));

    expect(tableHandlesState()?.show).toBeFalsy();
  });

  // Regression test for https://github.com/TypeCellOS/BlockNote/issues/2964.
  // The hovered block used to be treated as a table as soon as the schema had
  // a table block in it, so a custom block rendering a `<table>` ended up on
  // the table path and crashed on its (absent) table content.
  it("ignores cells of a custom block that renders its own table", () => {
    moveMouseOver(queryElement(".fake-table td"));

    expect(tableHandlesState()?.show).toBeFalsy();
  });

  it("hides the handles when moving from a table onto a custom block's table", () => {
    moveMouseOver(tableCell(0, 0));
    expect(tableHandlesState()?.show).toBe(true);

    moveMouseOver(queryElement(".fake-table td"));

    expect(tableHandlesState()?.show).toBe(false);
  });

  // The other half of #2964: the hovered cell belongs to a nested editor, so
  // its block ID cannot be resolved in the outer editor's document. That used
  // to throw `Block with ID <id> not found` on every mouse move.
  it("ignores table cells belonging to a nested editor", () => {
    moveMouseOver(queryElement(".nested-editor td"));

    expect(tableHandlesState()?.show).toBeFalsy();
  });

  it("hides the handles when moving from a table onto a nested editor's table", () => {
    moveMouseOver(tableCell(0, 0));
    expect(tableHandlesState()?.show).toBe(true);

    moveMouseOver(queryElement(".nested-editor td"));

    expect(tableHandlesState()?.show).toBe(false);
  });

  // The table's position is captured when the handles attach to a cell, but
  // the table shifts whenever content before it changes - a collaborator or an
  // extension editing while a handle menu sits open, say. Acting on the handles
  // afterwards used to resolve the stale position, landing in the wrong node.
  it("acts on the hovered table after content is inserted before it", () => {
    moveMouseOver(tableCell(0, 0));

    editor.insertBlocks(
      [{ type: "paragraph", content: "Inserted" }],
      "table-0",
      "before",
    );

    editor
      .getExtension(TableHandlesExtension)!
      .addRowOrColumn(0, { orientation: "row", side: "below" });

    expect(
      mountPoint.querySelectorAll('[data-id="table-0"] tbody tr'),
    ).toHaveLength(3);
  });
});
