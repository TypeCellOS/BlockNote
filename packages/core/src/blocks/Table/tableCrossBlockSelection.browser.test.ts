import { TextSelection } from "prosemirror-state";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

// Mouse-drag selection across a table and neighbouring blocks needs a real
// layout (getBoundingClientRect / posAtCoords). The matching node tests in
// `tableCrossBlockSelection.test.ts` cover programmatic selection and Mod-a.

describe("table + neighbouring block mouse selection", () => {
  let editor: BlockNoteEditor;
  let mountPoint: HTMLElement;

  beforeEach(() => {
    mountPoint = document.createElement("div");
    document.body.appendChild(mountPoint);

    editor = BlockNoteEditor.create({
      initialContent: [
        { id: "paragraph-before", type: "paragraph", content: "Before table" },
        {
          id: "table-0",
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              { cells: ["Cell 1", "Cell 2"] },
              { cells: ["Cell 3", "Cell 4"] },
            ],
          },
        },
        { id: "paragraph-after", type: "paragraph", content: "After table" },
      ],
    });
    editor.mount(mountPoint);
  });

  afterEach(() => {
    editor.unmount();
    editor._tiptapEditor.destroy();
    mountPoint.remove();
  });

  function queryText(text: string) {
    const walker = document.createTreeWalker(mountPoint, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent === text) {
        return node;
      }
    }
    throw new Error(`Text node "${text}" not found`);
  }

  function clientPoint(text: string, atEnd = false) {
    const node = queryText(text);
    const range = document.createRange();
    range.setStart(node, atEnd ? (node.textContent?.length ?? 0) : 0);
    range.setEnd(node, atEnd ? (node.textContent?.length ?? 0) : 0);
    const rect = range.getBoundingClientRect();
    return {
      clientX: rect.left + Math.min(2, rect.width / 2),
      clientY: rect.top + rect.height / 2,
    };
  }

  function dragSelect(fromText: string, toText: string) {
    const from = clientPoint(fromText);
    const to = clientPoint(toText, true);
    const view = editor.prosemirrorView;

    view.dom.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        clientX: from.clientX,
        clientY: from.clientY,
      }),
    );
    view.dom.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        clientX: to.clientX,
        clientY: to.clientY,
      }),
    );
    view.dom.dispatchEvent(
      new MouseEvent("mouseup", {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        clientX: to.clientX,
        clientY: to.clientY,
      }),
    );
  }

  it("selects a paragraph, the table, and the next paragraph by dragging", () => {
    dragSelect("Before table", "After table");

    expect(editor.getSelection()?.blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ]);
    expect(editor.prosemirrorView.state.selection).toBeInstanceOf(
      TextSelection,
    );
  });

  it("selects the table together with the following paragraph when dragging out of a cell", () => {
    dragSelect("Cell 1", "After table");

    expect(editor.getSelection()?.blocks.map((block) => block.type)).toEqual([
      "table",
      "paragraph",
    ]);
  });
});
