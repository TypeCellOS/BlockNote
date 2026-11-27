import { partialBlocksToBlocksForTesting } from "@shared/formatConversionTestUtil.js";
import { describe, expect } from "vite-plus/test";

import { useFileTestEditor } from "../support/testEditorOptions.js";
import { testOptionsHost } from "../support/testOptions.js";
import type { CoreExportCase } from "./export/exportTestInstances.js";
import { prepareConversionBlocks } from "./prepareConversionBlocks.js";

const it = useFileTestEditor();

type Blocks = CoreExportCase["content"];

type RoundTripCase = {
  name: string;
  input: Blocks;
  output?: Blocks;
  markdown?: string;
};

const struckItalic = {
  type: "text",
  text: "Struck",
  styles: { italic: true, strike: true },
} as const;
const italic = {
  type: "text",
  text: "Italic",
  styles: { italic: true },
} as const;

const spacedLink = {
  type: "link",
  content: "Link",
  href: "https://example.com/my file.pdf",
} as const;
const spacedImage = {
  type: "image",
  props: { url: "https://example.com/my image.png", name: "Example" },
} as const;
const spacedVideo = {
  type: "video",
  props: { url: "https://example.com/my video.mp4", name: "Example" },
} as const;

const blockEdges: Blocks = [
  { type: "heading", content: "Heading\n" },
  { type: "bulletListItem", content: "\nBullet List Item" },
  { type: "numberedListItem", content: "Numbered List Item\n" },
  { type: "checkListItem", content: "Check List Item\n" },
  { type: "quote", content: "Quote\n" },
];
const listItems: Blocks = [
  {
    type: "bulletListItem",
    content: "Bullet 1\nBullet 2",
    children: [{ type: "bulletListItem", content: "Nested 1\nNested 2" }],
  },
  { type: "numberedListItem", content: "Numbered 1\nNumbered 2" },
  { type: "checkListItem", content: "Check 1\nCheck 2" },
];

function tableText(text: string) {
  return [{ type: "text" as const, text, styles: {} }];
}

