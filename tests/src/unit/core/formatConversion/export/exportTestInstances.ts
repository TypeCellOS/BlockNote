import { ExportTestCase } from "../../../shared/formatConversion/export/exportTestCase.js";
import {
  testExportBlockNoteHTML,
  testExportHTML,
  testExportMarkdown,
  testExportNodes,
} from "../../../shared/formatConversion/export/exportTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export const exportTestInstancesBlockNoteHTML: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "paragraph/empty",
      content: [
        {
          type: "paragraph",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "paragraph/basic",
      content: [
        {
          type: "paragraph",
          content: "Paragraph",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "paragraph/lineBreaks",
      content: [
        {
          type: "paragraph",
          content: "Line 1\nLine 2",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "codeBlock/empty",
      content: [
        {
          type: "codeBlock",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "codeBlock/defaultLanguage",
      content: [
        {
          type: "codeBlock",
          content: "console.log('Hello, world!');",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "codeBlock/python",
      content: [
        {
          type: "codeBlock",
          props: { language: "python" },
          content: "print('Hello, world!')",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "codeBlock/contains-newlines",
      content: [
        {
          type: "codeBlock",
          props: { language: "javascript" },
          content: "const hello = 'world';\nconsole.log(hello);\n",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  // Heading levels
  {
    testCase: {
      name: "heading/h1",
      content: [
        {
          type: "heading",
          props: { level: 1 },
          content: "Heading 1",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "heading/h2",
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: "Heading 2",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "heading/h3",
      content: [
        {
          type: "heading",
          props: { level: 3 },
          content: "Heading 3",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "heading/h4",
      content: [
        {
          type: "heading",
          props: { level: 4 },
          content: "Heading 4",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "heading/h5",
      content: [
        {
          type: "heading",
          props: { level: 5 },
          content: "Heading 5",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "heading/h6",
      content: [
        {
          type: "heading",
          props: { level: 6 },
          content: "Heading 6",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Quote / Blockquote
  {
    testCase: {
      name: "quote/basic",
      content: [
        {
          type: "quote",
          content: "This is a quote",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Audio
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "audio/button",
      content: [
        {
          type: "audio",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Individual styles
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Numbered list with custom start
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Multiple paragraphs
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Mixed block types document
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Link with inline code
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Image with caption
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Video with caption
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "divider/basic",
      content: [
        {
          type: "divider",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "pageBreak/basic",
      content: [
        {
          type: "pageBreak",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "file/button",
      content: [
        {
          type: "file",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "image/button",
      content: [
        {
          type: "image",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    // Image with only a URL — no name, no caption. Confirms markdown export
    // stays as plain `![](url)` without wrapping in a `<figure>` (the figure
    // form is only used to carry caption text through the round-trip).
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: header rows + header cols together
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: styled content in cells
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: links in cells
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: empty cells
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: single cell
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: from the advanced-tables example (large merged cells)
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: hard breaks in cells
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Advanced table: mixed text alignment per cell
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "custom-blocks/simpleCustomParagraph",
      content: [
        {
          type: "simpleCustomParagraph",
          content: "Simple Custom Paragraph",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
];

export const exportTestInstancesHTML: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportHTML,
}));

export const exportTestInstancesMarkdown: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportMarkdown,
}));

export const exportTestInstancesNodes: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportNodes,
}));
