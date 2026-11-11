import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../defaultBlocks.js";

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

describe("a file link with a caption", () => {
  const editor = BlockNoteEditor.create();
  const props = {
    url: "https://example.com/a.pdf",
    name: "a.pdf",
    caption: "The caption",
  };
  const formats = [
    {
      name: "HTML",
      roundTrip: (block: PartialBlock) =>
        editor.tryParseHTMLToBlocks(editor.blocksToHTMLLossy([block])),
    },
    {
      name: "markdown",
      roundTrip: (block: PartialBlock) =>
        editor.tryParseMarkdownToBlocks(editor.blocksToMarkdownLossy([block])),
    },
  ];

  // Before, the export gave the link and the caption as two paragraphs.
  it.each(formats)(
    "reads a file block back as one file block, in $name",
    ({ roundTrip }) => {
      const blocks = roundTrip({ type: "file", props });
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("file");
      expect(blocks[0].props).toMatchObject(props);
    },
  );

  // A figure with only a link does not tell the block type, thus these
  // blocks read back as file blocks, with their URL, name and caption.
  it.each(
    formats.flatMap((format) =>
      (["image", "video", "audio"] as const).map((type) => ({
        ...format,
        type,
      })),
    ),
  )(
    "reads a $type block without a preview back as one file block, in $name",
    ({ roundTrip, type }) => {
      const blocks = roundTrip({
        type,
        props: { ...props, showPreview: false },
      });
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("file");
      expect(blocks[0].props).toMatchObject(props);
    },
  );

  it("reads a figure with a link and without a caption as a paragraph", () => {
    // The export of a file block without a caption is a link in a paragraph,
    // which the parse reads as a paragraph. A figure without a caption gives
    // the same block, thus a second round trip gives the same text.
    const blocks = editor.tryParseHTMLToBlocks(
      `<figure><a href="${props.url}">a.pdf</a></figure>`,
    );
    expect(blocks.map((block) => block.type)).toEqual(["paragraph"]);
  });

  it("reads a link without a name back with an empty name", () => {
    const blocks = editor.tryParseHTMLToBlocks(
      editor.blocksToHTMLLossy([
        { type: "file", props: { ...props, name: "" } },
      ]),
    );
    expect(blocks[0].props).toMatchObject({ ...props, name: "" });
  });
});
