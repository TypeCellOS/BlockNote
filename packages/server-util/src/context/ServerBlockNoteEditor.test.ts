import { Block } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";
import { useServerDOM } from "../../testServerDOM.js";
import { ServerBlockNoteEditor } from "./ServerBlockNoteEditor.js";

describe("Test ServerBlockNoteEditor", () => {
  useServerDOM();
  const editor = ServerBlockNoteEditor.create();

  const blocks: Block[] = [
    {
      id: "1",
      type: "heading",
      props: {
        backgroundColor: "blue",
        textColor: "yellow",
        textAlignment: "right",
        level: 2,
        isToggleable: false,
      },
      content: [
        {
          type: "text",
          text: "Heading ",
          styles: {
            bold: true,
            underline: true,
          },
        },
        {
          type: "text",
          text: "2",
          styles: {
            italic: true,
            strike: true,
          },
        },
      ],
      children: [
        {
          id: "2",
          type: "paragraph",
          props: {
            backgroundColor: "red",
            textAlignment: "left",
            textColor: "default",
          },
          content: [
            {
              type: "text",
              text: "Paragraph",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "3",
          type: "bulletListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "list item",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
    {
      id: "4",
      type: "image",
      props: {
        backgroundColor: "default",
        textAlignment: "left",
        name: "Example",
        url: "exampleURL",
        caption: "Caption",
        showPreview: true,
        previewWidth: 256,
      },
      content: undefined,
      children: [],
    },
    {
      id: "5",
      type: "image",
      props: {
        backgroundColor: "default",
        textAlignment: "left",
        name: "Example",
        url: "exampleURL",
        caption: "Caption",
        showPreview: false,
        previewWidth: 256,
      },
      content: undefined,
      children: [],
    },
  ];

  it("converts to and from HTML (blocksToHTMLLossy)", async () => {
    const html = await editor.blocksToHTMLLossy(blocks);
    expect(html).toMatchSnapshot();

    const blockOutput = await editor.tryParseHTMLToBlocks(html);
    expect(blockOutput).toMatchSnapshot();
  });

  it("converts to HTML (blocksToFullHTML)", async () => {
    const html = await editor.blocksToFullHTML(blocks);
    expect(html).toMatchSnapshot();
  });

  it("exports file links while preserving stored URLs", async () => {
    const fileEditor = ServerBlockNoteEditor.create();
    try {
      const input = [
        {
          id: "file",
          type: "file" as const,
          props: { url: "https://example.com/report.pdf" },
        },
      ];
      const html = await fileEditor.blocksToFullHTML(input);
      expect(html).toContain('href="https://example.com/report.pdf"');
      const parsed = await fileEditor.tryParseHTMLToBlocks(html);
      expect(parsed[0]).toMatchObject(input[0]);
    } finally {
      fileEditor.editor._tiptapEditor.destroy();
    }
  });

  it("converts to and from markdown (blocksToMarkdownLossy)", async () => {
    const md = await editor.blocksToMarkdownLossy(blocks);
    expect(md).toMatchSnapshot();

    const blockOutput = await editor.tryParseMarkdownToBlocks(md);
    expect(blockOutput).toMatchSnapshot();
  });
});
