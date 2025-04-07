import { PartialBlock } from "../../../../blocks/defaultBlocks.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export type ExportTestCase<
  // At some point we probably want to only have one HTML format that is both
  // lossless when converting to/from conversionType, content, in which case we will only need
  // "html" test cases and can remove "blockNoteHTML".
  ConversionType extends "blocknoteHTML" | "html" | "markdown" | "nodes"
> = {
  name: string;
  conversionType: ConversionType;
  content: PartialBlock<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >[];
};

export const getExportTestCases = <
  ConversionType extends "blocknoteHTML" | "html" | "markdown" | "nodes"
>(
  conversionType: ConversionType
): ExportTestCase<ConversionType>[] => [
  {
    name: "paragraph/empty",
    conversionType,
    content: [
      {
        type: "paragraph",
      },
    ],
  },
  {
    name: "paragraph/basic",
    conversionType,
    content: [
      {
        type: "paragraph",
        content: "Paragraph",
      },
    ],
  },
  {
    name: "paragraph/styled",
    conversionType,
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
    conversionType,
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
    conversionType,
    content: [
      {
        type: "paragraph",
        content: "Line 1\nLine 2",
      },
    ],
  },
  {
    name: "lists/basic",
    conversionType,
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
    ],
  },
  {
    name: "lists/nested",
    conversionType,
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
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "codeBlock/empty",
    conversionType,
    content: [
      {
        type: "codeBlock",
      },
    ],
  },
  {
    name: "codeBlock/defaultLanguage",
    conversionType,
    content: [
      {
        type: "codeBlock",
        content: "console.log('Hello, world!');",
      },
    ],
  },
  {
    name: "codeBlock/python",
    conversionType,
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
    conversionType,
    content: [
      {
        type: "codeBlock",
        props: { language: "javascript" },
        content: "const hello = 'world';\nconsole.log(hello);\n",
      },
    ],
  },
  {
    name: "pageBreak/basic",
    conversionType,
    content: [
      {
        type: "pageBreak",
      },
    ],
  },
  {
    name: "file/button",
    conversionType,
    content: [
      {
        type: "file",
      },
    ],
  },
  {
    name: "file/basic",
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
  // Because images need to fetch the download URL async, their internal HTML
  // is initially rendered without a `src` attribute, which is reflected in
  // the tests.
  {
    name: "image/button",
    conversionType,
    content: [
      {
        type: "image",
      },
    ],
  },
  {
    name: "image/basic",
    conversionType,
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
    conversionType,
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
    conversionType,
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
  {
    name: "image/noPreview",
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
  {
    name: "link/basic",
    conversionType,
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
    conversionType,
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
    conversionType,
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
    name: "hardbreak/basic",
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
    name: "hardbreak/styles",
    conversionType,
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
    conversionType,
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
    conversionType,
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
    conversionType,
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
];
