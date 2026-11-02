import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  markdownFormat,
  plainTextFormat,
} from "./index.js";
import { richDocument } from "./testUtil/fixtures.js";

/**
 * Benchmarks for a document with about 1000 blocks: 60 copies of the rich
 * test document. Run them with `vp test bench`.
 */

function largeDocument(copies: number): PartialBlock[] {
  const blocks: PartialBlock[] = [];
  for (let copy = 0; copy < copies; copy++) {
    for (const block of richDocument) {
      blocks.push(
        JSON.parse(
          JSON.stringify(block).replace(/"id":"([^"]+)"/g, `"id":"$1-${copy}"`),
        ),
      );
    }
  }
  return blocks;
}

const editor = BlockNoteEditor.create({ initialContent: largeDocument(60) });

for (const [name, format] of [
  ["markdown", markdownFormat],
  ["plain text", plainTextFormat],
] as const) {
  describe(name, () => {
    const text = getDocumentText(editor, format);
    const edited = text.replace("Last paragraph", "Last paragraph, edited");

    it("reads and writes back the text", async ({ bench }) => {
      await bench.compare(
        bench("read the text", () => {
          getDocumentText(editor, format);
        }),
        // The added newline prevents the shortcut for equal text.
        bench("write back the same text", () => {
          computeTextUpdate(editor, { format, text: `${text}\n` });
        }),
        bench("write back text with one changed paragraph", () => {
          computeTextUpdate(editor, { format, text: edited });
        }),
        // Few runs: the runs do not let the event loop turn. Thus, jsdom
        // keeps each markdown render in memory (see the README), and many
        // runs use all of the heap.
        { iterations: 5, time: 0, warmupIterations: 1, warmupTime: 0 },
      );
    });
  });
}
