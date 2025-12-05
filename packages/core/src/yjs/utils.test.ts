import { Block, docToBlocks } from "../index.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  _blocksToProsemirrorNode,
  blocksToYDoc,
  blocksToYXmlFragment,
  yDocToBlocks,
  yXmlFragmentToBlocks,
} from "./utils.js";

describe("Test yjs utils", () => {
  const editor = BlockNoteEditor.create();

  const testConversion = (testName: string, blocks: Block[]) => {
    it(`${testName} - converts to and from prosemirror (doc)`, () => {
      const node = _blocksToProsemirrorNode(editor, blocks);
      const blockOutput = docToBlocks(node);
      expect(blockOutput).toEqual(blocks);
    });

    it(`${testName} - converts to and from yjs (doc)`, () => {
      const ydoc = blocksToYDoc(editor, blocks);
      const blockOutput = yDocToBlocks(editor, ydoc);
      expect(blockOutput).toEqual(blocks);
    });

    it(`${testName} - converts to and from yjs (fragment)`, () => {
      const doc = new Y.Doc();
      const fragment = doc.getXmlFragment("test");
      blocksToYXmlFragment(editor, blocks, fragment);

      const blockOutput = yXmlFragmentToBlocks(editor, fragment);
      expect(blockOutput).toEqual(blocks);
    });
  };

  describe("Original test case", () => {
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

    testConversion("original test case", blocks);
  });

  describe("Empty document", () => {
    it("empty document - handles empty array", () => {
      const blocks: Block[] = [];
      const node = _blocksToProsemirrorNode(editor, blocks);
      const blockOutput = docToBlocks(node);
      expect(blockOutput).toEqual([]);
    });

    it("empty document - converts to and from yjs (doc)", () => {
      const blocks: Block[] = [];
      const ydoc = blocksToYDoc(editor, blocks);
      const blockOutput = yDocToBlocks(editor, ydoc);
      expect(blockOutput).toEqual([]);
    });

    it("empty document - converts to and from yjs (fragment)", () => {
      const blocks: Block[] = [];
      const doc = new Y.Doc();
      const fragment = doc.getXmlFragment("test");
      blocksToYXmlFragment(editor, blocks, fragment);

      const blockOutput = yXmlFragmentToBlocks(editor, fragment);
      expect(blockOutput).toEqual([]);
    });
  });

  describe("Simple paragraphs", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("simple paragraphs", blocks);
  });

  describe("Deeply nested lists", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("deeply nested lists", blocks);
  });

  describe("Numbered lists", () => {
    const blocks = [
      {
        id: "1",
        type: "numberedListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "First item",
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "numberedListItem",
        props: {
          backgroundColor: "default",
          textColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Second item",
            styles: {},
          },
        ],
        children: [
          {
            id: "3",
            type: "numberedListItem",
            props: {
              backgroundColor: "default",
              textColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: "Nested item",
                styles: {},
              },
            ],
            children: [],
          },
        ],
      },
    ] as unknown as Block[];
    testConversion("numbered lists", blocks);
  });

  describe("Checklists", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("checklists", blocks);
  });

  describe("Toggle lists", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("toggle lists", blocks);
  });

  describe("Code blocks", () => {
    const blocks: Block[] = [
      {
        id: "1",
        type: "codeBlock",
        props: {
          language: "javascript",
        },
        content: [
          {
            type: "text",
            text: 'console.log("Hello, world!");',
            styles: {},
          },
        ],
        children: [],
      },
      {
        id: "2",
        type: "codeBlock",
        props: {
          language: "typescript",
        },
        content: [
          {
            type: "text",
            text: "const x: number = 42;",
            styles: {},
          },
        ],
        children: [],
      },
    ];
    testConversion("code blocks", blocks);
  });

  describe("Quotes", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("quotes", blocks);
  });

  describe("Headings with different levels", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("headings with different levels", blocks);
  });

  describe("Inline styles and links", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("inline styles and links", blocks);
  });

  describe("Tables", () => {
    const blocks = [
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
    ] as unknown as Block[];
    testConversion("tables", blocks);
  });

  describe("Divider", () => {
    const blocks = [
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
    ] as unknown as Block[];
    testConversion("divider", blocks);
  });

  describe("Complex mixed document", () => {
    const blocks: Block[] = [
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
    ];
    testConversion("complex mixed document", blocks);
  });
});
