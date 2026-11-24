import type { ExportTestCase } from "./exportTestCase.js";
import type {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../support/testSchema.js";

export type CoreExportCase = ExportTestCase<
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>;

export const exportCases: CoreExportCase[] = [
  {
    name: "paragraph/empty",
    content: [
      {
        type: "paragraph",
      },
    ],
  },
  {
    name: "paragraph/emptyBetween",
    content: [
      {
        type: "paragraph",
        content: "Before",
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: "After",
      },
    ],
  },
  {
    name: "paragraph/basic",
    content: [
      {
        type: "paragraph",
        content: "Paragraph",
      },
    ],
  },
  {
    name: "paragraph/styled",
    content: [
      {
        type: "paragraph",
        props: {
          textAlignment: "center",
          textColor: "orange",
          backgroundColor: "pink",
        },
        content: [
          {
            type: "text",
            styles: {},
            text: "Plain ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
            },
            text: "Red Text ",
          },
          {
            type: "text",
            styles: {
              backgroundColor: "blue",
            },
            text: "Blue Background ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
              backgroundColor: "blue",
            },
            text: "Mixed Colors",
          },
        ],
      },
    ],
  },
  {
    name: "paragraph/nested",
    content: [
      {
        type: "paragraph",
        content: "Paragraph",
        children: [
          {
            type: "paragraph",
            content: "Nested Paragraph 1",
          },
          {
            type: "paragraph",
            content: "Nested Paragraph 2",
          },
        ],
      },
    ],
  },
  {
    name: "paragraph/lineBreaks",
    content: [
      {
        type: "paragraph",
        content: "Line 1\nLine 2",
      },
    ],
  },
  {
    name: "lists/basic",
    content: [
      {
        type: "bulletListItem",
        content: "Bullet List Item 1",
      },
      {
        type: "bulletListItem",
        content: "Bullet List Item 2",
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item 1",
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item 2",
      },
      {
        type: "checkListItem",
        content: "Check List Item 1",
      },
      {
        type: "checkListItem",
        props: {
          checked: true,
        },
        content: "Check List Item 2",
      },
      {
        type: "toggleListItem",
        content: "Toggle List Item 1",
      },
    ],
  },
  {
    name: "lists/toggleWithChildren",
    content: [
      {
        type: "toggleListItem",
        content: "Toggle List Item",
        children: [
          {
            type: "paragraph",
            content: "Toggle Child 1",
          },
          {
            type: "paragraph",
            content: "Toggle Child 2",
          },
        ],
      },
      {
        type: "heading",
        props: {
          level: 2,
          isToggleable: true,
        },
        content: "Toggle Heading",
        children: [
          {
            type: "paragraph",
            content: "Heading Child 1",
          },
        ],
      },
    ],
  },
  {
    name: "lists/nested",
    content: [
      {
        type: "bulletListItem",
        content: "Bullet List Item 1",
      },
      {
        type: "bulletListItem",
        content: "Bullet List Item 2",
        children: [
          {
            type: "numberedListItem",
            content: "Numbered List Item 1",
          },
          {
            type: "numberedListItem",
            content: "Numbered List Item 2",
            children: [
              {
                type: "checkListItem",
                content: "Check List Item 1",
              },
              {
                type: "checkListItem",
                props: {
                  checked: true,
                },
                content: "Check List Item 2",
                children: [
                  {
                    type: "toggleListItem",
                    content: "Toggle List Item 1",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "codeBlock/empty",
    content: [
      {
        type: "codeBlock",
      },
    ],
  },
  {
    name: "codeBlock/defaultLanguage",
    content: [
      {
        type: "codeBlock",
        content: "console.log('Hello, world!');",
      },
    ],
  },
  {
    name: "codeBlock/python",
    content: [
      {
        type: "codeBlock",
        props: { language: "python" },
        content: "print('Hello, world!')",
      },
    ],
  },
  {
    name: "codeBlock/contains-newlines",
    content: [
      {
        type: "codeBlock",
        props: { language: "javascript" },
        content: "const hello = 'world';\nconsole.log(hello);\n",
      },
    ],
  },
  // Heading levels
  {
    name: "heading/h1",
    content: [
      {
        type: "heading",
        props: { level: 1 },
        content: "Heading 1",
      },
    ],
  },
  {
    name: "heading/h2",
    content: [
      {
        type: "heading",
        props: { level: 2 },
        content: "Heading 2",
      },
    ],
  },
  {
    name: "heading/h3",
    content: [
      {
        type: "heading",
        props: { level: 3 },
        content: "Heading 3",
      },
    ],
  },
  {
    name: "heading/h4",
    content: [
      {
        type: "heading",
        props: { level: 4 },
        content: "Heading 4",
      },
    ],
  },
  {
    name: "heading/h5",
    content: [
      {
        type: "heading",
        props: { level: 5 },
        content: "Heading 5",
      },
    ],
  },
  {
    name: "heading/h6",
    content: [
      {
        type: "heading",
        props: { level: 6 },
        content: "Heading 6",
      },
    ],
  },
  {
    name: "heading/styled",
    content: [
      {
        type: "heading",
        props: { level: 1 },
        content: [
          {
            type: "text",
            text: "Bold ",
            styles: { bold: true },
          },
          {
            type: "text",
            text: "Heading",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "heading/toggleable",
    content: [
      {
        type: "heading",
        props: { level: 2, isToggleable: true },
        content: "Toggle Heading",
        children: [
          {
            type: "paragraph",
            content: "Child content",
          },
        ],
      },
    ],
  },
  // Quote / Blockquote
  {
    name: "quote/basic",
    content: [
      {
        type: "quote",
        content: "This is a quote",
      },
    ],
  },
  {
    name: "quote/styled",
    content: [
      {
        type: "quote",
        content: [
          {
            type: "text",
            text: "Bold ",
            styles: { bold: true },
          },
          {
            type: "text",
            text: "and ",
            styles: {},
          },
          {
            type: "text",
            text: "italic",
            styles: { italic: true },
          },
          {
            type: "text",
            text: " quote",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "quote/withLink",
    content: [
      {
        type: "quote",
        content: [
          {
            type: "text",
            text: "Quote with ",
            styles: {},
          },
          {
            type: "link",
            href: "https://www.example.com",
            content: "a link",
          },
        ],
      },
    ],
  },
  {
    name: "quote/nested",
    content: [
      {
        type: "quote",
        content: "Parent quote",
        children: [
          {
            type: "paragraph",
            content: "Nested paragraph",
          },
        ],
      },
    ],
  },
  {
    name: "quote/multiple",
    content: [
      {
        type: "quote",
        content: "First quote",
      },
      {
        type: "quote",
        content: "Second quote",
      },
    ],
  },
  // Audio
  {
    name: "audio/basic",
    content: [
      {
        type: "audio",
        props: {
          url: "https://example.com/audio.mp3",
          name: "example",
        },
      },
    ],
  },
  {
    name: "audio/button",
    content: [
      {
        type: "audio",
      },
    ],
  },
  {
    name: "audio/noName",
    content: [
      {
        type: "audio",
        props: {
          url: "https://example.com/audio.mp3",
        },
      },
    ],
  },
  // Individual styles
  {
    name: "style/bold",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Bold text",
            styles: { bold: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/italic",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Italic text",
            styles: { italic: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/underline",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Underline text",
            styles: { underline: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/strike",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Strikethrough text",
            styles: { strike: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/code",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Inline code",
            styles: { code: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/textColor",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Colored text",
            styles: { textColor: "red" },
          },
        ],
      },
    ],
  },
  {
    name: "style/backgroundColor",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Highlighted text",
            styles: { backgroundColor: "blue" },
          },
        ],
      },
    ],
  },
  {
    name: "style/combined",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Bold and italic",
            styles: { bold: true, italic: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/boldItalicStrike",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "All styles",
            styles: { bold: true, italic: true, strike: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/mixedInParagraph",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Normal ",
            styles: {},
          },
          {
            type: "text",
            text: "bold ",
            styles: { bold: true },
          },
          {
            type: "text",
            text: "italic ",
            styles: { italic: true },
          },
          {
            type: "text",
            text: "code ",
            styles: { code: true },
          },
          {
            type: "text",
            text: "strike",
            styles: { strike: true },
          },
        ],
      },
    ],
  },
  {
    name: "style/surroundingWhitespace",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Normal",
            styles: {},
          },
          {
            type: "text",
            text: " bold",
            styles: { bold: true },
          },
          {
            type: "text",
            text: " and",
            styles: {},
          },
          {
            type: "text",
            text: " italic ",
            styles: { italic: true },
          },
          {
            type: "text",
            text: "and",
            styles: {},
          },
          {
            type: "text",
            text: " strike ",
            styles: { strike: true },
          },
          {
            type: "text",
            text: "end",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "style/adjacentItalic",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Struck",
            styles: { italic: true, strike: true },
          },
          {
            type: "text",
            text: "Italic",
            styles: { italic: true },
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Italic",
            styles: { italic: true },
          },
          {
            type: "text",
            text: "Underlined",
            styles: { italic: true, underline: true },
          },
        ],
      },
    ],
  },
  // Numbered list with custom start
  {
    name: "lists/numberedListStart",
    content: [
      {
        type: "numberedListItem",
        props: { start: 5 },
        content: "Item 5",
      },
      {
        type: "numberedListItem",
        content: "Item 6",
      },
    ],
  },
  // Multiple paragraphs
  {
    name: "paragraph/multiple",
    content: [
      {
        type: "paragraph",
        content: "First paragraph",
      },
      {
        type: "paragraph",
        content: "Second paragraph",
      },
      {
        type: "paragraph",
        content: "Third paragraph",
      },
    ],
  },
  // Mixed block types document
  {
    name: "complex/document",
    content: [
      {
        type: "heading",
        props: { level: 1 },
        content: "Document Title",
      },
      {
        type: "paragraph",
        content: "Introduction paragraph.",
      },
      {
        type: "heading",
        props: { level: 2 },
        content: "Section 1",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Text with ",
            styles: {},
          },
          {
            type: "text",
            text: "bold",
            styles: { bold: true },
          },
          {
            type: "text",
            text: " and ",
            styles: {},
          },
          {
            type: "link",
            href: "https://example.com",
            content: "a link",
          },
          {
            type: "text",
            text: ".",
            styles: {},
          },
        ],
      },
      {
        type: "bulletListItem",
        content: "First point",
      },
      {
        type: "bulletListItem",
        content: "Second point",
      },
      {
        type: "divider",
      },
      {
        type: "quote",
        content: "A notable quote",
      },
      {
        type: "codeBlock",
        props: { language: "javascript" },
        content: "const x = 42;",
      },
    ],
  },
  // Link with inline code
  {
    name: "link/withCode",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "See the ",
            styles: {},
          },
          {
            type: "link",
            href: "https://example.com",
            content: "docs",
          },
          {
            type: "text",
            text: " for ",
            styles: {},
          },
          {
            type: "text",
            text: "config",
            styles: { code: true },
          },
        ],
      },
    ],
  },
  // Image with caption
  {
    name: "image/withCaption",
    content: [
      {
        type: "image",
        props: {
          url: "https://example.com/image.png",
          name: "Example Image",
          caption: "This is a caption",
        },
      },
    ],
  },
  // Video with caption
  {
    name: "video/withCaption",
    content: [
      {
        type: "video",
        props: {
          url: "https://example.com/video.mp4",
          name: "Example Video",
          caption: "Video caption",
        },
      },
    ],
  },
  {
    name: "divider/basic",
    content: [
      {
        type: "divider",
      },
    ],
  },
  {
    name: "pageBreak/basic",
    content: [
      {
        type: "pageBreak",
      },
    ],
  },
  {
    name: "file/button",
    content: [
      {
        type: "file",
      },
    ],
  },
  {
    name: "file/basic",
    content: [
      {
        type: "file",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
        },
      },
    ],
  },
  {
    name: "file/noName",
    content: [
      {
        type: "file",
        props: {
          url: "exampleURL",
          caption: "Caption",
        },
      },
    ],
  },
  {
    name: "file/noCaption",
    content: [
      {
        type: "file",
        props: {
          name: "example",
          url: "exampleURL",
        },
      },
    ],
  },
  {
    name: "file/nested",
    content: [
      {
        type: "file",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
        },
        children: [
          {
            type: "file",
            props: {
              name: "example",
              url: "exampleURL",
              caption: "Caption",
            },
          },
        ],
      },
    ],
  },
  {
    name: "image/button",
    content: [
      {
        type: "image",
      },
    ],
  },
  {
    name: "image/basic",
    content: [
      {
        type: "image",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
          previewWidth: 256,
        },
      },
    ],
  },
  {
    name: "image/noName",
    content: [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          previewWidth: 256,
        },
      },
    ],
  },
  {
    name: "image/noCaption",
    content: [
      {
        type: "image",
        props: {
          name: "example",
          url: "exampleURL",
          previewWidth: 256,
        },
      },
    ],
  },
  // Image with only a URL — no name, no caption. Confirms markdown export
  // stays as plain `![](url)` without wrapping in a `<figure>` (the figure
  // form is only used to carry caption text through the round-trip).
  {
    name: "image/urlOnly",
    content: [
      {
        type: "image",
        props: {
          url: "exampleURL",
        },
      },
    ],
  },
  {
    name: "image/noPreview",
    content: [
      {
        type: "image",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
          showPreview: false,
          previewWidth: 256,
        },
      },
    ],
  },
  {
    name: "image/nested",
    content: [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          previewWidth: 256,
        },
        children: [
          {
            type: "image",
            props: {
              url: "exampleURL",
              caption: "Caption",
              previewWidth: 256,
            },
          },
        ],
      },
    ],
  },
  {
    name: "table/basic",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: "table/allColWidths",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [100, 200, 300],
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: "table/mixedColWidths",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [100, undefined, 300],
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: "table/mixedCellColors",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [100, undefined, 300],
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "red",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "blue",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "blue",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "yellow",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "red",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: "table/mixedRowspansAndColspans",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [100, 200, 300],
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "red",
                    colspan: 2,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "blue",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "yellow",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "red",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 2,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 2,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: "table/headerRows",
    content: [
      {
        type: "table",
        content: {
          headerRows: 1,
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: "table/headerCols",
    content: [
      {
        type: "table",
        content: {
          headerCols: 1,
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Table Cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: header rows + header cols together
  {
    name: "table/headerRowsAndCols",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          headerRows: 1,
          headerCols: 1,
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Corner"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Column Header 1"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Column Header 2"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Row Header 1"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Data 1"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Data 2"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: styled content in cells
  {
    name: "table/styledCellContent",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Bold",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Italic",
                      styles: { italic: true },
                    },
                  ],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Strike",
                      styles: { strike: true },
                    },
                  ],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Code",
                      styles: { code: true },
                    },
                  ],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: links in cells
  {
    name: "table/linksInCells",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Visit ",
                      styles: {},
                    },
                    {
                      type: "link",
                      href: "https://example.com",
                      content: "Example",
                    },
                  ],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Plain cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Data"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "link",
                      href: "https://example2.com",
                      content: "Link",
                    },
                  ],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: empty cells
  {
    name: "table/emptyCells",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Has content"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: [],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Also has content"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: single cell
  {
    name: "table/singleCell",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Only cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: from the advanced-tables example (large merged cells)
  {
    name: "table/advancedExample",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          columnWidths: [199, 148, 201],
          headerRows: 1,
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["This row has headers"],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "This is ",
                      styles: {},
                    },
                    {
                      type: "text",
                      text: "RED",
                      styles: { bold: true },
                    },
                  ],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "red",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Text is Blue"],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "blue",
                    textAlignment: "center",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["This spans 2 columns\nand 2 rows"],
                  props: {
                    colspan: 2,
                    rowspan: 2,
                    backgroundColor: "yellow",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Sooo many features"],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "gray",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: [],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "gray",
                    textColor: "purple",
                    textAlignment: "left",
                  },
                },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["A cell"],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "left",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Another Cell"],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "right",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Aligned center"],
                  props: {
                    colspan: 1,
                    rowspan: 1,
                    backgroundColor: "default",
                    textColor: "default",
                    textAlignment: "center",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: hard breaks in cells
  {
    name: "table/hardBreakInCell",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "text",
                      text: "Line 1\nLine 2",
                      styles: {},
                    },
                  ],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Normal cell"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  // Advanced table: mixed text alignment per cell
  {
    name: "table/cellTextAlignment",
    content: [
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  content: ["Left"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "left",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Center"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "center",
                    textColor: "default",
                  },
                },
                {
                  type: "tableCell",
                  content: ["Right"],
                  props: {
                    backgroundColor: "default",
                    colspan: 1,
                    rowspan: 1,
                    textAlignment: "right",
                    textColor: "default",
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  },
  {
    name: "link/basic",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.website.com",
            content: "Website",
          },
        ],
      },
    ],
  },
  {
    name: "link/styled",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.website.com",
            content: [
              {
                type: "text",
                text: "Web",
                styles: {
                  bold: true,
                },
              },
              {
                type: "text",
                text: "site",
                styles: {},
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "link/adjacent",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.website.com",
            content: "Website",
          },
          {
            type: "link",
            href: "https://www.website2.com",
            content: "Website2",
          },
        ],
      },
    ],
  },
  {
    name: "link/plainUrl",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.website.com",
            content: "https://www.website.com",
          },
        ],
      },
    ],
  },
  {
    name: "link/urlWithParens",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://en.wikipedia.org/wiki/Example_(disambiguation)",
            content: "Example",
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/basic",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Text1\nText2",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/multiple",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Text1\nText2\nText3",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/start",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "\nText1",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/end",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Text1\n",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/only",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "\n",
            styles: {},
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/blockEdges",
    content: [
      {
        type: "heading",
        content: "Heading\n",
      },
      {
        type: "bulletListItem",
        content: "\nBullet List Item",
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item\n",
      },
      {
        type: "checkListItem",
        content: "Check List Item\n",
      },
      {
        type: "quote",
        content: "Quote\n",
      },
      {
        type: "toggleListItem",
        content: "Toggle List Item\n",
        children: [
          {
            type: "paragraph",
            content: "Child Paragraph\n",
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/styles",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Text1\n",
            styles: {},
          },
          {
            type: "text",
            text: "Text2",
            styles: { bold: true },
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/link",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.website.com",
            content: "Link1\nLink1",
          },
        ],
      },
    ],
  },
  {
    name: "hardbreak/between-links",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "https://www.website.com",
            content: "Link1\n",
          },
          {
            type: "link",
            href: "https://www.website2.com",
            content: "Link2",
          },
        ],
      },
    ],
  },
  {
    name: "complex/misc",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "heading",
        props: {
          backgroundColor: "blue",
          textColor: "yellow",
          textAlignment: "right",
          level: 2,
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
            // id: UniqueID.options.generateID(),
            type: "paragraph",
            props: {
              backgroundColor: "red",
            },
            content: "Paragraph",
            children: [],
          },
          {
            // id: UniqueID.options.generateID(),
            type: "bulletListItem",
            props: {},
          },
        ],
      },
    ],
  },
  {
    name: "malformed/JSON",
    content: [
      {
        // id: UniqueID.options.generateID(),
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Text1\n",
            styles: {
              bold: false,
            },
          },
          {
            type: "text",
            text: "Text2\n",
            styles: {
              italic: false,
              fontSize: "",
            },
          },
          {
            type: "text",
            text: "Text3\n",
            styles: {
              italic: false,
              code: false,
            },
          },
        ],
      },
    ],
  },
  {
    name: "image",
    content: [
      {
        type: "image",
        props: {
          url: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
        },
      },
    ],
  },
  {
    name: "video",
    content: [
      {
        type: "video",
        props: {
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        },
      },
    ],
  },
  {
    name: "inlineContent/mentionWithToExternalHTML",
    content: [
      {
        type: "paragraph",
        content: [
          "I enjoy working with ",
          {
            type: "mention",
            props: {
              user: "Matthew",
            },
            content: undefined,
          },
        ],
      },
    ],
  },
  {
    name: "inlineContent/tagWithoutToExternalHTML",
    content: [
      {
        type: "paragraph",
        content: [
          "I love ",
          {
            type: "tag",
            content: "BlockNote",
          },
        ],
      },
    ],
  },
  {
    name: "custom-blocks/simpleCustomParagraph",
    content: [
      {
        type: "simpleCustomParagraph",
        content: "Simple Custom Paragraph",
      },
    ],
  },
  {
    name: "layoutBlock/basic",
    content: [
      {
        type: "callout",
        children: [
          {
            type: "paragraph",
            content: "Callout child",
          },
        ],
      },
    ],
  },
  {
    name: "layoutBlock/nested",
    content: [
      {
        type: "callout",
        props: { flavor: "warning" },
        children: [
          {
            type: "heading",
            content: "Nested heading",
          },
          {
            type: "callout",
            props: { flavor: "info" },
            children: [
              {
                type: "paragraph",
                content: "Inner callout child",
              },
            ],
          },
        ],
      },
    ],
  },
  // Partial input omits the required child. Export snapshots record this
  // raw form; full-HTML equality tests normalize it to a valid block first.
  {
    name: "layoutBlock/emptyChildren",
    content: [
      {
        type: "callout",
      },
    ],
  },
  // A titled block: inline content (the title) plus a body of two
  // paragraphs. The title is rendered once, by the block's own output; the
  // children follow it inside the frame rather than being duplicated.
  {
    name: "titledBlock/basic",
    content: [
      {
        type: "alert",
        content: "Heads up",
        children: [
          {
            type: "paragraph",
            content: "First",
          },
          {
            type: "paragraph",
            content: "Second",
          },
        ],
      },
      // Omitted children still reach the frame callback as an empty array.
      { type: "alert", content: "Title" },
    ],
  },
];
