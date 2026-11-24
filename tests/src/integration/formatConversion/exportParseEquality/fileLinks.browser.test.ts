import { BlockNoteSchema, cleanHTMLToMarkdown } from "@blocknote/core";
import { ReactFileBlock } from "@blocknote/react";
import { describe, expect } from "vite-plus/test";

describe("Lossy HTML round-trip for file blocks", () => {
  it.for([
    { name: "Core", schema: BlockNoteSchema.create() },
    {
      name: "React",
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { file: ReactFileBlock() },
      }),
    },
  ])(
    "$name: keeps adjacent captionless files in separate paragraphs",
    async ({ schema }, { setupEditor }) => {
      const { editor } = await setupEditor({ mountType: false, schema });

      const html = editor.blocksToHTMLLossy([
        {
          type: "file",
          props: { url: "https://example.com/a.pdf", name: "a" },
        },
        {
          type: "file",
          props: { url: "https://example.com/b.pdf", name: "b" },
        },
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
    },
  );
});

describe("external HTML of a file block with a caption", () => {
  const url = "https://example.com/a.pdf";
  const htmlCharacters = {
    url: `${url}?a="1"&b=<2>`,
    name: `<b>a</b> & "b".pdf`,
    caption: `<i>Text</i> & "more"`,
  };

  // The export was a `div` with the link and the caption in a paragraph. The
  // HTML parse and the markdown parse read that as two paragraphs.
  it.for([
    { format: "HTML", title: "a name", props: { name: "a.pdf" } },
    { format: "HTML", title: "no name", props: { name: "" } },
    { format: "HTML", title: "HTML characters", props: htmlCharacters },
    { format: "markdown", title: "a name", props: { name: "a.pdf" } },
    { format: "markdown", title: "no name", props: { name: "" } },
    { format: "markdown", title: "HTML characters", props: htmlCharacters },
  ] as const)(
    "reads back as the same block from $format, with $title",
    async ({ format, props: caseProps }, { setupEditor }) => {
      const { editor } = await setupEditor({ mountType: false });
      const props = { url, caption: "Text", ...caseProps };

      const blocks =
        format === "HTML"
          ? editor.tryParseHTMLToBlocks(
              editor.blocksToHTMLLossy([{ type: "file", props }]),
            )
          : editor.tryParseMarkdownToBlocks(
              editor.blocksToMarkdownLossy([{ type: "file", props }]),
            );

      expect(blocks).toMatchObject([{ type: "file", props }]);
    },
  );

  it.for([
    {
      figure: "white space and a comment",
      html: `<figure>
        <a href="a.pdf">
          Name
        </a>
        <!-- A comment -->
        <figcaption>Text</figcaption>
      </figure>`,
      props: { url: "a.pdf", name: "Name", caption: "Text" },
    },
    {
      figure: "a background color",
      html: `<figure style="background-color: red"><a href="a.pdf">Name</a><figcaption>Text</figcaption></figure>`,
      props: {
        url: "a.pdf",
        name: "Name",
        caption: "Text",
        backgroundColor: "red",
      },
    },
    {
      figure: "the URL as link text on its own line",
      html: `<figure><a href="${url}">
        ${url}
      </a><figcaption>Text</figcaption></figure>`,
      props: { url, name: "", caption: "Text" },
    },
  ])(
    "reads a figure with $figure as a file block",
    async ({ html, props }, { setupEditor }) => {
      const { editor } = await setupEditor({ mountType: false });

      expect(editor.tryParseHTMLToBlocks(html)).toMatchObject([
        { type: "file", props },
      ]);
    },
  );

  // Only the form that the export writes is a file block. Each other figure
  // gives the same blocks and the same markdown as before.
  it.for([
    {
      figure: "a link that wraps an image",
      html: `<figure><a href="big.jpg"><img src="small.jpg"></a><figcaption>Text</figcaption></figure>`,
      types: ["image"],
      markdown: `<figure><img src="small.jpg"><figcaption>Text</figcaption></figure>`,
    },
    {
      figure: "a link without a caption",
      html: `<figure><a href="a.pdf">a</a></figure>`,
      types: ["paragraph"],
      markdown: "[a](a.pdf)",
    },
    {
      figure: "a link and an empty caption",
      html: `<figure><a href="a.pdf">a</a><figcaption></figcaption></figure>`,
      types: ["paragraph"],
      markdown: "[a](a.pdf)",
    },
    {
      figure: "a link without a URL",
      html: `<figure><a name="a">a</a><figcaption>Text</figcaption></figure>`,
      types: ["paragraph", "paragraph"],
      markdown: "a",
    },
    {
      figure: "a link and more text",
      html: `<figure><a href="a.pdf">a</a> and more text<figcaption>Text</figcaption></figure>`,
      types: ["paragraph", "paragraph"],
      markdown: "[a](a.pdf)",
    },
    {
      figure: "two links",
      html: `<figure><a href="a.pdf">a</a><a href="b.pdf">b</a><figcaption>Text</figcaption></figure>`,
      types: ["paragraph", "paragraph"],
      markdown: "[a](a.pdf)",
    },
    {
      figure: "the caption before the link",
      html: `<figure><figcaption>Text</figcaption><a href="a.pdf">a</a></figure>`,
      types: ["paragraph", "paragraph"],
      markdown: "[a](a.pdf)",
    },
    {
      figure: "a link in a paragraph",
      html: `<figure><p>See <a href="a.pdf">a</a> here</p><figcaption>Text</figcaption></figure>`,
      types: ["paragraph", "paragraph"],
      markdown: "[a](a.pdf)",
    },
    {
      figure: "paragraphs in the link",
      html: `<figure><a href="a.pdf"><p>One</p><p>Two</p></a><figcaption>Text</figcaption></figure>`,
      types: ["paragraph", "paragraph", "paragraph"],
      markdown: "[OneTwo](a.pdf)",
    },
    {
      figure: "a link in the caption",
      html: `<figure><a href="a.pdf">a</a><figcaption>See <a href="b.pdf">b</a></figcaption></figure>`,
      types: ["paragraph", "paragraph"],
      markdown: "[a](a.pdf)",
    },
    {
      figure: "a quote, and a link in the caption",
      html: `<figure><blockquote>Quote</blockquote><figcaption>By <a href="b.pdf">b</a></figcaption></figure>`,
      types: ["quote", "paragraph"],
      markdown: "[b](b.pdf)",
    },
  ])(
    "does not read a figure with $figure as a file block",
    async ({ html, types, markdown }, { setupEditor }) => {
      const { editor } = await setupEditor({ mountType: false });

      expect(
        editor.tryParseHTMLToBlocks(html).map((block) => block.type),
      ).toEqual(types);
      expect(cleanHTMLToMarkdown(html)).toBe(`${markdown}\n`);
    },
  );
});

