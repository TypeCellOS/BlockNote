import type { BlockNoteEditor } from "@blocknote/core";
import type { Node } from "prosemirror-model";
import { describe, expect } from "vite-plus/test";
import type {} from "../../../../tests/vitestSetup.node-fixtures.js";
import { type Block, docToBlocks } from "../index.js";

type RoundTripAdapter = {
  name: string;
  javascriptSample: string;
  blocksToProseMirror: (editor: BlockNoteEditor, blocks: Block[]) => Node;
  roundTripDocument: (editor: BlockNoteEditor, blocks: Block[]) => Block[];
  roundTripFragment: (editor: BlockNoteEditor, blocks: Block[]) => Block[];
};

export function registerRoundTripUtilsTests(adapter: RoundTripAdapter) {
  describe(adapter.name, () => {
    for (const { group, name, blocks } of conversionCases(
      adapter.javascriptSample,
    )) {
      describe(group, () => {
        const prosemirrorTestName =
          blocks.length === 0
            ? `${name} - handles empty array`
            : `${name} - converts to and from prosemirror (doc)`;
        it(prosemirrorTestName, async ({ setupEditor }) => {
          const { editor } = await setupEditor();
          const node = adapter.blocksToProseMirror(
            editor,
            structuredClone(blocks),
          );
          expect(docToBlocks(node)).toEqual(blocks);
        });

        // No phantom paragraph: empty-fragment defaults in a mounted v14
        // editor come from the schema rather than the standalone conversions.
        it(`${name} - converts to and from yjs (doc)`, async ({
          setupEditor,
        }) => {
          const { editor } = await setupEditor();
          expect(
            adapter.roundTripDocument(editor, structuredClone(blocks)),
          ).toEqual(blocks);
        });

        it(`${name} - converts to and from yjs (fragment)`, async ({
          setupEditor,
        }) => {
          const { editor } = await setupEditor();
          expect(
            adapter.roundTripFragment(editor, structuredClone(blocks)),
          ).toEqual(blocks);
        });
      });
    }
  });
}

type ConversionCase = { group: string; name: string; blocks: Block[] };

function numberedListItem(
  id: string,
  text: string,
  children: Block[] = [],
): Block {
  // @ts-expect-error -- Preserve the omitted start prop that the converters support at runtime.
  return {
    id,
    type: "numberedListItem",
    props: {
      backgroundColor: "default",
      textColor: "default",
      textAlignment: "left",
    },
    content: [{ type: "text", text, styles: {} }],
    children,
  };
}

