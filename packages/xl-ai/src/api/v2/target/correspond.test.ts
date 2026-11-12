import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { alignBlocks } from "../alignment/alignBlocks.js";
import { BlockIndex } from "../util/blocks/blockIndex.js";
import { blockToText } from "../util/blocks/text.js";
import type { LensBlock } from "../model.js";
import { markdownFormat } from "../formats/markdown.js";
import type { TextFormat } from "../formats/types.js";
import { projectDocument } from "../projection/projectDocument.js";
import { textBlocksOf } from "../testUtil/stages.js";
import { correspond } from "./correspond.js";

/** The correspondence of a text with a document, with each row as [kind, ID, text of the text block]. */
function tableOf(
  initialContent: PartialBlock[],
  format: TextFormat,
  text: string,
) {
  const editor = BlockNoteEditor.create({ initialContent });
  const document = editor.document as LensBlock[];
  const projection = projectDocument(editor, format, document);
  const textBlocks = textBlocksOf(editor, format, text, projection.view);
  const { rows, kept } = correspond(
    {
      projection,
      incoming: textBlocks,
      alignment: alignBlocks(projection.view, textBlocks),
    },
    new BlockIndex(document),
  );
  return {
    rows: rows.map((row, j) => [
      row.kind,
      row.kind === "kept" ? row.id : undefined,
      blockToText(textBlocks[j].block),
    ]),
    kept: [...kept],
  };
}

describe("correspond", () => {
  it("gives a row for each text block: kept or new", () => {
    expect(
      tableOf(
        [
          { id: "a", type: "paragraph", content: "Alpha" },
          { id: "b", type: "paragraph", content: "Beta" },
          { id: "c", type: "paragraph", content: "Gamma" },
        ],
        markdownFormat,
        "Alpha\n\nDelta\n\nBeta, changed\n",
      ),
    ).toEqual({
      rows: [
        ["kept", "a", "Alpha"],
        // A new block gets its ID later, in the build of the target
        // (`buildTargetDocument`).
        ["new", undefined, "Delta"],
        ["kept", "b", "Beta, changed"],
      ],
      // Block c is not in the text: it goes.
      kept: ["a", "b"],
    });
  });

  it("keeps an invisible block", () => {
    expect(
      tableOf(
        [
          { id: "a", type: "paragraph", content: "Alpha" },
          // Markdown does not show an image without a URL.
          { id: "image", type: "image" },
          { id: "b", type: "paragraph", content: "Beta" },
        ],
        markdownFormat,
        "Alpha, changed\n\nBeta\n",
      ).kept,
    ).toEqual(["a", "b", "image"]);
  });
});
