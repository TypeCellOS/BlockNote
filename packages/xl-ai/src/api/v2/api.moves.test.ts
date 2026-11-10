import { describe, expect, it } from "vite-plus/test";

import { updateDocument } from "./index.js";
import type { LensBlock } from "./model.js";
import { createEditor } from "./testUtil/fixtures.js";

describe("a move by the client and an insert by another writer next to the moved block", () => {
  it("puts the block at the place of the client, and keeps the new block of the other writer", () => {
    const editor = createEditor([
      { id: "a", type: "paragraph", content: "A" },
      { id: "x", type: "paragraph", content: "X" },
      { id: "b", type: "paragraph", content: "B" },
      { id: "c", type: "paragraph", content: "C" },
    ]);
    const base = structuredClone(editor.document) as LensBlock[];
    // Another writer inserts Y before X.
    editor.insertBlocks(
      [{ id: "y", type: "paragraph", content: "Y" }],
      "x",
      "before",
    );

    // The client read the base, and moves X to the end.
    const [a, x, b, c] = base;
    const result = updateDocument(editor, {
      document: [a, b, c, x],
      base,
    });

    expect(result.error).toBeUndefined();
    expect(editor.document.map((block) => block.id)).toEqual([
      "a",
      "y",
      "b",
      "c",
      "x",
    ]);
  });
});
