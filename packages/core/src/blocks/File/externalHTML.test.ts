import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

describe("file links in external HTML", () => {
  const editor = BlockNoteEditor.create();

  it("keeps two adjacent file blocks without a caption apart", () => {
    const html = editor.blocksToHTMLLossy([
      { type: "file", props: { url: "https://example.com/a.pdf", name: "a" } },
      { type: "file", props: { url: "https://example.com/b.pdf", name: "b" } },
    ]);
    // A link alone is inline content: the parser would join the two links
    // into one paragraph.
    expect(editor.tryParseHTMLToBlocks(html)).toHaveLength(2);
  });

  it.each(["image", "video", "audio"] as const)(
    "keeps two adjacent %s blocks without a preview and a caption apart",
    (type) => {
      const block = (url: string) => ({
        type,
        props: { url, showPreview: false },
      });
      const html = editor.blocksToHTMLLossy([
        block("https://example.com/a"),
        block("https://example.com/b"),
      ]);
      expect(editor.tryParseHTMLToBlocks(html)).toHaveLength(2);
    },
  );
});