describe("Markdown export and reimport", () => {
  it.for<RoundTripCase>([
    {
      name: "keeps spaces on both sides of inline code",
      input: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: " Code text ", styles: { code: true } },
          ],
        },
      ],
    },
    {
      name: "keeps adjacent italic runs with different styles",
      input: [
        { type: "paragraph", content: [struckItalic, italic] },
        {
          type: "paragraph",
          content: [
            italic,
            {
              type: "text",
              text: "Underlined",
              styles: { italic: true, underline: true },
            },
          ],
        },
      ],
      markdown: "*~~Struck~~Italic*\n\n*ItalicUnderlined*\n",
      // Markdown drops underline, leaving a single italic run.
      output: [
        { type: "paragraph", content: [struckItalic, italic] },
        {
          type: "paragraph",
          content: [{ ...italic, text: "ItalicUnderlined" }],
        },
      ],
    },
    {
      name: "preserves parentheses and non-breaking spaces in link destinations",
      input: [
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              content: "Parentheses",
              href: "https://example.com/wiki/Page_(topic)",
            },
            " and ",
            {
              type: "link",
              content: "Non-breaking space",
              href: "https://example.com/my\u00a0file.pdf",
            },
          ],
        },
      ],
    },
    {
      name: "preserves spaces in link, image, and video destinations",
      input: [
        { type: "paragraph", content: [spacedLink] },
        spacedImage,
        spacedVideo,
      ],
      output: [
        { type: "paragraph", content: [spacedLink] },
        {
          // Images are read via the HTML image's resolved src.
          ...spacedImage,
          props: {
            ...spacedImage.props,
            url: "https://example.com/my%20image.png",
          },
        },
        spacedVideo,
      ],
    },
    {
      name: "keeps backslashes in media destinations",
      input: [
        {
          type: "image",
          props: { url: "\\\\server\\share\\image.png", name: "Example" },
        },
        {
          type: "video",
          props: { url: "C:\\videos\\_old\\video.mp4", name: "Example" },
        },
      ],
    },
    {
      name: "keeps a link with a space in its destination inside its table cell",
      input: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: [[spacedLink], "Cell 2"] }],
          },
        },
      ],
    },
    {
      name: "keeps hard breaks inside header and body cells",
      input: [
        {
          type: "table",
          content: {
            type: "tableContent",
            headerRows: 1,
            rows: [
              { cells: [tableText("Header 1\nLine 2"), "Header 2"] },
              { cells: [tableText("Cell 1\nLine 2"), "Cell 2"] },
            ],
          },
        },
      ],
    },
    {
      name: "keeps hard breaks at the edges of cells in a headerless table",
      input: [
        {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: [tableText("\nCell 1"), tableText("Cell 2\n")] }],
          },
        },
      ],
    },
    {
      name: "preserves hard breaks at the edges of headings, lists and quotes",
      input: [
        ...blockEdges,
        {
          type: "toggleListItem",
          content: "Toggle List Item\n",
          children: [{ type: "paragraph", content: "Child Paragraph\n" }],
        },
      ],
      markdown: [
        "# Heading<br>",
        "",
        "* <br>Bullet List Item",
        "",
        "1. Numbered List Item<br>",
        "",
        "* [ ] Check List Item<br>",
        "",
        "> Quote<br>",
        "",
        "* Toggle List Item<br>",
        "",
        "  Child Paragraph<br>",
        "",
      ].join("\n"),
      // Markdown has no toggle, so it comes back as a bullet list item.
      output: [
        ...blockEdges,
        {
          type: "bulletListItem",
          content: "Toggle List Item\n",
          children: [{ type: "paragraph", content: "Child Paragraph\n" }],
        },
      ],
    },
    {
      name: "keeps the hard break before trailing whitespace",
      input: [{ type: "paragraph", content: "Paragraph\n " }],
      output: [{ type: "paragraph", content: "Paragraph\n" }],
    },
    {
      name: "preserves internal hard breaks in headings",
      input: [{ type: "heading", content: "Line 1\nLine 2" }],
    },
    {
      name: "keeps literal text next to hard breaks and inline delimiters",
      input: [
        { type: "paragraph", content: "A\n B" },
        { type: "quote", content: "A\n B" },
        { type: "heading", content: "A\n ###" },
        {
          type: "paragraph",
          content: [
            "`",
            { type: "text", text: "x", styles: { code: true } },
            "`",
          ],
        },
        {
          type: "paragraph",
          content: [
            { ...struckItalic, text: "a" },
            " ",
            { ...italic, text: "*" },
          ],
        },
      ],
    },
    {
      name: "keeps literal pipes and backslashes inside the same table cell",
      input: [
        {
          type: "table",
          content: {
            type: "tableContent",
            headerRows: 1,
            headerCols: 1,
            rows: [{ cells: [tableText("a\\|b\nc"), "d"] }],
          },
        },
      ],
    },
    {
      name: "preserves internal hard breaks in list items and their children",
      input: [
        ...listItems,
        {
          type: "toggleListItem",
          content: "Toggle",
          children: [{ type: "paragraph", content: "Child 1\nChild 2" }],
        },
      ],
      output: [
        ...listItems,
        {
          type: "bulletListItem",
          content: "Toggle",
          children: [{ type: "paragraph", content: "Child 1\nChild 2" }],
        },
      ],
    },
    {
      name: "preserves the hierarchy of checklists with nested items containing hard breaks",
      input: [
        {
          type: "checkListItem",
          content: "Check A",
          children: [
            {
              type: "bulletListItem",
              content: "Bullet 1\nBullet 2",
              children: [
                { type: "bulletListItem", content: "Nested 1\nNested 2" },
              ],
            },
            { type: "checkListItem", content: "Check 1\nCheck 2" },
          ],
        },
        {
          type: "checkListItem",
          content: "Check B",
          children: [
            { type: "numberedListItem", content: "Numbered 1\nNumbered 2" },
          ],
        },
        {
          type: "checkListItem",
          content: "Check C",
          children: [
            {
              type: "bulletListItem",
              content: "a",
              children: [
                {
                  type: "bulletListItem",
                  content: "b",
                  children: [{ type: "bulletListItem", content: "c\nd" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ])("$name", ({ input, output = input, markdown }, { editor }) => {
    const exported = editor.blocksToMarkdownLossy(
      prepareConversionBlocks(input),
    );
    if (markdown !== undefined) {
      expect(exported).toBe(markdown);
    }

    const expected = partialBlocksToBlocksForTesting(
      editor.schema,
      prepareConversionBlocks(output),
    );
    (testOptionsHost.__TEST_OPTIONS ??= {}).mockID = 0;
    expect(editor.tryParseMarkdownToBlocks(exported)).toStrictEqual(expected);
  });
});

describe("Markdown import", () => {
  it.for<{ name: string; markdown: string; output: Blocks }>([
    {
      name: "reads indented list continuations as child paragraphs",
      markdown: "- a\n  b\n1. **Title**\n   Description",
      output: [
        {
          type: "bulletListItem",
          content: "a",
          children: [{ type: "paragraph", content: "b" }],
        },
        {
          type: "numberedListItem",
          content: [{ type: "text", text: "Title", styles: { bold: true } }],
          children: [{ type: "paragraph", content: "Description" }],
        },
      ],
    },
    {
      name: "strips tabs and spaces at the start of paragraph continuation lines",
      markdown: "aaa\n      bbb\n\tccc",
      output: [{ type: "paragraph", content: "aaa\nbbb\nccc" }],
    },
  ])("$name", ({ markdown, output }, { editor }) => {
    const expected = partialBlocksToBlocksForTesting(
      editor.schema,
      prepareConversionBlocks(output),
    );
    (testOptionsHost.__TEST_OPTIONS ??= {}).mockID = 0;
    expect(editor.tryParseMarkdownToBlocks(markdown)).toStrictEqual(expected);
  });
});
