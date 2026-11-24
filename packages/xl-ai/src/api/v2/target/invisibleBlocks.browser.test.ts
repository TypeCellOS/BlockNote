import { type PartialBlock } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";
import type { SetupEditor } from "../../../../../../tests/src/commands/browser/setupEditor.js";

import { alignBlocks } from "../alignment/alignBlocks.js";
import { BlockIndex } from "../util/blocks/blockIndex.js";
import type { LensBlock } from "../model.js";
import { markdownFormat } from "../formats/markdown.js";
import type { TextFormat } from "../formats/types.js";
import { projectDocument } from "../projection/projectDocument.js";
import { textBlocksOf } from "../testUtil/stages.js";
import { stayingBlockIds } from "./invisibleBlocks.js";

/** The source blocks that stay after a write of `text` (see `stayingBlockIds`). */
async function keptAfter(
  setupEditor: SetupEditor,
  initialContent: PartialBlock[],
  format: TextFormat,
  text: string,
): Promise<string[]> {
  const { editor } = await setupEditor({ mountType: false, initialContent });
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
    ...stayingBlockIds(
      new BlockIndex(document),
      projection.invisibleIds,
      pairs.map(({ aIndex }) => projection.view[aIndex].sourceId),
    ),
  ];
}

describe("stayingBlockIds", () => {
  it("keeps the source blocks of the pairs, and no other visible block", async ({
    setupEditor,
  }) => {
    // Block c is not in the text: it goes.
    expect(
      await keptAfter(
        setupEditor,
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

  it("keeps an invisible block", async ({ setupEditor }) => {
    expect(
      await keptAfter(
        setupEditor,
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
