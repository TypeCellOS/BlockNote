import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { alignBlocks } from "../alignment/alignBlocks.js";
import { BlockTree } from "../util/blocks/tree.js";
import { blockToText } from "../util/blocks/text.js";
import type { LensBlock } from "../model.js";
import { markdownFormat } from "../formats/markdown.js";
import { plainTextFormat } from "../formats/plainText.js";
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
  const { rows, kept, warnings } = correspond(
    {
      projection,
      incoming: textBlocks,
      alignment: alignBlocks(projection.view, textBlocks),
    },
    new BlockTree(document),
  );
  return {
    rows: rows.map((row, j) => [
      row.kind,
      row.kind === "skipped" ? undefined : row.id,
      blockToText(textBlocks[j].block),
    ]),
    kept: [...kept],
    warnings,
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
        // A new block gets its ID later, in the tree build (`buildTree`).
        ["new", undefined, "Delta"],
        ["kept", "b", "Beta, changed"],
      ],
      // Block c is not in the text: it goes.
      kept: ["a", "b"],
      warnings: [],
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

  it("replaces a multi-part block if the text breaks its parts apart", () => {
    // Plain text shows a code block with a blank line as two paragraphs.
    const code = {
      id: "code",
      type: "codeBlock",
      content: "const a = 1;\n\nconst longer = 2;",
    } satisfies PartialBlock;

    expect(
      tableOf([code], plainTextFormat, "const longer = 2;\n\nconst a = 1;\n"),
    ).toEqual({
      // The text block with the largest part keeps the ID.
      rows: [
        ["new", "code", "const longer = 2;"],
        ["new", undefined, "const a = 1;"],
      ],
      kept: [],
      warnings: [{ type: "multi-part-block-replaced", id: "code" }],
    });
  });
});