function conversionCases(javascriptSample: string): ConversionCase[] {
  return [
    {
      group: "Original test case",
      name: "original test case",
      blocks: [
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
      ],
    },
    { group: "Empty document", name: "empty document", blocks: [] },
    {
      group: "Simple paragraphs",
      name: "simple paragraphs",
      blocks: [
        {
          id: "1",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "First paragraph",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "2",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "center",
          },
          content: [
            {
              type: "text",
              text: "Second paragraph",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
    {
      group: "Deeply nested lists",
      name: "deeply nested lists",
      blocks: [
        {
          id: "1",
          type: "bulletListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Level 1",
              styles: {},
            },
          ],
          children: [
            {
              id: "2",
              type: "bulletListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Level 2",
                  styles: {},
                },
              ],
              children: [
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
                      text: "Level 3",
                      styles: {},
                    },
                  ],
                  children: [
                    {
                      id: "4",
                      type: "bulletListItem",
                      props: {
                        backgroundColor: "default",
                        textColor: "default",
                        textAlignment: "left",
                      },
                      content: [
                        {
                          type: "text",
                          text: "Level 4",
                          styles: {},
                        },
                      ],
                      children: [],
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
      group: "Numbered lists",
      name: "numbered lists",
      blocks: [
        numberedListItem("1", "First item"),
        numberedListItem("2", "Second item", [
          numberedListItem("3", "Nested item"),
        ]),
      ],
    },
    {
      group: "Checklists",
      name: "checklists",
      blocks: [
        {
          id: "1",
          type: "checkListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            checked: true,
          },
          content: [
            {
              type: "text",
              text: "Completed task",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "2",
          type: "checkListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            checked: false,
          },
          content: [
            {
              type: "text",
              text: "Pending task",
              styles: {},
            },
          ],
          children: [
            {
              id: "3",
              type: "checkListItem",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
                checked: false,
              },
              content: [
                {
                  type: "text",
                  text: "Subtask",
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      group: "Toggle lists",
      name: "toggle lists",
      blocks: [
        {
          id: "1",
          type: "toggleListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Toggle item",
              styles: {},
            },
          ],
          children: [
            {
              id: "2",
              type: "paragraph",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Hidden content",
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      group: "Code blocks",
      name: "code blocks",
      blocks: [
        {
          id: "1",
          type: "codeBlock",
          props: {
            language: "javascript",
          },
          content: [{ type: "text", text: javascriptSample, styles: {} }],
          children: [],
        },
        {
          id: "2",
          type: "codeBlock",
          props: {
            language: "typescript",
          },
          content: [
            { type: "text", text: "const x: number = 42;", styles: {} },
          ],
          children: [],
        },
      ],
    },
    {
      group: "Quotes",
      name: "quotes",
      blocks: [
        {
          id: "1",
          type: "quote",
          props: {
            backgroundColor: "default",
            textColor: "default",
          },
          content: [
            {
              type: "text",
              text: "This is a quote",
              styles: {
                italic: true,
              },
            },
          ],
          children: [
            {
              id: "2",
              type: "paragraph",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Nested in quote",
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      group: "Headings with different levels",
      name: "headings with different levels",
      blocks: [
        {
          id: "1",
          type: "heading",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            level: 1,
            isToggleable: false,
          },
          content: [
            {
              type: "text",
              text: "Heading 1",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "2",
          type: "heading",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            level: 2,
            isToggleable: false,
          },
          content: [
            {
              type: "text",
              text: "Heading 2",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "3",
          type: "heading",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            level: 3,
            isToggleable: true,
          },
          content: [
            {
              type: "text",
              text: "Toggle Heading 3",
              styles: {},
            },
          ],
          children: [
            {
              id: "4",
              type: "paragraph",
              props: {
                backgroundColor: "default",
                textColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Content under toggle heading",
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      group: "Inline styles and links",
      name: "inline styles and links",
      blocks: [
        {
          id: "1",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Bold ",
              styles: {
                bold: true,
              },
            },
            {
              type: "text",
              text: "italic ",
              styles: {
                italic: true,
              },
            },
            {
              type: "text",
              text: "underline ",
              styles: {
                underline: true,
              },
            },
            {
              type: "text",
              text: "strikethrough ",
              styles: {
                strike: true,
              },
            },
            {
              type: "text",
              text: "code",
              styles: {
                code: true,
              },
            },
          ],
          children: [],
        },
        {
          id: "2",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "link",
              href: "https://example.com",
              content: [
                {
                  type: "text",
                  text: "Link text",
                  styles: {},
                },
              ],
            },
          ],
          children: [],
        },
      ],
    },
    {
      group: "Tables",
      name: "tables",
      blocks: [
        {
          id: "1",
          type: "table",
          props: {
            textColor: "default",
          },
          content: {
            type: "tableContent",
            columnWidths: [100, 100, 100],
            headerRows: 1,
            headerCols: undefined,
            rows: [
              {
                cells: [
                  {
                    type: "tableCell",
                    props: {
                      backgroundColor: "default",
                      textColor: "default",
                      textAlignment: "left",
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: "text",
                        text: "Header 1",
                        styles: {
                          bold: true,
                        },
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    props: {
                      backgroundColor: "default",
                      textColor: "default",
                      textAlignment: "left",
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: "text",
                        text: "Header 2",
                        styles: {
                          bold: true,
                        },
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    props: {
                      backgroundColor: "default",
                      textColor: "default",
                      textAlignment: "left",
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: "text",
                        text: "Header 3",
                        styles: {
                          bold: true,
                        },
                      },
                    ],
                  },
                ],
              },
              {
                cells: [
                  {
                    type: "tableCell",
                    props: {
                      backgroundColor: "default",
                      textColor: "default",
                      textAlignment: "left",
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: "text",
                        text: "Cell 1",
                        styles: {},
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    props: {
                      backgroundColor: "default",
                      textColor: "default",
                      textAlignment: "left",
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: "text",
                        text: "Cell 2",
                        styles: {},
                      },
                    ],
                  },
                  {
                    type: "tableCell",
                    props: {
                      backgroundColor: "default",
                      textColor: "default",
                      textAlignment: "left",
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: "text",
                        text: "Cell 3",
                        styles: {},
                      },
                    ],
                  },
                ],
              },
            ],
          },
          children: [],
        },
      ],
    },
    {
      group: "Divider",
      name: "divider",
      blocks: [
        {
          id: "1",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "Before divider",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "2",
          type: "divider",
          props: {},
          content: undefined,
          children: [],
        },
        {
          id: "3",
          type: "paragraph",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "After divider",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
    {
      group: "Complex mixed document",
      name: "complex mixed document",
      blocks: [
        {
          id: "1",
          type: "heading",
          props: {
            backgroundColor: "blue",
            textColor: "yellow",
            textAlignment: "center",
            level: 1,
            isToggleable: false,
          },
          content: [
            {
              type: "text",
              text: "Main Title",
              styles: {
                bold: true,
              },
            },
          ],
          children: [],
        },
        {
          id: "2",
          type: "paragraph",
          props: {
            backgroundColor: "red",
            textColor: "default",
            textAlignment: "right",
          },
          content: [
            {
              type: "text",
              text: "This is a paragraph with ",
              styles: {},
            },
            {
              type: "text",
              text: "mixed",
              styles: {
                bold: true,
                italic: true,
              },
            },
            {
              type: "text",
              text: " styles and a ",
              styles: {},
            },
            {
              type: "link",
              href: "https://example.com",
              content: [
                {
                  type: "text",
                  text: "link",
                  styles: {},
                },
              ],
            },
            {
              type: "text",
              text: ".",
              styles: {},
            },
          ],
          children: [
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
                  text: "Nested list item",
                  styles: {},
                },
              ],
              children: [],
            },
          ],
        },
        {
          id: "4",
          type: "quote",
          props: {
            backgroundColor: "default",
            textColor: "default",
          },
          content: [
            {
              type: "text",
              text: "Important quote",
              styles: {
                italic: true,
              },
            },
          ],
          children: [],
        },
        {
          id: "5",
          type: "codeBlock",
          props: {
            language: "typescript",
          },
          content: [
            {
              type: "text",
              text: "const example = () => {\n  return 'code';\n};",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "6",
          type: "checkListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            checked: true,
          },
          content: [
            {
              type: "text",
              text: "Completed checklist item",
              styles: {},
            },
          ],
          children: [],
        },
        {
          id: "7",
          type: "checkListItem",
          props: {
            backgroundColor: "default",
            textColor: "default",
            textAlignment: "left",
            checked: false,
          },
          content: [
            {
              type: "text",
              text: "Pending checklist item",
              styles: {},
            },
          ],
          children: [],
        },
      ],
    },
  ];
}
