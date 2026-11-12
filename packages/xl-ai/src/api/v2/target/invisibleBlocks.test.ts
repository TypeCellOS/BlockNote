import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { alignBlocks } from "../alignment/alignBlocks.js";
import { BlockIndex } from "../util/blocks/blockIndex.js";
import type { LensBlock } from "../model.js";
import { markdownFormat } from "../formats/markdown.js";
import type { TextFormat } from "../formats/types.js";
import { projectDocument } from "../projection/projectDocument.js";
import { textBlocksOf } from "../testUtil/stages.js";
import { withInvisibleBlocks } from "./invisibleBlocks.js";

/** The source blocks that stay after a write of `text` (see `withInvisibleBlocks`). */
function keptAfter(
  initialContent: PartialBlock[],
  format: TextFormat,
  text: string,
): string[] {
  const editor = BlockNoteEditor.create({ initialContent });
  const document = editor.document as LensBlock[];
  const projection = projectDocument(
    editor,
    format,
    document,
    format.serialize(editor, document),
  );
  const textBlocks = textBlocksOf(editor, format, text, projection.view);
  const pairs = alignBlocks(projection.view, textBlocks);
  return [
    ...withInvisibleBlocks(
      new BlockIndex(document),
      projection.invisibleIds,
      pairs.map(({ aIndex }) => projection.view[aIndex].sourceId),
    ),
  ];
}

describe("withInvisibleBlocks", () => {
  it("keeps the source blocks of the pairs, and no other visible block", () => {
    // Block c is not in the text: it goes.
    expect(
      keptAfter(
        [
          { id: "a", type: "paragraph", content: "Alpha" },
          { id: "b", type: "paragraph", content: "Beta" },
          { id: "c", type: "paragraph", content: "Gamma" },
        ],
        markdownFormat,
        "Alpha\n\nDelta\n\nBeta, changed\n",
      ),
    ).toEqual(["a", "b"]);
  });

  it("keeps an invisible block", () => {
    expect(
      keptAfter(
        [
          { id: "a", type: "paragraph", content: "Alpha" },
          // Markdown does not show an image without a URL.
          { id: "image", type: "image" },
          { id: "b", type: "paragraph", content: "Beta" },
        ],
        markdownFormat,
        "Alpha, changed\n\nBeta\n",
      ),
    ).toEqual(["a", "b", "image"]);
  });
});
