/**
 * @vitest-environment jsdom
 */
import * as Y from "@y/y";
import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";

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
        fragment: doc.get("doc"),
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

function table(rows: string[][]) {
  return {
    id: "table",
    type: "table",
    content: { type: "tableContent", rows: rows.map((cells) => ({ cells })) },
  } as any;
}

/** The table's cells as text, row by row. */
function cells(blocks: any[]): string[][] {
  const block = blocks.find((b) => b.type === "table");
  return block.content.rows.map((row: any) =>
    row.cells.map((cell: any) =>
      (cell.content ?? cell).map((c: any) => c.text).join(""),
    ),
  );
}

/** Two users editing copies of a 2×2 table, synced on demand. */
function twoUsers() {
  const docA = new Y.Doc({ gc: false });
  docA.clientID = 1;
  const seed = BlockNoteEditor.create();
  seed.replaceBlocks(seed.document, [
    table([
      ["A1", "B1"],
      ["A2", "B2"],
    ]),
  ]);
  blocksToYType(seed, seed.document, docA.get("doc"));
  const docB = new Y.Doc({ gc: false });
  docB.clientID = 2;
  Y.applyUpdateV2(docB, Y.encodeStateAsUpdateV2(docA));
  return {
    docA,
    a: collaborativeEditor(docA),
    b: collaborativeEditor(docB),
    sync: () => {
      const toB = Y.encodeStateAsUpdateV2(docA, Y.encodeStateVector(docB));
      const toA = Y.encodeStateAsUpdateV2(docB, Y.encodeStateVector(docA));
      Y.applyUpdateV2(docB, toB);
      Y.applyUpdateV2(docA, toA);
    },
  };
}

const grown = [
  ["A1", "B1", "C1"],
  ["A2", "B2", "C2"],
  ["A3", "B3", "C3"],
];

it("stores a table that one edit reshapes in two directions", () => {
  const { a, b, docA, sync } = twoUsers();
  a.updateBlock("table", table(grown));
  sync();
  expect(cells(b.document)).toEqual(grown);
  expect(cells(yDocToBlocks(BlockNoteEditor.create(), docA, "doc"))).toEqual(
    grown,
  );
});

it("keeps a concurrent cell edit when a different user reshapes the table", () => {
  const { a, b, sync } = twoUsers();
  a.updateBlock("table", table(grown));
  b.updateBlock(
    "table",
    table([
      ["A1", "B1"],
      ["A2", "B2 edited"],
    ]),
  );
  sync();
  expect(cells(a.document)[1][1]).toBe("B2 edited");
  expect(cells(b.document)).toEqual(cells(a.document));
});

it("merges two concurrent reshapes into the same rectangular table", () => {
  const { a, b, sync } = twoUsers();
  a.updateBlock("table", table(grown));
  b.updateBlock("table", table([["A1"]]));
  sync();
  const merged = cells(a.document);
  expect(cells(b.document)).toEqual(merged);
  expect(new Set(merged.map((row) => row.length)).size).toBe(1);
});
