import { BlockNoteSchema } from "@blocknote/core";
import { describe, expect } from "vite-plus/test";

import { ReactFileBlock } from "./block.js";

describe("external HTML of a React file block without a caption", () => {
  // The export was a link alone. A link is inline content: the HTML parse
  // joined two adjacent links into one paragraph.
  it("keeps two adjacent file blocks as two blocks", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { file: ReactFileBlock() },
      }),
    });

    const html = editor.blocksToHTMLLossy([
      { type: "file", props: { url: "https://example.com/a.pdf", name: "a" } },
      { type: "file", props: { url: "https://example.com/b.pdf", name: "b" } },
    ]);

    expect(editor.tryParseHTMLToBlocks(html)).toMatchObject([
      {
        type: "paragraph",
        content: [{ type: "link", href: "https://example.com/a.pdf" }],
      },
      {
        type: "paragraph",
        content: [{ type: "link", href: "https://example.com/b.pdf" }],
      },
    ]);
  });
});
