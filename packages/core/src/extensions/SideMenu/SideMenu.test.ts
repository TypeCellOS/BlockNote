/**
 * @vitest-environment jsdom
 */
import { afterEach, expect, it } from "vite-plus/test";
import * as Y from "yjs";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYXmlFragment } from "../../yjs/utils.js";
import { withCollaboration } from "../../yjs/extensions/index.js";
import { SideMenuExtension } from "./SideMenu.js";

type Editor = BlockNoteEditor<any, any, any>;

const editors: Editor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.unmount();
  }
});

function collaborativeEditor(doc: Y.Doc): Editor {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.getXmlFragment("doc"),
        user: { name: "Test", color: "#ff0000" },
      },
    }),
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor.mount(element);
  editors.push(editor);
  return editor;
}

/** Two users editing copies of a 3×2 table, synced on demand. */
function twoUsers() {
  const docA = new Y.Doc();
  const seed = BlockNoteEditor.create();
  seed.replaceBlocks(seed.document, [
    {
      id: "table",
      type: "table",
      content: {
        type: "tableContent",
        rows: [{ cells: ["A1", "", ""] }, { cells: ["", "", ""] }],
      },
    } as any,
  ]);
  blocksToYXmlFragment(seed, seed.document, docA.getXmlFragment("doc"));
  const docB = new Y.Doc();
  Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
  return {
    a: collaborativeEditor(docA),
    b: collaborativeEditor(docB),
    sync: () => {
      const toB = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
      const toA = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));
      Y.applyUpdate(docB, toB);
      Y.applyUpdate(docA, toA);
    },
  };
}

function getTable(editor: Editor): any {
  return editor.getBlock("table");
}

/** The table's cells as text, row by row. */
function cells(editor: Editor): string[][] {
  return getTable(editor).content.rows.map((row: any) =>
    row.cells.map((cell: any) => cell.content.map((c: any) => c.text).join("")),
  );
}

/** Types `text` at the start of the cell at `row`, `col`. */
function typeInCell(editor: Editor, row: number, col: number, text: string) {
  editor.transact((tr) => {
    let pos: number | undefined;
    let rowIndex = 0;
    tr.doc.descendants((node, nodePos) => {
      if (pos !== undefined) {
        return false;
      }
      if (node.type.name !== "tableRow") {
        return true;
      }
      if (rowIndex++ === row) {
        node.forEach((_cell, offset, index) => {
          if (index === col) {
            // Into the row, to the cell, into the cell and its paragraph.
            pos = nodePos + 1 + offset + 2;
          }
        });
      }
      return false;
    });
    tr.insertText(text, pos);
  });
}

/**
 * Opens the drag handle menu of the table, as a user does by hovering the
 * table and clicking its drag handle (jsdom has no layout to hover with).
 */
function openDragHandleMenu(editor: Editor) {
  const sideMenu = editor.getExtension(SideMenuExtension)!;
  sideMenu.store.setState({
    show: true,
    referencePos: editor.prosemirrorView.dom.getBoundingClientRect(),
    block: getTable(editor),
  });
  sideMenu.freezeMenu();
  return sideMenu;
}

it.each([
  { header: "headerRows", row: 0, col: 1 },
  { header: "headerCols", row: 1, col: 0 },
] as const)(
  "keeps a collaborator's text when toggling $header from the drag handle menu",
  ({ header, row, col }) => {
    const { a, b, sync } = twoUsers();
    const sideMenu = openDragHandleMenu(a);

    typeInCell(b, row, col, "typed");
    sync();
    expect(cells(a)[row][col]).toBe("typed");

    // What the "Header row" / "Header column" menu items do on click.
    const table: any = sideMenu.store.state!.block;
    a.updateBlock(table, { content: { ...table.content, [header]: 1 } });
    sync();

    for (const editor of [a, b]) {
      expect(cells(editor)[row][col]).toBe("typed");
      expect(getTable(editor).content[header]).toBe(1);
    }
  },
);
