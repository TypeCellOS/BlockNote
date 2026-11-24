import * as Y from "@y/y";
import { expect, type TestContext } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import { blocksToYType, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";

async function collaborativeEditor(setupEditor: SetupEditor, doc: Y.Doc) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
      },
    }),
  });
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
async function twoUsers(
  setupEditor: SetupEditor,
  onTestFinished: TestContext["onTestFinished"],
) {
  const docA = new Y.Doc({ gc: false });
  onTestFinished(() => docA.destroy());
  docA.clientID = 1;
  const { editor: seed } = await setupEditor({
    mountType: false,
    initialContent: [
      table([
        ["A1", "B1"],
        ["A2", "B2"],
      ]),
    ],
  });
  blocksToYType(seed, seed.document, docA.get("doc"));
  const docB = new Y.Doc({ gc: false });
  onTestFinished(() => docB.destroy());
  docB.clientID = 2;
  Y.applyUpdateV2(docB, Y.encodeStateAsUpdateV2(docA));
  return {
    docA,
    a: await collaborativeEditor(setupEditor, docA),
    b: await collaborativeEditor(setupEditor, docB),
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

export function registerTableReshapeCases() {
  it("stores a table that one edit reshapes in two directions", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { a, b, docA, sync } = await twoUsers(setupEditor, onTestFinished);
    a.updateBlock("table", table(grown));
    sync();
    expect(cells(b.document)).toEqual(grown);
    expect(cells(yDocToBlocks(a, docA, "doc"))).toEqual(grown);
  });

  it("keeps a concurrent cell edit when a different user reshapes the table", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { a, b, sync } = await twoUsers(setupEditor, onTestFinished);
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

  it("merges two concurrent reshapes into the same rectangular table", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { a, b, sync } = await twoUsers(setupEditor, onTestFinished);
    a.updateBlock("table", table(grown));
    b.updateBlock("table", table([["A1"]]));
    sync();
    const merged = cells(a.document);
    expect(cells(b.document)).toEqual(merged);
    expect(new Set(merged.map((row) => row.length)).size).toBe(1);
  });
}