describe("external HTML of a React file block with a caption", () => {
  // The export was a `div` with the link and the caption in a paragraph. The
  // HTML parse and the markdown parse read that as two paragraphs.
  it.for([
    { format: "HTML", name: "a.pdf" },
    { format: "HTML", name: "" },
    { format: "markdown", name: "a.pdf" },
    { format: "markdown", name: "" },
  ] as const)(
    "reads back as the same block from $format, with the name '$name'",
    async ({ format, name }, { setupEditor }) => {
      const { editor } = await setupEditor({
        mountType: false,
        schema: BlockNoteSchema.create().extend({
          blockSpecs: { file: ReactFileBlock() },
        }),
      });
      const props = { url: "https://example.com/a.pdf", name, caption: "Text" };

      const blocks =
        format === "HTML"
          ? editor.tryParseHTMLToBlocks(
              editor.blocksToHTMLLossy([{ type: "file", props }]),
            )
          : editor.tryParseMarkdownToBlocks(
              editor.blocksToMarkdownLossy([{ type: "file", props }]),
            );

      expect(blocks).toMatchObject([{ type: "file", props }]);
    },
  );
});

describe("markdown of a figure with a caption", () => {
  // The caption is raw HTML in markdown. An empty line in it ended the HTML
  // block: the rest of the caption became a paragraph.
  it.for(["file", "image"] as const)(
    "keeps a %s block as one block, with an empty line and HTML characters in the caption",
    async (type, { setupEditor }) => {
      const { editor } = await setupEditor({ mountType: false });
      const url = "https://example.com/a.png";

      const markdown = editor.blocksToMarkdownLossy([
        { type, props: { url, caption: "One\n\n<b>Two</b> & three" } },
      ]);

      // The HTML parse reads a line feed in text as a space.
      expect(editor.tryParseMarkdownToBlocks(markdown)).toMatchObject([
        { type, props: { url, caption: "One <b>Two</b> & three" } },
      ]);
    },
  );
});
