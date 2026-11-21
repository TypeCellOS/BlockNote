import { describe, expect } from "vite-plus/test";

describe("external HTML of a file block without a caption", () => {
  // The export was a link alone. A link is inline content: the HTML parse
  // joined two adjacent links into one paragraph.
  it("keeps two adjacent file blocks as two blocks", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();

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
